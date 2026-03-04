# Система уведомлений — Frontend Integration Guide

## 1. Обзор

Уведомления доставляются двумя способами:

| Способ                         | Когда использовать                           |
| ------------------------------ | -------------------------------------------- |
| **WebSocket** `/notifications` | Мгновенная доставка пока пользователь онлайн |
| **REST** `GET /notifications`  | Загрузка истории при открытии приложения     |

---

## 2. TypeScript интерфейс

```ts
interface Notification {
  id: number;
  userId: number;
  type: NotificationType;
  title: string;
  body: string;
  imageUrl: string | null; // аватар отправителя, лого гильдии или фото чата
  metadata: NotificationMetadata | null;
  isRead: boolean;
  createdAt: string; // ISO 8601
}

type NotificationType =
  | 'new_message' // новое сообщение в чате
  | 'guild_join_request' // кто-то подал заявку в вашу гильдию (только владельцу)
  | 'guild_join_approved' // ваша заявка одобрена
  | 'guild_join_rejected' // ваша заявка отклонена
  | 'role_assigned' // вы назначены героем / навигатором в акте
  | 'achievement_awarded'; // (резерв) получено достижение;

// Поле metadata зависит от type:
type NotificationMetadata =
  | { chatId: number; chatType: 'direct' | 'group' | 'guild'; senderId: number } // new_message
  | { guildId: number; requesterId: number } // guild_join_request
  | { guildId: number } // guild_join_approved | guild_join_rejected
  | { actId: number; role: 'hero' | 'navigator' }; // role_assigned
```

---

## 3. Описание типов уведомлений

### 3.1 `new_message` — Новое сообщение

| Поле                | Значение                                                                                              |
| ------------------- | ----------------------------------------------------------------------------------------------------- |
| `title`             | Для личного чата — имя отправителя; для группового/гильдии — название чата                            |
| `body`              | Для личного: текст сообщения или `📷 Photo / 🎥 Video / 📎 File`; для группового: `{sender}: {текст}` |
| `imageUrl`          | Для личного — аватар отправителя; для группового/гильдии — изображение чата                           |
| `metadata.chatId`   | Идентификатор чата для перехода                                                                       |
| `metadata.chatType` | `direct` / `group` / `guild`                                                                          |
| `metadata.senderId` | ID отправителя                                                                                        |

**Навигация по нажатию:** перейти в чат `/chat/{metadata.chatId}`

---

### 3.2 `guild_join_request` — Заявка в гильдию

Отправляется **владельцу** гильдии.

| Поле                   | Значение                                  |
| ---------------------- | ----------------------------------------- |
| `title`                | `"Заявка в гильдию"`                      |
| `body`                 | `"{user} хочет вступить в "{guildName}""` |
| `imageUrl`             | Аватар пользователя, подавшего заявку     |
| `metadata.guildId`     | ID гильдии                                |
| `metadata.requesterId` | ID заявителя                              |

**Навигация по нажатию:** перейти к заявкам гильдии `/guild/{metadata.guildId}/requests`

---

### 3.3 `guild_join_approved` — Заявка одобрена

| Поле               | Значение                               |
| ------------------ | -------------------------------------- |
| `title`            | `"Заявка принята"`                     |
| `body`             | `"Вы приняты в гильдию "{guildName}""` |
| `imageUrl`         | Логотип гильдии                        |
| `metadata.guildId` | ID гильдии                             |

**Навигация по нажатию:** перейти на страницу гильдии `/guild/{metadata.guildId}`

---

### 3.4 `guild_join_rejected` — Заявка отклонена

| Поле               | Значение                                          |
| ------------------ | ------------------------------------------------- |
| `title`            | `"Заявка отклонена"`                              |
| `body`             | `"Ваша заявка в гильдию "{guildName}" отклонена"` |
| `imageUrl`         | Логотип гильдии                                   |
| `metadata.guildId` | ID гильдии                                        |

---

### 3.5 `role_assigned` — Назначение роли в акте

| Поле             | Значение                                                 |
| ---------------- | -------------------------------------------------------- |
| `title`          | `"Вы назначены Героем"` или `"Вы назначены Навигатором"` |
| `body`           | `"Вы стали Героем в акте "{actTitle}""`                  |
| `imageUrl`       | Превью акта                                              |
| `metadata.actId` | ID акта                                                  |
| `metadata.role`  | `hero` или `navigator`                                   |

**Навигация по нажатию:** перейти на страницу акта `/act/{metadata.actId}`

---

## 4. REST API

Все эндпоинты требуют авторизации (JWT cookie/header).

### 4.1 Получить уведомления (с пагинацией)

```
GET /notifications?limit=30&before={lastId}
```

**Response:**

```json
[
  {
    "id": 42,
    "type": "new_message",
    "title": "Иван",
    "body": "Привет, как дела?",
    "imageUrl": "https://...",
    "metadata": { "chatId": 5, "chatType": "direct", "senderId": 12 },
    "isRead": false,
    "createdAt": "2026-03-04T10:00:00.000Z"
  }
]
```

**Пагинация:** передавайте `before` = id последнего полученного уведомления для подгрузки старее.

---

### 4.2 Счётчик непрочитанных

```
GET /notifications/unread-count
```

**Response:** `{ "count": 7 }`

Используйте для бейджа на иконке колокольчика.

---

### 4.3 Отметить одно уведомление прочитанным

```
PATCH /notifications/{id}/read
```

**Response:** `{ "success": true }`

---

### 4.4 Отметить все прочитанными

```
PATCH /notifications/read-all
```

**Response:** `{ "success": true }`

---

### 4.5 Удалить уведомление

```
DELETE /notifications/{id}
```

**Response:** `{ "success": true }`

---

## 5. WebSocket — реальное время

### 5.1 Подключение

Namespace: `/notifications`

```ts
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/notifications', {
  auth: { token: accessToken },
  // или через cookie (работает автоматически если httpOnly cookie установлен)
  withCredentials: true,
});
```

Если авторизация не прошла — сервер сразу отключит сокет.

---

### 5.2 Входящие события

#### `notification:new` — новое уведомление

```ts
socket.on('notification:new', (notification: Notification) => {
  // Добавить в список уведомлений
  notifications.unshift(notification);
  // Обновить счётчик непрочитанных
  unreadCount++;
  // Показать toast/push
  showToast(notification);
});
```

Объект `notification` полностью соответствует интерфейсу из раздела 2.

---

### 5.3 Жизненный цикл соединения

```ts
socket.on('connect', () => {
  console.log('Notifications connected');
  // Запросить начальный список через REST на случай пропущенных
  fetchNotifications();
});

socket.on('disconnect', () => {
  console.log('Notifications disconnected');
});
```

---

## 6. Рекомендуемая логика UI

### Шаг 1 — При загрузке приложения

1. `GET /notifications/unread-count` → показать бейдж
2. Подключить WebSocket `/notifications`

### Шаг 2 — При открытии панели уведомлений

1. `GET /notifications?limit=30` → загрузить список
2. Показать UI (если `isRead: false` — выделить)

### Шаг 3 — При получении `notification:new`

- Добавить уведомление в начало списка без перезагрузки
- Инкрементировать счётчик банджа
- Показать toast с `title`, `body`, `imageUrl`, временем

### Шаг 4 — Клик по уведомлению

1. `PATCH /notifications/{id}/read`
2. Задекрементировать счётчик
3. Навигация по `metadata` (см. раздел 3)

### Шаг 5 — Кнопка «Прочитать все»

1. `PATCH /notifications/read-all`
2. Обнулить счётчик, обновить все записи в списке

---

## 7. Пример компонента (React)

```tsx
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export function useNotifications(accessToken: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // 1. Загрузить список и счётчик
    fetch('/notifications', { credentials: 'include' })
      .then((r) => r.json())
      .then(setNotifications);

    fetch('/notifications/unread-count', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setUnreadCount(d.count));

    // 2. WebSocket
    const socket: Socket = io('/notifications', {
      auth: { token: accessToken },
      withCredentials: true,
    });

    socket.on('notification:new', (n: Notification) => {
      setNotifications((prev) => [n, ...prev]);
      setUnreadCount((c) => c + 1);
      // showToast(n);
    });

    return () => socket.disconnect();
  }, [accessToken]);

  const markRead = async (id: number) => {
    await fetch(`/notifications/${id}/read`, {
      method: 'PATCH',
      credentials: 'include',
    });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    await fetch('/notifications/read-all', {
      method: 'PATCH',
      credentials: 'include',
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  return { notifications, unreadCount, markRead, markAllRead };
}
```

---

## 8. Toast / Push-уведомление

Рекомендуемый вид карточки уведомления:

```
┌─────────────────────────────────────────────┐
│ [imageUrl 40px] │ title           │ 10:35   │
│                 │ body preview... │         │
└─────────────────────────────────────────────┘
```

- **imageUrl** — аватар/логотип (40x40, rounded)
- **title** — жирный, 14px
- **body** — серый, 13px, обрезать до 2 строк
- **время** — `createdAt` форматировать: "только что", "5 мин назад", или время

Формат времени:

```ts
function formatNotifTime(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'только что';
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400)
    return new Date(iso).toLocaleTimeString('ru', {
      hour: '2-digit',
      minute: '2-digit',
    });
  return new Date(iso).toLocaleDateString('ru', {
    day: 'numeric',
    month: 'short',
  });
}
```

---

## 9. Чеклист интеграции

- [ ] Подключить WebSocket `/notifications` при логине
- [ ] Отключить WebSocket при логауте
- [ ] Загружать `unread-count` при запуске
- [ ] Показывать бейдж на иконке колокольчика
- [ ] Обрабатывать `notification:new` — toast + добавление в список
- [ ] Клик по уведомлению → `PATCH /notifications/{id}/read` → навигация
- [ ] Кнопка "Прочитать все" → `PATCH /notifications/read-all`
- [ ] Бесконечная прокрутка в панели уведомлений (параметр `before`)
- [ ] Обрабатывать все `NotificationType` с правильной навигацией
