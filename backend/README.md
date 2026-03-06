# AI Outreach Backend

An AI-Powered Intelligent Outreach Workflow Automation Engine built with Node.js, Express, Prisma, BullMQ, and OpenAI GPT-4o.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│                      REST API                        │
│  Auth · Workflows · Nodes · Edges · Leads · Outbox  │
└───────────────────┬──────────────────────────────────┘
                    │
        ┌───────────▼──────────────┐
        │     Workflow Engine      │
        │  (FSM over DAG nodes)    │
        │  IMPORT → AI → SEND →   │
        │  WAIT → CHECK → COND →  │
        │  END                    │
        └───────────┬──────────────┘
                    │
     ┌──────────────▼──────────────────┐
     │     BullMQ (Redis-backed)       │
     │  workflowWorker (30s schedule)  │
     │  outboxWorker  (5s poll)        │
     └──────────────┬──────────────────┘
                    │
     ┌──────────────▼──────────────────┐
     │  Neon PostgreSQL (via Prisma)   │
     │  + Redis (rate limits/queues)   │
     └─────────────────────────────────┘
```

---

## Prerequisites

- Node.js 20+
- Redis (local or [Upstash](https://upstash.com))
- [Neon](https://neon.tech) PostgreSQL database
- OpenAI API key

---

## Setup

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in:
- `DATABASE_URL` — Neon PostgreSQL connection string
- `REDIS_URL` — Redis URL (`redis://localhost:6379` for local)
- `OPENAI_API_KEY` — from [platform.openai.com](https://platform.openai.com)
- `JWT_SECRET` — a secure random string (32+ chars)

### 3. Run database migrations

```bash
npm run db:migrate
# or for quick sync without migrations:
npm run db:push
```

### 4. Generate Prisma client

```bash
npm run db:generate
```

### 5. Start the server

```bash
# Development (auto-restart)
npm run dev

# Production
npm start
```

The server starts on `http://localhost:4000` (or `PORT` from `.env`).

---

## API Reference

All authenticated endpoints require: `Authorization: Bearer <token>`

### Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login and get JWT |

### Workflows

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/workflows` | List all workflows |
| POST | `/api/workflows` | Create workflow |
| GET | `/api/workflows/:id` | Get workflow (with nodes/edges) |
| PUT | `/api/workflows/:id` | Update workflow |
| DELETE | `/api/workflows/:id` | Delete workflow |
| PATCH | `/api/workflows/:id/activate` | Set status ACTIVE |
| PATCH | `/api/workflows/:id/deactivate` | Set status PAUSED |

### Nodes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/workflows/:workflowId/nodes` | List nodes |
| POST | `/api/workflows/:workflowId/nodes` | Create node |
| GET | `/api/workflows/:workflowId/nodes/:id` | Get node |
| PUT | `/api/workflows/:workflowId/nodes/:id` | Update node |
| DELETE | `/api/workflows/:workflowId/nodes/:id` | Delete node |

**Node types:** `IMPORT_LEADS`, `AI_GENERATE`, `SEND_MESSAGE`, `WAIT`, `CHECK_REPLY`, `CONDITION`, `END`

### Edges

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/workflows/:workflowId/edges` | List edges |
| POST | `/api/workflows/:workflowId/edges` | Create edge |
| DELETE | `/api/workflows/:workflowId/edges/:id` | Delete edge |

### Leads

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/workflows/:workflowId/leads/import` | Bulk import leads |
| GET | `/api/workflows/:workflowId/leads` | List leads (paginated, ?status=) |
| GET | `/api/leads/:id` | Get lead detail |
| PATCH | `/api/leads/:id/status` | Update lead status |
| GET | `/api/leads/:id/history` | Get transition history |

### Outbox

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/outbox` | List queue items (?status=, ?channel=) |

### Dashboard

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/dashboard` | Aggregated stats |

---

## Node Configuration Examples

### AI_GENERATE node config
```json
{
  "goal": "Schedule a 15-minute discovery call",
  "product": "Our AI analytics platform",
  "tone": "Professional but warm",
  "senderName": "Alex",
  "senderCompany": "Acme Corp"
}
```

### WAIT node config
```json
{ "durationMs": 86400000 }
```

### CHECK_REPLY node config
```json
{ "waitForReplyMs": 172800000 }
```
Outgoing edges need `conditionLabel: "replied"` and `conditionLabel: "no_reply"`.

### CONDITION node config
```json
{
  "conditions": [
    { "field": "customFields.score", "operator": "gte", "value": 70, "label": "high_score" },
    { "field": "company", "operator": "exists", "label": "has_company" }
  ],
  "defaultLabel": "default"
}
```
Operators: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `contains`, `not_contains`, `exists`, `not_exists`

---

## Workers

Both workers start automatically with the server:

- **Workflow Worker** — polls every 30 seconds for ACTIVE leads in ACTIVE workflows, enqueues FSM advancement jobs with concurrency 10.
- **Outbox Worker** — polls every 5 seconds for PENDING/SCHEDULED outbox items, applies per-account hourly rate limits in Redis, adds random jitter (0–30s), simulates 5% failure rate, and applies exponential backoff (2^n minutes) for failed items.

---

## Project Structure

```
backend/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app.js
│   ├── server.js
│   ├── lib/
│   │   ├── prisma.js
│   │   ├── redis.js
│   │   └── openai.js
│   ├── middleware/
│   │   └── auth.js
│   ├── engine/
│   │   ├── workflowEngine.js
│   │   └── handlers/
│   │       ├── importLeads.js
│   │       ├── aiGenerate.js
│   │       ├── sendMessage.js
│   │       ├── wait.js
│   │       ├── checkReply.js
│   │       ├── condition.js
│   │       └── end.js
│   ├── workers/
│   │   ├── workflowWorker.js
│   │   └── outboxWorker.js
│   ├── services/
│   │   └── aiService.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── workflow.controller.js
│   │   ├── node.controller.js
│   │   ├── edge.controller.js
│   │   ├── lead.controller.js
│   │   ├── outbox.controller.js
│   │   └── dashboard.controller.js
│   └── routes/
│       ├── auth.routes.js
│       ├── workflow.routes.js
│       ├── node.routes.js
│       ├── edge.routes.js
│       ├── lead.routes.js
│       ├── outbox.routes.js
│       └── dashboard.routes.js
├── .env.example
└── package.json
```
