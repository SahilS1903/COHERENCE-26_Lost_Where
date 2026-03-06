# COHERENCE-26_Lost_Where

# ⚡ Sales Outreach Automation Platform

> **AI-Powered Intelligent Outreach Workflow Automation Engine**  
> Built for sales teams who want to scale personalized outreach without scaling headcount.

![React](https://img.shields.io/badge/React-Next.js-61DAFB?style=for-the-badge&logo=react)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI%20%2F%20Express-009688?style=for-the-badge)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791?style=for-the-badge&logo=postgresql)
![Redis](https://img.shields.io/badge/Queue-Redis%20%2B%20BullMQ-DC382D?style=for-the-badge&logo=redis)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

---

## 📋 Overview

This platform enables sales teams to upload client lists, design conversation workflows via a **drag-and-drop visual builder**, and let AI handle natural, human-like interactions at scale.

**Core Philosophy:**  
Workflows are fixed **Directed Graphs (FSM)**. Leads traverse nodes via a `current_node_id` pointer. The engine **never** sends messages directly — it pushes to a Global Outbox processed by a throttled background worker.

### What makes it different?
- 🧠 **FSM Execution** — Deterministic, auditable lead progression through workflow graphs
- 📬 **Decoupled Sending** — Outbox pattern separates logic from delivery
- 🕐 **Human-like Throttling** — Randomized 30s–120s jitter + daily/hourly rate limits
- 🔁 **Retry Loops** — Configurable max-retry guards to prevent spam
- 💰 **Tiered by Complexity** — Node count limits enforce plan boundaries

---

## ✨ Key Features

### For Sales Teams
| Feature | Description |
|---|---|
| CSV Upload | Bulk import client data — names, emails, phones, notes |
| Visual Workflow Builder | Drag-and-drop via `reactflow` to design outreach sequences |
| Natural Language Setup | Describe your strategy; AI builds the workflow |
| Real-time Dashboard | Monitor all active conversations live |
| Human-in-the-Loop | Approve AI replies or take over manually |
| Multi-channel | Email and SMS with automatic channel selection |

### AI Capabilities
- Natural conversation generation (OpenAI / Gemini)
- Sentiment analysis on client replies
- Smart follow-up timing & personalization using client data
- Pain point extraction and interest level scoring
- Multi-language support

### Safety & Throttling
- **Jitter delays** — 30s–120s randomized gap between sends
- **Rate limiting** — Daily and hourly caps per lead and per channel
- **Opt-out handling** — STOP / Unsubscribe auto-suppression (CAN-SPAM / GDPR)
- **FSM guardrails** — `max_retry_count` prevents infinite loops

---

## 🏗️ System Architecture

```
┌──────────────────────────────────────────────────────────┐
│                FRONTEND  (React / Next.js)                │
│   Dashboard   │   Workflow Builder   │   Conversation     │
└─────────────────────────┬────────────────────────────────┘
                           │  REST / WebSocket
┌─────────────────────────▼────────────────────────────────┐
│             BACKEND API  (FastAPI / Express)              │
│   Workflow Engine  │  Lead FSM  │  AI Prompt Generator   │
└──────┬──────────────────────────────────────┬────────────┘
       │ Push jobs                             │ Read/Write
┌──────▼──────────┐                ┌──────────▼───────────┐
│  Redis Outbox   │                │    PostgreSQL DB      │
│ (BullMQ/Celery) │                │  Workflows / Leads /  │
└──────┬──────────┘                │  Nodes / Edges /      │
       │ Process with jitter        │  OutboxQueue          │
┌──────▼──────────────────────┐   └──────────────────────┘
│      OUTBOX WORKER           │
│  Jitter 30-120s │ Rate Limit │
└──────┬──────────────┬────────┘
       │              │
┌──────▼──────┐ ┌─────▼────────┐
│  SendGrid   │ │    Twilio    │
│  (Email)    │ │    (SMS)     │
└─────────────┘ └─────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React / Next.js + TypeScript | UI, dashboard, workflow builder |
| Visual Builder | React Flow (`reactflow`) | Drag-and-drop node graph editor |
| Styling | Tailwind CSS | Utility-first responsive styling |
| State | React Query / Zustand | Server and client state management |
| Backend | FastAPI (Python) or Express (Node.js) | REST API, FSM engine, LLM integration |
| Database | PostgreSQL + Prisma / SQLAlchemy | Persistent storage for all models |
| Queue | Redis + BullMQ (Node) / Celery (Python) | Outbox queue and background workers |
| Email | SendGrid | Transactional email delivery |
| SMS | Twilio | Two-way SMS conversations |
| AI | OpenAI API / Gemini | Message generation and sentiment analysis |
| Files | AWS S3 | CSV storage and file management |
| Auth | JWT | Stateless authentication |

---

## 🚀 Phased Build Architecture

> ⚠️ **Execution Rule:** Do NOT write the entire codebase at once. Follow phases strictly. Complete one phase, get approval, then proceed.

---

### 🔵 Phase 1 — Database Schema & Core Models

**Goal:** Define the complete PostgreSQL schema. This is the foundation all other phases depend on.

- Write Prisma schema (or SQLAlchemy models) for all core entities
- **`Workflow`** — `id`, `name`, `description`, `is_active`, `created_at`
- **`Node`** — `id`, `workflow_id`, `type` (enum), `config` (JSONB), `position_x`, `position_y`
- **`Edge`** — `id`, `workflow_id`, `source_node_id`, `target_node_id`, `condition` (`replied` / `no_reply` / `default`)
- **`Lead`** — `id`, `workflow_id`, `current_node_id`, `state` (`active` / `paused` / `completed`), `retry_count`, `last_contacted_at`, `data` (JSONB)
- **`OutboxQueue`** — `id`, `lead_id`, `channel` (`email` / `sms`), `payload` (JSONB), `status`, `scheduled_at`, `sent_at`
- Run migrations and verify schema integrity

> ⏸ **Stop and wait for approval before proceeding.**

---

### 🟢 Phase 2 — Workflow Engine API

**Goal:** The brain of the system. Evaluates each lead's current node and decides what happens next.

- Build `GET /api/leads/:id/tick` — evaluates `current_node_id` for a given lead
- Implement node type handlers: `Import`, `AI Generate`, `Send`, `Wait`, `Check Reply`, `End`
- Build AI prompt generation function with LLM stub (pluggable OpenAI / Gemini)
- Implement FSM transition logic: evaluate edge conditions (time elapsed, reply status)
- Push message jobs to Redis Outbox instead of sending directly
- Implement retry loop logic with `max_retry_count` guard

> ⏸ **Stop and wait for approval before proceeding.**

---

### 🟡 Phase 3 — Outbox Worker & Throttling

**Goal:** The safety layer. Consumes the Outbox queue with human-like behaviour.

- Write BullMQ worker (Node) or Celery worker (Python) that consumes `OutboxQueue`
- Implement randomized jitter delay: **30s–120s** between each message send
- Implement rate-limit checker: max N emails/hour, max M SMS/day per lead
- Build mock SendGrid email sender with full logging
- Build mock Twilio SMS sender with STOP-command handling
- Update `OutboxQueue.status` to `sent` / `failed` on completion

> ⏸ **Stop and wait for approval before proceeding.**

---

### 🟣 Phase 4 — Frontend Visual Builder

**Goal:** The user-facing drag-and-drop workflow editor powered by React Flow.

- Build `WorkflowBuilder` React component using `reactflow`
- Implement draggable node palette: `Start`, `AI Generate`, `Send Email`, `Send SMS`, `Wait`, `Check Reply`, `End`
- Add edge connection handles with condition labels (`Replied` / `No Reply`)
- Serialize React Flow graph state to the JSON schema from Phase 1
- Build save/load workflow API integration (`POST /api/workflows`)
- Add node count enforcement for tier-based billing limits

> ⏸ **Stop and wait for approval before proceeding.**

---

## 📊 Workflow Node Tiers

| Plan | Max Nodes | Price | Included Node Types |
|---|---|---|---|
| Free Trial | 5 | $0 / month | START, Import CSV, Send, Wait, END |
| Basic | 9 | $29 / month | + Check Reply, Condition, Mark Status, Retry |
| Pro | 15 | $79 / month | + AI Generate, Schedule Meeting, Loop, Multi-condition |
| Enterprise | Unlimited | $199 / month | + Webhook, CRM Sync, Custom Code, Team Assignment |

---

## 🚀 Getting Started

### Prerequisites

- `Node.js 18+` or `Python 3.11+`
- `PostgreSQL 14+`
- `Redis 6+`
- SendGrid account (email delivery)
- Twilio account (SMS delivery)
- OpenAI API key or Gemini API key

### 1. Clone & Install

```bash
# Clone the repository
git clone https://github.com/yourusername/sales-outreach-platform.git
cd sales-outreach-platform

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Environment Variables

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

| Variable | Service | Description |
|---|---|---|
| `DATABASE_URL` | PostgreSQL | Full connection string |
| `REDIS_URL` | Redis | Redis connection URL |
| `JWT_SECRET` | Auth | Secret for JWT token signing |
| `SENDGRID_API_KEY` | SendGrid | Email delivery API key |
| `FROM_EMAIL` | SendGrid | Verified sender email address |
| `TWILIO_ACCOUNT_SID` | Twilio | Twilio account identifier |
| `TWILIO_AUTH_TOKEN` | Twilio | Twilio authentication token |
| `TWILIO_PHONE_NUMBER` | Twilio | Your Twilio phone number |
| `OPENAI_API_KEY` | OpenAI | GPT API key for message generation |
| `AWS_ACCESS_KEY_ID` | AWS S3 | S3 credentials for CSV storage |
| `AWS_SECRET_ACCESS_KEY` | AWS S3 | S3 secret access key |
| `AWS_BUCKET_NAME` | AWS S3 | Target S3 bucket name |

### 3. Database Setup

```bash
cd backend

# Run Prisma migrations
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate

# (Optional) Seed sample data
npx prisma db seed
```

### 4. Start Development Servers

```bash
# Terminal 1 — Backend API
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm start

# Terminal 3 — Outbox Worker
cd backend && npm run worker

# Terminal 4 — Redis (if not running)
redis-server
```

---

## � Importing Leads

### Quick Start

The platform supports **bulk lead import** via CSV or Excel files. Perfect for importing your existing contact lists!

**Supported Formats:**
- ✅ CSV (`.csv`)
- ✅ Excel (`.xlsx`, `.xls`)
- Maximum file size: 10MB

### Required Columns
- `email` (required) — Valid email address
- `firstName` (required) — Contact's first name

### Optional Columns
- `lastName` — Contact's last name
- `company` — Company name
- Any additional columns are stored as custom fields

### How to Import

1. Navigate to the **Lead Tracker** page
2. Click **"Import Leads"** button
3. Select your target workflow
4. Choose upload method:
   - **Upload File**: Drag & drop CSV/Excel file (with preview)
   - **Paste Data**: Copy and paste CSV text or JSON array
5. Preview your data (first 5 rows shown)
6. Click **"Import Leads"** to complete

### Sample Template

A sample CSV template is included in the project root:
```csv
email,firstName,lastName,company
john.doe@example.com,John,Doe,Acme Corp
jane.smith@tech.com,Jane,Smith,Tech Innovations
```

**See [LEAD_IMPORT_GUIDE.md](./LEAD_IMPORT_GUIDE.md) for detailed documentation.**

### API Endpoint

```bash
POST /api/workflows/:workflowId/leads/upload-file
Content-Type: multipart/form-data
Authorization: Bearer <token>

# Form field: file (CSV or Excel file)
```

**Import Behavior:**
- Leads with existing emails in the workflow will be updated (upsert)
- All imported leads start with `ACTIVE` status
- Leads are immediately available for workflow processing

---

## �📁 Project Structure

```
sales-outreach-platform/
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── WorkflowBuilder/     # React Flow drag-and-drop builder
│       │   ├── Dashboard/           # Live conversation monitor
│       │   └── ConversationView/    # Per-lead message thread
│       ├── pages/
│       ├── hooks/
│       └── services/                # API client functions
│
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── services/
│   │   │   ├── workflowEngine.ts    # FSM evaluation logic
│   │   │   ├── aiService.ts         # LLM prompt generation
│   │   │   └── outboxService.ts     # Push jobs to Redis
│   │   ├── models/
│   │   └── middleware/
│   ├── prisma/
│   │   └── schema.prisma            # Database schema (Phase 1)
│   └── queue/
│       └── outboxWorker.ts          # BullMQ worker with jitter
│
└── docs/
```

---

## 🚢 Deployment

### Docker (Recommended)

```bash
# Build all images
docker-compose build

# Start all services (API, Worker, Postgres, Redis)
docker-compose up -d

# View logs
docker-compose logs -f worker
```

### Manual Production Build

```bash
# Backend
cd backend && npm run build && npm run start:prod

# Frontend — serve via Nginx or CDN
cd frontend && npm run build

# Start worker process separately
cd backend && node dist/queue/outboxWorker.js
```

---

## 🧪 Testing

```bash
# Backend unit tests
cd backend && npm test

# Frontend component tests
cd frontend && npm test

# End-to-end tests (Playwright)
npm run test:e2e

# Test workflow FSM engine only
cd backend && npm run test:engine
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch — `git checkout -b feature/amazing-feature`
3. Commit your changes — `git commit -m 'Add amazing feature'`
4. Push to the branch — `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License & Support

| | |
|---|---|
| License | MIT — see [LICENSE](LICENSE) |
| Documentation | [docs.yourdomain.com](https://docs.yourdomain.com) |
| Email Support | support@yourdomain.com |
| Bug Reports | [GitHub Issues](https://github.com/yourusername/sales-outreach-platform/issues) |

---

<div align="center">
  <strong>Built for sales teams who want to scale personalized outreach without scaling headcount.</strong>
</div>
