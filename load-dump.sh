#!/bin/sh
# Скрипт для загрузки дампа ПОСЛЕ полного старта приложения
# Использование: docker compose exec db sh /load-dump.sh

echo "⏳ Ожидание готовности PostgreSQL..."
until pg_isready -U postgres; do
  sleep 1
done

echo "📥 Загрузка дампа..."
psql -U postgres -d Meract -f /docker-entrypoint-initdb.d/dump.sql

echo "✅ Дамп загружен успешно"
