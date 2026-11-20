# HST Unlock — интерактивный опрос для планшета

Рабочее full-stack веб-приложение без внешних runtime-зависимостей: личный кабинет HST, локальная авторизация, дашборд, журналы контактов и два планшетных сценария — LAS и LAU.

## Быстрый запуск

```bash
npm start
```

Откройте `http://127.0.0.1:3000`.

Демо-доступ:

- логин: `hst01`
- пароль: `Demo-HST-2026!`

Пароль для новой базы можно задать при первом запуске:

```bash
DEMO_PASSWORD='change-me-now' npm start
```

## Что реализовано

- защищённая cookie-сессия (HttpOnly, SameSite=Strict, Secure в production), CSRF-токен, rate limiting логина, scrypt для пароля, CSP и security headers;
- роли и scoped-данные HST; атомарное хранение в `data/app.json` с правами `0600`;
- dashboard: завершённые контакты, контакты за сегодня, LAS/LAU, конверсия, средняя длительность, 7-дневная динамика, журнал;
- LAS: выбор бренда и вкуса → проблема → проверяемое объяснение → рекомендация TEREA → завершение с анимированным замком;
- LAU: текущий вкус → оценка опыта → приоритет → завершение;
- обязательное подтверждение 21+, предупреждение о никотине и отсутствие медицинских обещаний;
- touch-targets 48px+, responsive tablet layout, keyboard navigation, reduced-motion mode, high-contrast focus states;
- отсутствие внешних трекеров и сбор только ответов опроса, без имени/телефона потребителя.

## Данные и production

По умолчанию данные хранятся локально. Для пилота это удобно, но для production рекомендуется PostgreSQL, Microsoft Entra ID или корпоративный IdP, централизованный аудит, TLS reverse proxy, secret manager и утверждённая политика retention. `DATA_FILE` позволяет вынести файл данных на зашифрованный volume.

## Проверка

```bash
npm run check
npm test
```

## Проверяемые источники контента

Актуальность продуктового каталога нужно подтверждать перед каждым релизом.

- IQOS Uzbekistan, каталог TEREA: https://uz.iqos.com/ru/shop/product/53/195
- IQOS Uzbekistan, технология нагревания: https://uz.iqos.com/ru/discover/technology
- IQOS Uzbekistan, предупреждение 21+ и никотин: https://uz.iqos.com/ru/discover/terea
- Tashkent Tobacco, представленные бренды: https://ttobacco.uz/index.php/produktsiya
- Uzbekistan minimum legal sales age: https://www.tobaccocontrollaws.org/legislation/uzbekistan/sales-restrictions/minimum-legal-sales-age

IQOS и TEREA не без риска и содержат никотин, вызывающий зависимость. Лучший способ снизить риски, связанные с табаком и никотином, — полностью отказаться от их употребления. Приложение предназначено только для совершеннолетних пользователей 21+, которые иначе продолжили бы курить или использовать никотинсодержащую продукцию.
