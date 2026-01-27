# 🐧 Запуск на Linux

## ⚠️ Важно для Linux: Конфликт с локальным PostgreSQL

Если у вас установлен PostgreSQL локально, он может занимать порт 5432 и конфликтовать с Docker контейнером.

### Проверить статус локального PostgreSQL:

```bash
sudo systemctl status postgresql
```

### Остановить локальный PostgreSQL (если нужно):

```bash
sudo systemctl stop postgresql

# Или отключить автозапуск:
sudo systemctl disable postgresql
```

### Проверить, что порт 5432 свободен:

```bash
sudo netstat -tuln | grep 5432
# или
sudo ss -tuln | grep 5432
```

Если видите процесс на порту 5432 - это локальный PostgreSQL, его нужно остановить.

---

## 🚀 Автоматический запуск (РЕКОМЕНДУЕТСЯ)

```bash
cd /path/to/meract-rest-api

# Сделать скрипт исполняемым (только первый раз)
chmod +x start.sh

# Запустить
./start.sh
```

Скрипт автоматически:

- Проверит конфликты с локальным PostgreSQL
- Остановит его при необходимости (спросит разрешение)
- Очистит старые контейнеры
- Запустит проект
- Проверит статус
- Предложит открыть Swagger

---

## 🛠️ Ручной запуск

### 1. Остановить локальный PostgreSQL (если установлен)

```bash
sudo systemctl stop postgresql
```

### 2. Очистить старые контейнеры

```bash
cd /path/to/meract-rest-api
docker compose down -v
docker volume rm meract-rest-api_postgres_data -f
```

### 3. Запустить проект

```bash
docker compose up -d --build
```

### 4. Проверить статус

```bash
docker compose ps
docker compose logs -f app
```

---

## ✅ Проверка DATABASE_URL

Убедитесь, что в `docker-compose.yml` правильный `DATABASE_URL`:

```yaml
environment:
  - DATABASE_URL=postgresql://postgres:postgres@db:5432/Meract?schema=public
```

**Важно:**

- Внутри Docker используется `@db:5432` (hostname контейнера)
- Снаружи (с хоста) используется `@localhost:5433` (mapped port)

---

## 🔍 Диагностика подключения

### Проверить, что контейнер БД работает

```bash
docker compose exec db pg_isready -U postgres
# Должно вывести: /var/run/postgresql:5432 - accepting connections
```

### Подключиться к БД из контейнера

```bash
docker compose exec db psql -U postgres -d Meract
```

### Подключиться к БД с хоста (порт 5433)

```bash
psql -h localhost -p 5433 -U postgres -d Meract
# Пароль: postgres
```

### Проверить таблицы

```bash
docker compose exec db psql -U postgres -d Meract -c "\dt"
```

### Проверить количество данных

```bash
docker compose exec db psql -U postgres -d Meract -c "
SELECT
  (SELECT COUNT(*) FROM \"User\") as users,
  (SELECT COUNT(*) FROM \"Act\") as acts,
  (SELECT COUNT(*) FROM \"Music\") as music;
"
```

---

## 🔧 Решение проблемы P1000 на Linux

### Проблема: "Authentication failed against database server"

**Причина 1:** Локальный PostgreSQL конфликтует

```bash
# Остановить локальный PostgreSQL
sudo systemctl stop postgresql

# Перезапустить контейнеры
docker compose restart
```

**Причина 2:** Контейнер БД еще не готов

```bash
# Увеличить задержку в docker-compose.yml
# command: sh -c "sleep 30 && npx prisma generate && nest start --watch"

docker compose restart app
```

**Причина 3:** Старые данные в volume

```bash
# Полная очистка
docker compose down -v
docker volume rm meract-rest-api_postgres_data -f
docker volume prune -f

# Запустить заново
docker compose up -d --build
```

**Причина 4:** Проблемы с правами Docker

```bash
# Добавить текущего пользователя в группу docker (если еще не добавлен)
sudo usermod -aG docker $USER

# Перелогиниться или выполнить
newgrp docker

# Проверить
docker ps
```

---

## 📊 Мониторинг

### Логи в реальном времени

```bash
# Все логи
docker compose logs -f

# Только приложение
docker compose logs -f app

# Только БД
docker compose logs -f db

# Последние 50 строк
docker compose logs --tail 50 app
```

### Статус контейнеров

```bash
docker compose ps
```

### Использование ресурсов

```bash
docker stats
```

### Размер базы данных

```bash
docker compose exec db psql -U postgres -d Meract -c "
SELECT pg_size_pretty(pg_database_size('Meract'));
"
```

---

## 🗑️ Полная очистка

```bash
# Остановить всё
docker compose down -v

# Удалить образы
docker rmi meract-rest-api-app -f

# Очистить неиспользуемые volumes
docker volume prune -f

# Очистить систему (опционально)
docker system prune -a --volumes -f

# Запустить заново
docker compose up -d --build
```

---

## 🌐 Доступ к сервисам

| Сервис                         | URL/Адрес                  |
| ------------------------------ | -------------------------- |
| **API**                        | http://localhost:3000      |
| **Swagger UI**                 | http://localhost:3000/docs |
| **PostgreSQL (из контейнера)** | db:5432                    |
| **PostgreSQL (с хоста)**       | localhost:5433             |

### Подключение к БД с хоста:

```bash
psql -h localhost -p 5433 -U postgres -d Meract
```

Или через DBeaver/pgAdmin:

- **Host:** localhost
- **Port:** 5433
- **User:** postgres
- **Password:** postgres
- **Database:** Meract

---

## 💡 Полезные команды Linux

### Проверить, какой процесс использует порт

```bash
sudo lsof -i :5432
sudo lsof -i :5433
sudo lsof -i :3000
```

### Убить процесс на порту

```bash
sudo kill -9 $(sudo lsof -t -i:5432)
```

### Проверить Docker версию

```bash
docker --version
docker compose version
```

### Перезапуск Docker (если нужно)

```bash
sudo systemctl restart docker
```

---

## 🎉 Готово!

После успешного запуска:

- ✅ API работает на http://localhost:3000
- ✅ Swagger UI доступен на http://localhost:3000/docs
- ✅ База данных с данными из дампа готова
- ✅ Локальный PostgreSQL не конфликтует
