# 🚀 Быстрый старт Meract REST API

## ⚡ Автоматический запуск (РЕКОМЕНДУЕТСЯ)

### 🐧 Linux / macOS

```bash
cd /path/to/meract-rest-api

# Сделать скрипт исполняемым (только первый раз)
chmod +x start.sh

# Запустить
./start.sh
```

**❗ Важно для Linux:** Если у вас установлен локальный PostgreSQL, скрипт предложит остановить его, чтобы избежать конфликта портов.

### 🪟 Windows - PowerShell (рекомендуется)

```powershell
cd "c:\Users\User\Desktop\projects\Meract\meract-rest-api"
.\start.ps1
```

### 🪟 Windows - Batch

```cmd
cd c:\Users\User\Desktop\projects\Meract\meract-rest-api
start.bat
```

---

## 🛠️ Ручной запуск

### 🐧 Linux

```bash
# Остановить локальный PostgreSQL (если установлен)
sudo systemctl stop postgresql

# Очистить старые контейнеры
cd /path/to/meract-rest-api
docker compose down -v
docker volume rm meract-rest-api_postgres_data -f

# Запустить проект
docker compose up -d --build

# Проверить статус
docker compose ps
docker compose logs -f app
```

### 🪟 Windows

```powershell
cd "c:\Users\User\Desktop\projects\Meract\meract-rest-api"
docker compose down -v
docker volume rm meract-rest-api_postgres_data -f
docker compose up -d --build
docker compose ps
docker compose logs -f app
```

---

## 📝 Что происходит при запуске

1. **PostgreSQL** (контейнер `db`):
   - Запускается PostgreSQL 15
   - Автоматически выполняется `dumps/dump.sql`
   - Создаёт все таблицы и загружает данные
   - Время: ~10-15 секунд

2. **Приложение** (контейнер `app`):
   - Ждёт 20 секунд (пока БД инициализируется)
   - Генерирует Prisma Client
   - Запускает NestJS в watch-режиме
   - Подключается к БД (с автоматическим retry)

---

## ✅ Проверка работы

### Открыть Swagger UI

**Linux:**

```bash
# Автоматически откроется в браузере при использовании start.sh
# Или вручную:
xdg-open http://localhost:3000/docs
```

**Windows:**

```powershell
start http://localhost:3000/docs
```

### Проверить базу данных

```bash
docker compose exec db psql -U postgres -d Meract -c "\dt"
```

### Проверить количество данных

```bash
docker compose exec db psql -U postgres -d Meract -c "SELECT
  (SELECT COUNT(*) FROM \"User\") as users,
  (SELECT COUNT(*) FROM \"Act\") as acts,
  (SELECT COUNT(*) FROM \"Music\") as music;"
```

---

## 🔧 Управление

### Остановить проект

```bash
docker compose down
```

### Перезапустить приложение (без потери данных)

```bash
docker compose restart app
```

### Перезапустить всё

```bash
docker compose restart
```

### Посмотреть логи

```bash
# Все логи
docker compose logs -f

# Только приложение
docker compose logs -f app

# Только база данных
docker compose logs -f db
```

```powershell
docker compose restart
```

### Посмотреть логи

```powershell
# Все логи
docker compose logs -f

# Только приложение
docker compose logs -f app

# Только база данных
docker compose logs -f db
```

---

## 🌐 Доступ к сервисам

| Сервис         | URL/Адрес                  |
| -------------- | -------------------------- |
| **API**        | http://localhost:3000      |
| **Swagger UI** | http://localhost:3000/docs |
| **PostgreSQL** | localhost:5433             |

### Подключение к БД:

- **Host:** localhost
- **Port:** 5433
- **User:** postgres
- **Password:** postgres
- **Database:** Meract

---

## ❗ Решение проблем

### 🐧 Конфликт с локальным PostgreSQL (ТОЛЬКО LINUX)

**Симптомы:** Ошибка "port is already allocated" или "P1000: Authentication failed"

**Причина:** Локальный PostgreSQL занимает порт 5432

**Решение:**

```bash
# Проверить статус локального PostgreSQL
sudo systemctl status postgresql

# Остановить локальный PostgreSQL
sudo systemctl stop postgresql

# Отключить автозапуск (опционально)
sudo systemctl disable postgresql

# Проверить, что порт свободен
sudo ss -tuln | grep 5432

# Перезапустить контейнеры
docker compose restart
```

### Ошибка "P1000: Authentication failed"

```bash
# Полная переустановка
docker compose down -v
docker volume rm meract-rest-api_postgres_data -f
docker compose up -d --build
```

### Приложение не запускается

**Linux:**

```bash
# Проверить логи
docker compose logs app | grep -i error

# Перезапустить с пересборкой
docker compose down
docker compose up -d --build
```

**Windows:**

```powershell
# Проверить логи
docker compose logs app | Select-String "error"

# Перезапустить с пересборкой
docker compose down
docker compose up -d --build
```

### База данных не готова

```bash
# Увеличить задержку в docker-compose.yml (строка ~36)
# command: sh -c "sleep 30 && npx prisma generate && nest start --watch"

docker compose restart app
```

---

## 📚 Дополнительная документация

- **[LINUX_START.md](LINUX_START.md)** - 🐧 Подробная инструкция для Linux (конфликты PostgreSQL, диагностика)
- **[START.md](START.md)** - Подробная инструкция по запуску для Windows
- **[P1000_FIX.md](P1000_FIX.md)** - Решение проблем с аутентификацией БД
- **[README.md](README.md)** - Основная документация проекта

---

## 🎉 Готово!

После успешного запуска:

- ✅ API работает на http://localhost:3000
- ✅ Swagger UI доступен на http://localhost:3000/docs
- ✅ База данных с данными из дампа готова
- ✅ Приложение в watch-режиме (автоматически перезагружается при изменениях)

### 🐧 Для Linux пользователей:

- ✅ Локальный PostgreSQL не конфликтует с Docker
- ✅ Используйте `./start.sh` для автоматического запуска
- ✅ Подробная диагностика в [LINUX_START.md](LINUX_START.md)

---

## 🎉 Готово!

После успешного запуска:

- ✅ API работает на http://localhost:3000
- ✅ Swagger UI доступен на http://localhost:3000/docs
- ✅ База данных с данными из дампа готова
- ✅ Приложение в watch-режиме (автоматически перезагружается при изменениях)
