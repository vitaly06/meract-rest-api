# Frontend Integration: Role System (hero / navigator / spot_agent)

Этот документ описывает, как фронтенду подвязать новые backend-изменения для ролей в акте.

## 1) Что изменилось

Для ролей поддерживаются 3 сценария:

- `fixed`: `openVoting=false`, 1 кандидат, голосование не нужно
- `voting_candidates`: `openVoting=false`, 2+ кандидата, зрители голосуют за preset-кандидатов создателя
- `open_voting`: `openVoting=true`, кандидаты подают заявки сами, зрители голосуют

Дополнительно:

- Добавлен новый endpoint голосования за preset-кандидатов: `POST /api/act/:actId/vote-team-candidate`
- В `GET /api/act/:actId/candidates/:roleType` для `teamCandidates` теперь приходит `_count.votes`
- `apply-role` теперь разрешен только если роль реально `openVoting=true` в `ActTeamRoleConfig`
- `roleType` расширен до `hero | navigator | spot_agent` в apply/get-candidates

## 2) Эндпоинты (JWT Bearer обязателен)

## 2.1 Получить кандидатов по роли

`GET /api/act/:actId/candidates/:roleType`

`roleType`: `hero` | `navigator` | `spot_agent`

Ответ:

- `teamCandidates[]` — preset-кандидаты из структуры команд
- `roleCandidates[]` — кандидаты из open-входа (`apply-role`)

Важно: у `teamCandidates` теперь есть `_count.votes`.

## 2.2 Подать заявку (только open_voting)

`POST /api/act/:actId/apply-role`

Body:

```json
{
  "roleType": "hero"
}
```

или для bidding (если используется):

```json
{
  "roleType": "hero",
  "bidAmount": 100,
  "bidItem": "Обещаю выполнить задачу X"
}
```

Если роль не open-вида, backend вернет ошибку:

`Role "<roleType>" is not open for applications in this act`

## 2.3 Голос за preset-кандидата (voting_candidates)

`POST /api/act/:actId/vote-team-candidate`

Body:

```json
{
  "candidateId": 5
}
```

Ограничение: 1 пользователь = 1 голос на роль в рамках одного акта.

## 2.4 Голос за open-кандидата

`POST /api/act/:actId/vote-candidate`

Body:

```json
{
  "candidateId": 12
}
```

## 2.5 Назначение роли инициатором

`POST /api/act/:actId/assign-role`

Body:

```json
{
  "roleType": "hero",
  "candidateId": 12
}
```

## 3) Рекомендованный фронтовый flow

## 3.1 Загрузка экрана ролей акта

Для каждой роли (`hero`, `navigator`, `spot_agent`) вызывайте:

1. `GET /api/act/:actId/candidates/:roleType`
2. На фронте определяйте режим по данным `teamCandidates.config.openVoting`:
- есть `openVoting=false` + несколько кандидатов: `voting_candidates`
- есть `openVoting=false` + один кандидат: `fixed`
- есть `openVoting=true`: `open_voting`

## 3.2 Действия пользователя

- Если `fixed`: UI только показывает назначенного/preset кандидата, кнопки голосования/заявки скрыты
- Если `voting_candidates`: показывайте список `teamCandidates`, голосуйте через `vote-team-candidate`
- Если `open_voting`: кнопка "Подать заявку" (`apply-role`) + голосование по `roleCandidates` через `vote-candidate`

После любого действия делайте рефетч:

- `GET /api/act/:actId/candidates/:roleType`

## 3.3 Отображение голосов

Для preset-кандидатов:

- `teamCandidates[i]._count.votes`

Для open-кандидатов:

- `roleCandidates[i]._count.votes`

Проценты:

```ts
const total = candidates.reduce((sum, c) => sum + c._count.votes, 0);
const percent = total ? Math.round((c._count.votes / total) * 100) : 0;
```

## 4) Обработка типовых ошибок

- `Role "<roleType>" is not open for applications in this act`
  - Показать: "На эту роль сейчас нельзя подать заявку"
- `You have already voted for a <role> candidate in this act`
  - Показать: "Вы уже голосовали за эту роль"
- `Use /vote-candidate for open voting roles`
  - Показать: "Для этой роли доступно голосование по заявкам"

## 5) Минимальные TS-типы для фронта

```ts
type RoleType = "hero" | "navigator" | "spot_agent";

type TeamCandidate = {
  id: number;
  user: { id: number; login: string | null; email: string; avatarUrl: string | null };
  config: {
    role: RoleType;
    openVoting: boolean;
    votingStartAt: string | null;
    votingDurationHours: number | null;
    team: { id: number; name: string };
  };
  _count: { votes: number };
};

type RoleCandidate = {
  id: number;
  roleType: RoleType;
  user: { id: number; login: string | null; email: string; avatarUrl: string | null };
  _count: { votes: number };
};

type CandidatesResponse = {
  teamCandidates: TeamCandidate[];
  roleCandidates: RoleCandidate[];
};
```

## 6) Коротко: что использовать фронту

- preset-голосование: `vote-team-candidate`
- open-голосование: `apply-role` + `vote-candidate`
- унифицированный список кандидатов: `get-candidates` по каждой роли
- для `spot_agent` теперь те же правила типизации и API-потока
