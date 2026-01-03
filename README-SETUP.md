# Настройка локальной разработки

## 1. Настройка hosts файла

Добавьте в `/etc/hosts` (macOS/Linux) или `C:\Windows\System32\drivers\etc\hosts` (Windows):

```
127.0.0.1 dontworry.cloud
127.0.0.1 app.dontworry.cloud
127.0.0.1 tenant1.dontworry.cloud
127.0.0.1 tenant2.dontworry.cloud
```

## 2. Настройка окружения

Скопируйте `.env.local.example` в `.env.local`:

```bash
cp .env.local.example .env.local
```

Или создайте `.env.local` вручную с настройками для локальной разработки.

## 3. Запуск проекта

### Frontend (Vue 3 SPA)

```bash
npm run dev
```

Приложение будет доступно по адресам:
- `http://dontworry.cloud:5173` - центральный домен
- `http://app.dontworry.cloud:5173` - центральный домен (альтернативный)
- `http://tenant1.dontworry.cloud:5173` - tenant workspace
- `http://tenant2.dontworry.cloud:5173` - tenant workspace

### Backend (Laravel)

Убедитесь, что backend запущен на порту 8000 и настроен для работы с доменами:
- `http://dontworry.cloud:8000`
- `http://app.dontworry.cloud:8000`
- `http://tenant1.dontworry.cloud:8000`
- `http://tenant2.dontworry.cloud:8000`

## 4. Проверка работы

1. Откройте `http://dontworry.cloud:5173` или `http://app.dontworry.cloud:5173`
2. Зарегистрируйтесь или войдите
3. Создайте или выберите workspace (tenant)
4. После выбора tenant произойдет redirect на `http://tenant1.dontworry.cloud:5173` (или другой subdomain)

## Настройка для Production

Для production используйте `.env.production.example` как шаблон:

1. Скопируйте `.env.production.example` в `.env.production`
2. Обновите значения:
   - `VITE_CENTRAL_DOMAINS` - ваши production домены
   - `VITE_API_BASE_URL` - URL вашего production API
   - `VITE_API_SCHEME=https`

При сборке для production:
```bash
npm run build
```

Vite автоматически использует `.env.production` при сборке.
