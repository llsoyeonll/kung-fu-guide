from pathlib import Path
import re

path = Path('partnership.html')
html = path.read_text(encoding='utf-8')

team_css = '''
      /* Mystic Scroll Team */
      .team-profile {
        display: grid;
        grid-template-columns: minmax(300px, 500px) 1fr;
        min-height: 430px;
        border: 1px solid rgba(202, 164, 78, 0.42);
        background: rgba(5, 22, 34, 0.72);
        overflow: hidden;
      }
      .team-profile-art {
        display: block;
        min-height: 430px;
        background: url('assets/mystic-scroll-team.webp?v=1') center/contain no-repeat;
        background-color: rgba(2, 12, 20, 0.55);
      }
      .team-profile-copy {
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding: clamp(28px, 5vw, 58px);
      }
      .team-role {
        margin: 0 0 10px;
        color: #72d7d0;
        font-size: .82rem;
        font-weight: 800;
        letter-spacing: .1em;
        text-transform: uppercase;
      }
      .team-profile-copy h2 {
        margin: 0 0 24px;
        color: #f5dfaa;
        font-size: clamp(2.7rem, 6vw, 5rem);
        line-height: .96;
      }
      .team-facts {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
        margin: 0 0 24px;
      }
      .team-facts div {
        padding: 15px 16px;
        border: 1px solid rgba(91, 184, 184, 0.34);
        background: rgba(3, 25, 37, 0.44);
      }
      .team-facts dt {
        margin-bottom: 7px;
        color: rgba(207, 218, 225, .62);
        font-size: .72rem;
        font-weight: 800;
        letter-spacing: .08em;
        text-transform: uppercase;
      }
      .team-facts dd {
        margin: 0;
        color: #f5dfaa;
        font-size: 1.04rem;
        font-weight: 800;
      }
      .team-description p {
        margin: 0 0 14px;
        color: rgba(232, 239, 243, .82);
        line-height: 1.65;
      }
      .team-description p:first-child {
        color: #72d7d0;
        font-weight: 700;
      }
      @media (max-width: 900px) {
        .team-profile { grid-template-columns: 1fr; }
        .team-profile-art { min-height: min(78vw, 520px); }
      }
      @media (max-width: 620px) {
        .team-facts { grid-template-columns: 1fr; }
      }
'''

if '/* Mystic Scroll Team */' not in html:
    html = html.replace('    </style>', team_css + '    </style>', 1)

team_section = '''        <section class="team-profile" aria-labelledby="team-name">
          <span class="team-profile-art" role="img" aria-label="Mystic Scroll Team"></span>

          <div class="team-profile-copy">
            <p class="team-role"><span aria-hidden="true">✦</span> Команда проекта</p>
            <h2 id="team-name">Mystic Scroll Team</h2>

            <dl class="team-facts">
              <div>
                <dt>Направление</dt>
                <dd>Руководство и игровые материалы</dd>
              </div>
              <div>
                <dt>Поддержка</dt>
                <dd>Тайвань и Пиратка CN</dd>
              </div>
            </dl>

            <div class="team-description">
              <p>Mystic Scroll Team — команда, развивающая руководство по 9 Инь и связанные материалы для игроков. Мы собираем полезные гайды, справочные разделы, таблицы, переводы, партнерские сервисы и актуальную информацию по Тайвани и Пиратке CN.</p>
              <p>Наша цель — сделать единое удобное пространство для новичков и опытных игроков: с навигацией по игровым системам, полезными материалами, игровым контентом, сообществами и дополнительными сервисами.</p>
            </div>
          </div>
        </section>'''

pattern = re.compile(r'        <section class="admin-profile".*?</section>', re.S)
html, count = pattern.subn(team_section, html, count=1)
if count != 1:
    raise SystemExit(f'Expected one admin-profile block, replaced {count}')

path.write_text(html, encoding='utf-8')
