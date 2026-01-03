# Отладка конфигурации мультитенантности

## Проверка текущей конфигурации

### 1. Проверьте переменные окружения

Откройте консоль браузера (F12) на странице `http://dontworry.cloud:5173` и выполните:

```javascript
// Проверка переменных окружения
console.log('VITE_CENTRAL_DOMAINS:', import.meta.env.VITE_CENTRAL_DOMAINS);
console.log('VITE_CENTRAL_HOST:', import.meta.env.VITE_CENTRAL_HOST);
console.log('VITE_API_SCHEME:', import.meta.env.VITE_API_SCHEME);
console.log('VITE_API_PORT:', import.meta.env.VITE_API_PORT);
console.log('Current hostname:', window.location.hostname);
```

### 2. Проверка определения режима

В консоли браузера:

```javascript
// Импортируйте функции (если доступны через window)
// Или проверьте через Vue DevTools
```

### 3. Проверка API URL

В консоли браузера проверьте, какой URL используется для API:

```javascript
// Для central домена (dontworry.cloud или app.dontworry.cloud)
// Должен быть: http://app.dontworry.cloud:8000/v1 (или http://dontworry.cloud:8000/v1)

// Для tenant домена (tenant1.dontworry.cloud)
// Должен быть: http://tenant1.dontworry.cloud:8000/v1
```

## Частые проблемы

### Проблема: CORS ошибка

**Решение:**
1. Убедитесь, что backend `.env` содержит:
   ```env
   FRONTEND_URL=http://dontworry.cloud:5173
   SANCTUM_STATEFUL_DOMAINS=dontworry.cloud:5173,app.dontworry.cloud:5173,tenant1.dontworry.cloud:5173,tenant2.dontworry.cloud:5173
   ```

2. Очистите кеш Laravel:
   ```bash
   php artisan config:clear
   php artisan cache:clear
   ```

3. Перезапустите backend

### Проблема: Vite показывает только localhost

**Это нормально!** Vite всегда показывает localhost в выводе, но сервер доступен по всем доменам.

Проверьте, что можете открыть:
- `http://dontworry.cloud:5173`
- `http://app.dontworry.cloud:5173`
- `http://tenant1.dontworry.cloud:5173`

### Проблема: Неправильное определение central/tenant режима

Проверьте `.env.local` или `.env`:
```env
VITE_CENTRAL_DOMAINS=dontworry.cloud,app.dontworry.cloud
```

Убедитесь, что домены указаны без портов и без `http://`.

### Проблема: API запросы идут на неправильный URL

Проверьте в Network tab браузера:
- Central запросы должны идти на `http://app.dontworry.cloud:8000/v1` (или `http://dontworry.cloud:8000/v1`)
- Tenant запросы должны идти на `http://tenant1.dontworry.cloud:8000/v1`

## Быстрая проверка

1. Откройте `http://dontworry.cloud:5173` - должен открыться login/register
2. Откройте `http://tenant1.dontworry.cloud:5173` - должен быть redirect на `/tenants/select` или показать ошибку (если не авторизован)
3. Проверьте Network tab - все запросы должны идти на правильные домены с портом 8000
