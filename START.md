# 🚀 Инструкция по запуску проекта с дампом

## 📋 Предварительные требования

- Docker и Docker Compose установлены
- Файл `dumps/dump.sql` существует

## 🎯 Полный запуск с нуля

### 1. Остановить и очистить старые контейнеры

```powershell
cd "c:\Users\User\Desktop\projects\Meract\meract-rest-api"

# Остановить контейнеры и удалить volumes
docker compose down -v

# Убедиться что volume удалён
docker volume ls | Select-String "postgres_data"
docker volume rm meract-rest-api_postgres_data -f 2>$null
```

### 2. Запустить проект

```powershell
# Запуск с пересборкой образа
docker compose up -d --build

# ИЛИ без пересборки (быстрее, если ничего не менялось в Dockerfile)
docker compose up -d
```

### 3. Следить за логами

```powershell
# Логи приложения
docker compose logs -f app

# Логи базы данных
docker compose logs -f db

# Все логи вместе
docker compose logs -f
```

## ✅ Что должно произойти

### База данных (db):

1. PostgreSQL запускается (5-10 секунд)
2. Автоматически выполняется `dump.sql` из `/docker-entrypoint-initdb.d/`
3. Создаются все таблицы, индексы, данные из дампа
4. Healthcheck становится зелёным

**Ожидаемые логи:**

```
db-1   | PostgreSQL Database directory appears to contain a database; Skipping initialization
db-1   | database system is ready to accept connections
```

### Приложение (app):

1. Ждёт 20 секунд (для полной инициализации БД)
2. Генерирует Prisma Client: `npx prisma generate`
3. Запускает NestJS в watch-режиме: `nest start --watch`
4. Prisma подключается к БД (с retry механизмом)

**Ожидаемые логи:**

```
app-1  | [PrismaService] 🔌 Connecting to database...
app-1  | [PrismaService] ✅ Database connected successfully
app-1  | [PrismaService] Connected as: [{"current_user":"postgres",...}]
app-1  | [Nest] Application successfully started
```

## 🔍 Проверка работы

### Проверить что БД запущена

```powershell
docker compose exec db pg_isready -U postgres
# Должно вывести: /var/run/postgresql:5432 - accepting connections
```

### Проверить данные в БД

```powershell
# Подключиться к БД
docker compose exec db psql -U postgres -d Meract

# Внутри psql выполнить:
\dt  # Список таблиц
SELECT COUNT(*) FROM "User";  # Количество пользователей
SELECT COUNT(*) FROM "Act";   # Количество актов
\q   # Выйти
```

### Проверить API

```powershell
# Открыть браузер
start http://localhost:3000/docs
# Должен открыться Swagger UI
```

## 🔧 Частые проблемы и решения

### Проблема 1: "Authentication failed (P1000)"

**Причина:** Дамп загружается слишком долго, приложение подключается раньше времени.

**Решение:**

```powershell
# Увеличить задержку в docker-compose.yml (строка 36):
# command: sh -c "sleep 30 && npx prisma generate && nest start --watch"

docker compose restart app
```

### Проблема 2: "Duplicate key value violates unique constraint"

**Причина:** Volume сохранил старые данные, дамп пытается вставить дубликаты.

**Решение:**

```powershell
docker compose down -v
docker volume rm meract-rest-api_postgres_data -f
docker compose up -d
```

### Проблема 3: "Cannot find module '@prisma/client'"

**Причина:** Prisma Client не сгенерирован.

**Решение:**

```powershell
docker compose exec app npx prisma generate
docker compose restart app
```

### Проблема 4: Приложение перезапускается каждые 60 секунд

**Причина:** Ошибка в коде, TypeScript не компилируется.

**Решение:**

```powershell
# Проверить логи на ошибки компиляции
docker compose logs app | Select-String "error"

# Перезапустить с чистой сборкой
docker compose down
docker compose up -d --build
```

## 🔄 Быстрый перезапуск (без потери данных)

```powershell
# Перезапустить только приложение
docker compose restart app

# Перезапустить всё
docker compose restart

# Остановить и запустить заново (без удаления volumes)
docker compose down
docker compose up -d
```

## 🗑️ Полная очистка и переустановка

```powershell
# Остановить всё
docker compose down -v

# Удалить все связанные образы
docker rmi meract-rest-api-app -f

# Очистить Docker кэш (опционально)
docker system prune -a --volumes -f

# Запустить заново
docker compose up -d --build
```

## 📊 Мониторинг

### Проверить статус контейнеров

```powershell
docker compose ps
```

### Использование ресурсов

```powershell
docker stats
```

### Размер базы данных

```powershell
docker compose exec db psql -U postgres -d Meract -c "SELECT pg_size_pretty(pg_database_size('Meract'));"
```

## 🌐 Доступ к сервисам

- **API:** http://localhost:3000
- **Swagger UI:** http://localhost:3000/docs
- **PostgreSQL:** localhost:5433
  - User: `postgres`
  - Password: `postgres`
  - Database: `Meract`

## 💡 Подсказки

### Подключиться к контейнеру app

```powershell
docker compose exec app sh
```

### Выполнить команду в контейнере

```powershell
docker compose exec app yarn build
docker compose exec app npx prisma studio  # Открыть Prisma Studio
```

### Создать новый дамп

```powershell
docker compose exec db pg_dump -U postgres Meract > dumps/new_dump_$(Get-Date -Format 'yyyy-MM-dd').sql
```

## 🎉 Готово!

После успешного запуска вы увидите:

- ✅ База данных работает на порту 5433
- ✅ API доступен на http://localhost:3000
- ✅ Swagger UI доступен на http://localhost:3000/docs
- ✅ Все данные из дампа загружены
