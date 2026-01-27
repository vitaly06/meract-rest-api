#!/bin/bash
# СРОЧНАЯ ОЧИСТКА И ЗАЩИТА СИСТЕМЫ

echo "========================================="
echo "🚨 СРОЧНАЯ ЗАЩИТА ОТ АТАКИ"
echo "========================================="
echo ""

# 1. Остановить контейнеры
echo "[1/7] Остановка контейнеров..."
docker compose down -v

# 2. Проверить наличие вредоносных файлов
echo ""
echo "[2/7] Проверка на вредоносное ПО..."
MALWARE_FOUND=0

if [ -f "/tmp/bot" ]; then
    echo "⚠️  НАЙДЕН: /tmp/bot"
    sudo rm -f /tmp/bot
    MALWARE_FOUND=1
fi

if [ -f "/tmp/watchdog" ]; then
    echo "⚠️  НАЙДЕН: /tmp/watchdog"
    sudo rm -f /tmp/watchdog
    MALWARE_FOUND=1
fi

if [ -f "/tmp/httpd" ]; then
    echo "⚠️  НАЙДЕН: /tmp/httpd"
    sudo rm -f /tmp/httpd
    MALWARE_FOUND=1
fi

if [ $MALWARE_FOUND -eq 0 ]; then
    echo "✅ Вредоносные файлы не найдены"
fi

# 3. Убить подозрительные процессы
echo ""
echo "[3/7] Проверка подозрительных процессов..."
sudo pkill -9 -f "bot" 2>/dev/null && echo "⚠️  Убит процесс 'bot'"
sudo pkill -9 -f "watchdog" 2>/dev/null && echo "⚠️  Убит процесс 'watchdog'"
sudo pkill -9 -f "kinsing" 2>/dev/null && echo "⚠️  Убит процесс 'kinsing'"
sudo pkill -9 -f "xmrig" 2>/dev/null && echo "⚠️  Убит процесс 'xmrig'"

# 4. Настроить файрвол
echo ""
echo "[4/7] Настройка файрвола..."
if command -v ufw &> /dev/null; then
    sudo ufw --force enable
    sudo ufw default deny incoming
    sudo ufw allow 22/tcp
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    sudo ufw allow 3000/tcp
    echo "✅ Файрвол настроен (ufw)"
elif command -v firewall-cmd &> /dev/null; then
    sudo firewall-cmd --permanent --add-service=ssh
    sudo firewall-cmd --permanent --add-service=http
    sudo firewall-cmd --permanent --add-service=https
    sudo firewall-cmd --permanent --add-port=3000/tcp
    sudo firewall-cmd --reload
    echo "✅ Файрвол настроен (firewalld)"
else
    echo "⚠️  Файрвол не найден. Установите ufw или firewalld!"
fi

# 5. Заблокировать IP атакующего
echo ""
echo "[5/7] Блокировка IP атакующего..."
ATTACKER_IP="185.186.25.120"
if command -v ufw &> /dev/null; then
    sudo ufw deny from $ATTACKER_IP
    echo "✅ IP $ATTACKER_IP заблокирован"
elif command -v iptables &> /dev/null; then
    sudo iptables -A INPUT -s $ATTACKER_IP -j DROP
    echo "✅ IP $ATTACKER_IP заблокирован"
fi

# 6. Пересоздать контейнеры с новыми настройками
echo ""
echo "[6/7] Запуск защищённых контейнеров..."
docker compose up -d --build

# 7. Проверка безопасности
echo ""
echo "[7/7] Проверка безопасности..."
sleep 10

# Проверить, что порт закрыт
if ! nc -z localhost 5433 2>/dev/null; then
    echo "✅ Порт 5433 закрыт для внешнего доступа"
else
    echo "⚠️  Порт 5433 всё ещё открыт! Проверьте docker-compose.yml"
fi

# Проверить логи БД
echo ""
echo "Проверка логов PostgreSQL на новые атаки..."
docker compose logs db --tail 20 | grep -i "fatal\|error" && echo "⚠️  Найдены ошибки в логах" || echo "✅ Логи чисты"

echo ""
echo "========================================="
echo "✅ ЗАЩИТА ПРИМЕНЕНА"
echo "========================================="
echo ""
echo "📋 Следующие шаги:"
echo "1. Прочитайте SECURITY_ALERT.md"
echo "2. Смените пароль в docker-compose.yml (сейчас: SuperSecurePassword2026!ChangeMe)"
echo "3. Настройте регулярный мониторинг логов"
echo "4. Установите fail2ban для PostgreSQL"
echo ""
echo "📊 Проверка системы:"
echo "docker compose ps"
echo "docker compose logs -f"
echo "sudo ufw status"
echo ""
