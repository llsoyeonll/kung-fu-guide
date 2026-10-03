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
    go build -trimpath -o build\9yin-frame-scan.exe .\cmd\frame-scan

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

Первый анализатор специально не делает вывод о формате заголовка. Он показывает:

- первые байты;
- частоты байтов;
- возможные 16/32-bit length/header integers;
- длинные нулевые области.

Дополнительно добавлен автоматический frame scanner:

    build\9yin-frame-scan.exe -file captures\local\<session>\c2s.bin
    build\9yin-frame-scan.exe -file captures\local\<session>\s2c.bin

Он перебирает offset length-поля, uint16/uint32, little/big endian, варианты включения header в длину и размер header, а затем ранжирует гипотезы по полноте разбиения TCP-потока. Это диагностические гипотезы, а не утверждение о формате FxNet2.

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


## Проверка существующей MySQL

Новый код уже знает точные core-таблицы из сохранённого nineyin_schema.sql:

    accounts
    roles
    role_locations

Проверка ничего не меняет в базе. Она только делает Ping и читает information_schema.

Если NINEYIN_MYSQL_DSN уже задан:

    build\9yin-db-check.exe

Или явно:

    build\9yin-db-check.exe -dsn "nineyin:пароль@tcp(127.0.0.1:3306)/nineyin"

Успешный результат:

    OK: MySQL connection and core schema are compatible

## Самый простой способ снять трассу

1. Закрыть уже запущенный игровой сервер на 19061.
2. Не удалять старый EXE.
3. Из папки server-rebuild выполнить:

    start-capture-session.bat D:\9yin\9yin-go-server1

Скрипт сам:

- проверит, что 19061/19063/19064 не конфликтуют;
- найдёт старый build\9yin-game-native-menu.exe;
- прочитает NINEYIN_MYSQL_DSN из старого mysql.env, если он есть;
- запустит старый сервер на 19063;
- запустит его временный GM endpoint на 19064;
- запустит прозрачный proxy на 19061;
- начнёт запись capture.

Он намеренно не завершает чужие процессы автоматически.

После запуска зайти клиентом в аккаунт, выбрать персонажа и дождаться полного входа в мир.

После этого закрыть proxy через Ctrl+C.

## Анализ захвата

Для созданной папки session:

    analyze-capture.bat captures\local\<session>

Результат:

    captures\local\<session>\analysis.txt

В нём будут первичный hex-анализ и лучшие гипотезы frame length/header отдельно для c2s и s2c.

## Упаковка захвата

После анализа:

    pack-capture.bat captures\local\<session>

Будет создан файл:

    <session>-protocol-capture.zip

Внутри только данные, нужные для восстановления протокола:

    c2s.bin
    s2c.bin
    chunks.jsonl
    meta.json
    analysis.txt

Именно этот ZIP нужен для следующего этапа decoder/encoder.


## Если появляется ошибка fxupdate

Для локального протокольного теста fxupdate не нужен.

У тебя уже был зафиксирован рабочий прямой запуск клиента:

    fxgame.exe 105466859 0 127.0.0.1 19061 AOWPR-AOWPR 127.0.0.1 4000 0 0

Поэтому в v0.1.1 добавлены два варианта запуска без updater:

Прямой запуск клиента:

    launch-fxgame-direct.bat "D:\AOOOW\BFAGE\AOW"

И рекомендуемый вариант — сервер + proxy + клиент одной командой:

    start-capture-and-client.bat "D:\9yin\9yin-go-server1" "D:\AOOOW\BFAGE\AOW"

Этот сценарий:

1. запускает MySQL, если 3306 свободен;
2. запускает server-list на 4000;
3. запускает старый эталонный сервер на 19063;
4. запускает capture proxy на 19061;
5. ждёт, пока proxy начнёт слушать;
6. запускает bin\fxgame.exe напрямую;
7. fxupdate.exe вообще не запускается.

По умолчанию используется login key 105466859 из сохранённой рабочей командной строки.
При необходимости его можно заменить третьим аргументом:

    start-capture-and-client.bat "D:\9yin\9yin-go-server1" "D:\AOOOW\BFAGE\AOW" НОВЫЙ_KEY
