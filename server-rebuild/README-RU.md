# Восстановление сервера 9Yin — этап 1

Этот каталог находится в отдельной ветке nineyin-server-rebuild.
Ветка main и сайт не изменяются.

## Уже восстановлено

Точный старый Go module metadata найден в сохранённом дампе:

    module github.com/local/9yin-go-server
    go 1.23.0
    toolchain go1.23.2

Старые зависимости:

    github.com/DATA-DOG/go-sqlmock v1.5.2
    github.com/go-sql-driver/mysql v1.9.3
    golang.org/x/text v0.28.0
    filippo.io/edwards25519 v1.1.0
    github.com/Hiroko103/go-quicklz ...

## Цель первого этапа

Не угадывать FxNet2 wire format, а снять точный обмен между клиентом и уже работающим старым сервером.

Схема:

    fxgame.exe
        |
        | 127.0.0.1:19061
        v
    9yin-protocol-proxy.exe
        |
        | 127.0.0.1:19063
        v
    старый 9yin-game-native-menu.exe

Прокси прозрачно пересылает каждый байт и параллельно создаёт:

    captures/local/<session>/c2s.bin
    captures/local/<session>/s2c.bin
    captures/local/<session>/chunks.jsonl
    captures/local/<session>/meta.json

c2s.bin — точный TCP-поток клиент -> сервер.
s2c.bin — точный TCP-поток сервер -> клиент.

chunks.jsonl сохраняет границы фактических socket Read, время и hex.
Границы Read НЕ считаются границами протокольных пакетов — они используются только как дополнительная временная подсказка.

## Известная автоматическая последовательность после входа в main stage

Клиент автоматически отправляет:

    1016 / 140   GUILDBUILDING / REQUEST_PRECREATE_NPC
    758  / 10    LEITAI / ONCONTINUE
    949  / 3     MASSES_FIGHT / resume
    858  / 6     NEW_TERRITORY / state query
    958           GET_SERVER_ID
    690           GET_GAME_STEP
    959           GET_ACCOUNT

Это штатные запросы входа в мир.

## 298

Подтверждённая клиентская форма:

    CustomSend(298, 1, nx_object(npc))

Поэтому третий аргумент нельзя интерпретировать как обычный integer.
До восстановления FxNet2 value codec он остаётся opaque serialized object reference.

## 82 и 409

Они намеренно остаются unresolved.
Сервер не должен придумывать для них формат или молча проглатывать их.

## Сборка

Нужен Go 1.23.x.

Из папки server-rebuild запустить:

    build-tools.bat

Он выполняет:

    go test ./...
    go build -trimpath -o build\9yin-protocol-proxy.exe .\cmd\protocol-probe
    go build -trimpath -o build\9yin-capture-inspect.exe .\cmd\capture-inspect

## Снятие новой трассы

Старый игровой сервер нужно временно запустить не на 19061, а, например, на 19063.

Пример только для параметра listen:

    9yin-game-native-menu.exe -listen 127.0.0.1:19063 [остальные старые параметры без изменений]

Потом запустить:

    build\9yin-protocol-proxy.exe -listen 127.0.0.1:19061 -upstream 127.0.0.1:19063 -captures captures\local

Клиент по-прежнему подключается к 127.0.0.1:19061.

## Анализ

После входа персонажа:

    build\9yin-capture-inspect.exe -file captures\local\<session>\c2s.bin
    build\9yin-capture-inspect.exe -file captures\local\<session>\s2c.bin

Анализатор пока специально не делает вывод о формате заголовка. Он показывает:

- первые байты;
- частоты байтов;
- возможные 16/32-bit length/header integers;
- длинные нулевые области.

## Следующий этап

По реальной паре c2s.bin / s2c.bin:

1. находим границы FxNet2 frames;
2. устанавливаем endian и размер поля length;
3. выделяем opcode;
4. сопоставляем SERVER_CUSTOM и клиентский CustomSend;
5. восстанавливаем typed value codec;
6. пишем decoder/encoder;
7. воспроизводим login -> roles -> PlayerEntry;
8. подключаем существующую MySQL nineyin;
9. постепенно заменяем старый EXE собственным сервером.

Старый сервер до завершения этого этапа не удалять и не заменять.
