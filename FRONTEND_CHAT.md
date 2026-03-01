# Интеграция чата на фронтенде — REST + WebSocket

> Все HTTP-запросы отправляются на базовый URL: `http://<host>:<port>`  
> WebSocket использует **Socket.io** (namespace: `/`)  
> Аутентификация — JWT Bearer-токен

---

## 1. Аутентификация

Перед любыми запросами нужно получить токен:

```
POST /auth/login
Body: { "email": "...", "password": "..." }

Response: { "accessToken": "eyJ..." }
```

Сохраните `accessToken` — он нужен везде.

---

## 2. REST: Основные эндпоинты

### 2.1 Список чатов

```
GET /chat
Authorization: Bearer <token>
```

**Ответ:**

```json
[
  {
    "id": 1,
    "type": "direct",          // "direct" | "group" | "guild"
    "name": "Иван Иванов",     // логин собеседника / название группы
    "imageUrl": "https://...", // аватар собеседника или обложка группы
    "partner": { "id": 2, "login": "ivan", "email": "...", "avatarUrl": "..." }, // только для direct
    "unreadCount": 3,
    "lastMessage": {
      "id": 55,
      "text": "Привет!",
      "fileType": null,        // "image" | "video" | "audio" | "voice" | "file" | null
      "createdAt": "2025-01-01T12:00:00Z",
      "sender": { "id": 2, "login": "ivan", ... }
    },
    "lastMessageAt": "2025-01-01T12:00:00Z"
  }
]
```

Сортировка: самые свежие сверху.

---

### 2.2 Открыть / создать личный чат

```
POST /chat/direct/:userId
Authorization: Bearer <token>
```

**Ответ:** `{ "id": 7, "type": "direct" }`

---

### 2.3 Создать групповой чат

```
POST /chat/group
Authorization: Bearer <token>
Content-Type: multipart/form-data

name=Команда А
participantIds=[2,3,4]   ← JSON-строка
image=<файл>             ← опционально
```

**Ответ:** полный объект Chat с членами.

---

### 2.4 Чат гильдии

```
POST /chat/guild/:guildId
Authorization: Bearer <token>
```

**Ответ:** `{ "id": 12, "type": "guild", "guildId": 3 }`

---

### 2.5 Загрузка истории сообщений

```
GET /chat/:chatId/messages?limit=50&before=<messageId>
Authorization: Bearer <token>
```

- `limit` — кол-во сообщений (по умолчанию 50)
- `before` — ID сообщения-курсора (для подгрузки старых; не указывать при первой загрузке)

**Ответ:**

```json
[
  {
    "id": 42,
    "chatId": 7,
    "text": "Привет!",
    "fileUrl": null,
    "fileType": null,
    "isDeleted": false,
    "createdAt": "2025-01-01T12:00:00Z",
    "sender": { "id": 2, "login": "ivan", "avatarUrl": "..." },
    "replyTo": null, // { id, text, sender } или null
    "forwardedFrom": null // { id, text, sender } или null
  }
]
```

Сортировка: от старых к новым (ASC).

**Пагинация вверх (подгрузка старых сообщений):**

```js
const oldest = messages[0].id;
const older = await GET(`/chat/${chatId}/messages?before=${oldest}&limit=50`);
messages.unshift(...older);
```

---

### 2.6 Отправить сообщение (REST, если нет WebSocket)

```
POST /chat/:chatId/messages
Authorization: Bearer <token>
Content-Type: multipart/form-data

text=Привет!
replyToId=42          ← опционально
forwardedFromId=55    ← опционально
file=<файл>           ← опционально (image/video/audio/голосовое)
```

---

### 2.7 Удалить сообщение

```
DELETE /chat/messages/:messageId
Authorization: Bearer <token>
```

**Ответ:** `{ "success": true }`  
Сообщение помечается как удалённое (soft delete) — текст и файл зануляются, `isDeleted: true`.

---

### 2.8 Участники чата

```
GET /chat/:chatId/members
Authorization: Bearer <token>
```

**Ответ:**

```json
[
  {
    "userId": 2,
    "joinedAt": "2025-01-01T10:00:00Z",
    "lastReadAt": "2025-01-01T12:00:00Z",
    "user": { "id": 2, "login": "ivan", "email": "...", "avatarUrl": "..." }
  }
]
```

---

### 2.9 Добавить участника в групповой чат

```
POST /chat/:chatId/members/:userId
Authorization: Bearer <token>
```

---

### 2.10 Отметить чат как прочитанный

```
PATCH /chat/:chatId/read
Authorization: Bearer <token>
```

Вызывайте при открытии / скролле до низа.

---

### 2.11 Медиа чата

```
GET /chat/:chatId/media/images?limit=30&before=<messageId>
GET /chat/:chatId/media/videos?limit=30&before=<messageId>
Authorization: Bearer <token>
```

**Ответ:**

```json
[
  {
    "id": 88,
    "fileUrl": "https://s3.../photo.jpg",
    "createdAt": "2025-01-01T12:00:00Z",
    "sender": { "id": 2, "login": "ivan", ... }
  }
]
```

---

### 2.12 Ссылки-приглашения

**Получить/создать invite-код:**

```
GET /chat/:chatId/invite
Authorization: Bearer <token>

Response: { "chatId": 7, "inviteCode": "a1b2c3..." }
```

Сформируйте ссылку на фронте: `https://yourapp.com/join/{inviteCode}`

**Вступить по коду:**

```
POST /chat/join/:inviteCode
Authorization: Bearer <token>

Response: { "chatId": 7, "type": "group", "name": "Команда А" }
```

После успешного ответа перейдите в чат с полученным `chatId`.

---

### 2.13 Опросы в стриме (Poll)

> Namespace `/chat`, комната `stream_<actId>` — те же события, что и у чата стрима.

**Создать опрос** _(только навигатор / владелец акта)_:

```
POST /poll/act/:actId
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Какой маршрут выбрать?",
  "description": "Голосуйте!",       // опционально
  "options": ["Налево", "Направо", "Прямо"],  // 2–5 вариантов
  "biddingTime": 5                    // минут (1–60)
}
```

**Ответ** — объект Poll с процентами:

```json
{
  "id": 1,
  "actId": 42,
  "title": "Какой маршрут выбрать?",
  "description": "Голосуйте!",
  "endsAt": "2026-03-01T10:05:00Z",
  "isActive": true,
  "totalVotes": 0,
  "creator": { "id": 7, "login": "navigator", "avatarUrl": "..." },
  "options": [
    { "id": 1, "text": "Налево", "votes": 0, "percent": 0 },
    { "id": 2, "text": "Направо", "votes": 0, "percent": 0 },
    { "id": 3, "text": "Прямо", "votes": 0, "percent": 0 }
  ]
}
```

**Проголосовать** _(один голос на пользователя)_:

```
POST /poll/:pollId/vote
Authorization: Bearer <token>
Content-Type: application/json

{ "optionId": 2 }
```

После успешного голосования сервер рассылает `poll:update` со свежими процентами.

**Получить активные опросы стрима:**

```
GET /poll/act/:actId
Authorization: Bearer <token>
```

**Получить один опрос:**

```
GET /poll/:pollId
Authorization: Bearer <token>
```

**Закрыть опрос досрочно** _(навигатор / владелец)_:

```
PATCH /poll/:pollId/close
Authorization: Bearer <token>
```

---

## 3. WebSocket — подключение

Используется **Socket.io**. После логина подключитесь:

```js
import { io } from 'socket.io-client';

const socket = io('http://<host>:<port>', {
  auth: { token: accessToken }, // JWT передаётся в auth
  transports: ['websocket'],
});

socket.on('connect', () => console.log('WS connected'));
socket.on('disconnect', () => console.log('WS disconnected'));
socket.on('connect_error', (err) => console.error(err.message));
```

---

## 4. WebSocket — события чата

### 4.1 Войти в комнату чата (обязательно при открытии чата)

```js
socket.emit('chat:join', { chatId: 7 });
```

Все последующие сообщения этого чата будут приходить вам автоматически.

---

### 4.2 Выйти из комнаты (при закрытии чата)

```js
socket.emit('chat:leave', { chatId: 7 });
```

---

### 4.3 Отправить сообщение через WebSocket

```js
socket.emit('chat:send', {
  chatId: 7,
  text: 'Привет!',
  replyToId: 42, // опционально
  forwardedFromId: 55, // опционально
  // Файлы через WS не поддерживаются — используйте REST POST /chat/:id/messages
});
```

> **Файлы (изображения, видео, голосовые)** отправляйте через HTTP `POST /chat/:chatId/messages` (multipart), а не через WebSocket.  
> После успешной отправки по REST сервер сам рассылает новое сообщение всем участникам через WS-событие `chat:message`.

---

### 4.4 Получать новые сообщения

```js
socket.on('chat:message', (message) => {
  // message — объект Message (тот же формат что и в REST /messages)
  console.log('Новое сообщение:', message);
  addMessageToUI(message);
});
```

---

### 4.5 Отметить чат как прочитанный через WebSocket

```js
socket.emit('chat:read', { chatId: 7 });
```

Сервер ответит событием `chat:read` всем участникам чата:

```js
socket.on('chat:read', (data) => {
  // data: { chatId: 7, userId: 2 }
  // Можно обновить индикатор "прочитано"
  updateReadStatus(data.chatId, data.userId);
});
```

---

## 4.2. WebSocket — события опросов в стриме

> Используется namespace `/chat`, комната `stream_<actId>`.  
> Подписаться нужно через `joinStream` — см. раздел 5 (флоу стрима).

### Получить новый опрос

```js
socket.on('poll:new', (poll) => {
  // poll — полный объект Poll с options и percent
  showPollPopup(poll);
});
```

### Обновление результатов в реальном времени

Приходит каждый раз, когда кто-то голосует:

```js
socket.on('poll:update', (poll) => {
  // Тот же формат Poll — обновите проценты в UI
  updatePollResults(poll);
});
```

### Опрос завершён

```js
socket.on('poll:closed', ({ pollId }) => {
  // Заблокировать голосование, показать финальные результаты
  closePollUI(pollId);
});
```

> Опрос закрывается автоматически по истечении `biddingTime` минут,  
> либо вручную через `PATCH /poll/:pollId/close`.

---

## 5. Типичный UI-флоу

### Открытие приложения

1. Авторизоваться → получить `accessToken`
2. Подключить WebSocket с токеном
3. `GET /chat` → отрисовать список чатов

### Открытие конкретного чата

1. `GET /chat/:chatId/messages` → загрузить историю
2. `socket.emit('chat:join', { chatId })` → подписаться на обновления
3. `PATCH /chat/:chatId/read` → сбросить счётчик непрочитанных
4. `socket.on('chat:message', ...)` → дописывать новые сообщения снизу

### Закрытие чата

1. `socket.emit('chat:leave', { chatId })`

### Отправка текстового сообщения

```js
socket.emit('chat:send', { chatId, text });
// chat:message придёт всем участникам, включая отправителя
```

### Отправка файла

```js
const form = new FormData();
form.append('file', fileBlob);
form.append('text', 'Смотри!');

await fetch(`/chat/${chatId}/messages`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: form,
});
// Сервер автоматически рассылает chat:message через WebSocket
```

### Подгрузка старых сообщений (scroll up)

```js
const oldest = messages[0].id;
const older = await fetch(
  `/chat/${chatId}/messages?before=${oldest}&limit=50`,
  {
    headers: { Authorization: `Bearer ${token}` },
  },
).then((r) => r.json());
messages.unshift(...older);
```

### Приглашение пользователя в группу

```js
const { inviteCode } = await fetch(`/chat/${chatId}/invite`, {
  headers: { Authorization: `Bearer ${token}` },
}).then((r) => r.json());

const link = `https://yourapp.com/join/${inviteCode}`;
// Поделиться ссылкой
```

### Вступление по ссылке

```js
// При переходе по /join/:code
const { chatId } = await fetch(`/chat/join/${code}`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
}).then((r) => r.json());

router.push(`/chat/${chatId}`);
```

### Просмотр и голосование в опросе (для зрителя)

1. При получении `poll:new` — показать всплывающий блок опроса поверх чата
2. Пользователь нажимает на вариант → `POST /poll/:pollId/vote { optionId }`
3. После ответа (или из `poll:update`) — обновить прогресс-бары с `%`
4. При получении `poll:closed` — заблокировать кнопки, показать финальный результат

### Создание опроса (для навигатора)

```js
await fetch(`/poll/act/${actId}`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    title: 'Какой маршрут?',
    options: ['Налево', 'Направо'],
    biddingTime: 5,
  }),
});
// Все зрители получат poll:new через WebSocket автоматически
```

---

## 6. Структура объекта Message

```ts
interface Message {
  id: number;
  chatId: number;
  text: string | null;
  fileUrl: string | null;
  fileType: 'image' | 'video' | 'audio' | 'voice' | 'file' | null;
  isDeleted: boolean;
  createdAt: string; // ISO 8601
  sender: {
    id: number;
    login: string | null;
    email: string;
    avatarUrl: string | null;
  };
  replyTo: {
    id: number;
    text: string | null;
    fileUrl: string | null;
    fileType: string | null;
    isDeleted: boolean;
    sender: Sender;
  } | null;
  forwardedFrom: {
    id: number;
    text: string | null;
    fileUrl: string | null;
    fileType: string | null;
    isDeleted: boolean;
    sender: Sender;
  } | null;
}
```

---

## 6.2. Структура объекта Poll

```ts
interface PollOption {
  id: number;
  text: string;
  votes: number;
  percent: number; // 0–100, округлено до целых
}

interface Poll {
  id: number;
  actId: number;
  title: string;
  description: string | null;
  endsAt: string; // ISO 8601 — когда истекает время
  isActive: boolean;
  totalVotes: number;
  createdAt: string;
  creator: {
    id: number;
    login: string | null;
    email: string;
    avatarUrl: string | null;
  };
  options: PollOption[];
}
```

---

## 7. Типы чатов

| type   | name                      | imageUrl           | partner     | inviteCode |
| ------ | ------------------------- | ------------------ | ----------- | ---------- |
| direct | логин / email собеседника | аватар собеседника | объект User | —          |
| group  | заданное при создании     | обложка (S3)       | —           | ✅         |
| guild  | название гильдии          | —                  | —           | ✅         |

---

## 8. Быстрый чеклист для фронта

**Чат:**

- [ ] Сохранить `accessToken` в localStorage / store
- [ ] Подключить Socket.io с `auth: { token }`
- [ ] При логауте: `socket.disconnect()`
- [ ] При открытии чата — `chat:join`, при закрытии — `chat:leave`
- [ ] При получении `chat:message` — если пользователь в этом чате, скроллить вниз и отметить прочитанным
- [ ] Файлы — только через REST (multipart); WS — только текст/reply/forward
- [ ] Мягко удалённые сообщения: `isDeleted: true`, `text: null` → показывать placeholder
- [ ] Для новых DM вызвать `POST /chat/direct/:userId` перед открытием чата

**Опросы в стриме:**

- [ ] При входе в стрим — `GET /poll/act/:actId` для загрузки уже активных опросов
- [ ] Подписаться на `poll:new` → показывать всплывающий блок голосования
- [ ] Подписаться на `poll:update` → обновлять прогресс-бары в реальном времени
- [ ] Подписаться на `poll:closed` → блокировать UI, показывать финальный результат
- [ ] Голосование — `POST /poll/:pollId/vote`, заблокировать кнопку после успешного ответа
- [ ] Навигатор: форма создания опроса (title, 2–5 options, biddingTime в минутах)
- [ ] Таймер обратного отсчёта на основе поля `endsAt` (сравнивайте с `Date.now()`)
- [ ] После `poll:closed` или истечения `endsAt` — не давать голосовать повторно
