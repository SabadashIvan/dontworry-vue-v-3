# Backend .env Configuration for Local Development

## Проблема с CORS

Для работы с мультитенантностью через subdomain нужно обновить следующие настройки в backend `.env`:

### 1. FRONTEND_URL
```env
# Было:
FRONTEND_URL=http://localhost:3000

# Должно быть:
FRONTEND_URL=http://dontworry.cloud:5173
```

### 2. SANCTUM_STATEFUL_DOMAINS
```env
# Было:
SANCTUM_STATEFUL_DOMAINS=localhost:3000,dontworry.cloud,app.dontworry.cloud

# Должно быть (с портами и wildcard для subdomain):
SANCTUM_STATEFUL_DOMAINS=dontworry.cloud:5173,app.dontworry.cloud:5173,*.dontworry.cloud:5173
```

Или более явно (если wildcard не поддерживается):
```env
SANCTUM_STATEFUL_DOMAINS=dontworry.cloud:5173,app.dontworry.cloud:5173,tenant1.dontworry.cloud:5173,tenant2.dontworry.cloud:5173
```

### 3. SESSION_DOMAIN (опционально, для работы cookies между subdomain)
```env
# Для работы cookies между subdomain в local dev:
SESSION_DOMAIN=.dontworry.cloud

# Или оставить пустым, если используете только Bearer token
SESSION_DOMAIN=
```

### 4. APP_URL
```env
# Убедитесь, что APP_URL соответствует вашему backend:
APP_URL=http://dontworry.cloud:8000
```

## Полный пример для local development:

```env
APP_URL=http://dontworry.cloud:8000
FRONTEND_URL=http://dontworry.cloud:5173

# Sanctum stateful domains (с портами)
SANCTUM_STATEFUL_DOMAINS=dontworry.cloud:5173,app.dontworry.cloud:5173,tenant1.dontworry.cloud:5173,tenant2.dontworry.cloud:5173

# Session domain для работы cookies между subdomain (если нужно)
SESSION_DOMAIN=.dontworry.cloud
SESSION_SECURE_COOKIE=false
```

## Дополнительные настройки Laravel

### config/sanctum.php
Убедитесь, что в `config/sanctum.php` правильно настроены `stateful` домены:

```php
'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS', sprintf(
    '%s%s',
    'localhost,localhost:3000,127.0.0.1,127.0.0.1:8000,::1',
    Sanctum::currentApplicationUrlWithPort()
))),
```

### config/cors.php
Проверьте настройки CORS:

```php
'paths' => ['api/*', 'sanctum/csrf-cookie'],
'allowed_origins' => [
    env('FRONTEND_URL', 'http://localhost:3000'),
    'http://dontworry.cloud:5173',
    'http://app.dontworry.cloud:5173',
    'http://*.dontworry.cloud:5173', // если поддерживается
],
'allowed_origins_patterns' => [
    '/^http:\/\/.*\.dontworry\.cloud:5173$/',
],
'supports_credentials' => true,
```

## После изменений

1. Очистите кеш конфигурации Laravel:
```bash
php artisan config:clear
php artisan cache:clear
```

2. Перезапустите backend сервер

3. Перезапустите frontend dev server
