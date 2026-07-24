# Gidyops — SecOps Log Analytics

Multi-tenant log analytics app with auth, organizations, bulk upload (10k+ records), and a server-side searchable/sortable/paginated dashboard.

## Features

- **Auth** — Login, register (OTP email), forgot/reset password; trial admin for evaluators
- **Organizations** — After login, select or create a workspace (Pavo-style flow)
- **Bulk upload API** — `POST /api/logs/bulk` accepts and stores large batches (chunked insert, supports 10,000 logs in one request)
- **Dashboard** — View org-scoped logs with stats cards
- **Server-side** search, filter (severity / status / resolution), sort, and pagination
- **Fixed list** — Mark logs as Fixed; view them separately via **View Fixed**

## Stack

| Layer    | Tech                          |
|----------|-------------------------------|
| Frontend | React (Vite), lucide-react    |
| Backend  | Node.js, Express              |
| Database | MongoDB (Atlas or local)      |
| Email    | Nodemailer (Gmail SMTP)       |

## Prerequisites

- Node.js 18+
- MongoDB Atlas URI (or local MongoDB)
- Gmail app password (for OTP / reset emails), optional for trial-admin-only use

## Setup

### 1. Clone and install

```bash
cd gidy

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Backend environment

Create `backend/.env`:

```env
PORT=5000
MONGO_URI=mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/DATABASE?retryWrites=true&w=majority
JWT_SECRET=your_jwt_secret
SMTP_EMAIL=your_gmail@gmail.com
SMTP_PASSWORD=your_gmail_app_password
FROM_NAME=Gidyops
```

### 3. Frontend environment

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000
```

### 4. Run

```bash
# Terminal 1 — API
cd backend
npm start
# or: npm run dev

# Terminal 2 — UI
cd frontend
npm run dev
```

Open the URL shown by Vite (usually `http://localhost:5173`).

## Trial admin

On server start, a verified trial admin is seeded:

| Field    | Value             |
|----------|-------------------|
| Email    | `admin@secops.com` |
| Password | `S3c!9xK2`         |

No OTP is required for this account. New users register via **Create account** and verify with email OTP.

## Typical flow

1. Log in (trial admin or registered user)
2. Select or create an **organization**
3. Upload a JSON array of logs (**Upload Logs**) — up to 10,000 in one request
4. Use search, severity/status filters, column sort, and pagination (all server-side)
5. Select rows → **Mark Fixed** → open **View Fixed** to see the resolved list

## API overview

All log routes require:

- `Authorization: Bearer <token>`
- `x-organization-id: <orgId>`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/register` | Register (sends OTP) |
| POST | `/api/auth/verify-otp` | Verify registration OTP |
| POST | `/api/auth/forgot-password` | Send reset OTP |
| POST | `/api/auth/reset-password` | Reset password with OTP |
| GET | `/api/orgs` | List my organizations |
| POST | `/api/orgs` | Create organization |
| POST | `/api/logs/bulk` | Bulk insert logs (array body) |
| GET | `/api/logs` | List logs (`page`, `limit`, `search`, `severity`, `status`, `resolution`, `sortBy`, `sortOrder`) |
| GET | `/api/logs/stats` | Dashboard stats |
| PUT | `/api/logs/bulk-update` | e.g. mark Fixed |
| DELETE | `/api/logs/bulk-delete` | Delete selected logs |
| POST | `/api/logs/move` | Move logs to another org |

### Bulk upload body example

```json
[
  {
    "action": "LOGIN",
    "actor": "user@example.com",
    "resource": "/api/session",
    "severity": "INFO",
    "status": "SUCCESS",
    "timestamp": "2026-07-24T10:00:00.000Z"
  }
]
```

## Project structure

```
gidy/
├── backend/
│   ├── config/          # DB connection
│   ├── controllers/     # logs, orgs
│   ├── middleware/      # JWT protect
│   ├── models/          # User, Organization, Member, Log
│   ├── routes/
│   ├── scripts/         # seedAdmin
│   ├── utils/           # sendEmail
│   └── server.js
└── frontend/
    └── src/
        ├── components/  # Login, OrganizationSelect, LogTable, ...
        ├── App.jsx
        └── config.js
```

## Notes

- Search, filter, sort, and pagination run on the **server** (`GET /api/logs` query params), not only in the browser.
- Bulk upload inserts in chunks of 2000 for reliability with large payloads (body limit 10mb).
- Fixed logs are filtered with `resolution=FIXED` and shown on a separate dashboard view.
