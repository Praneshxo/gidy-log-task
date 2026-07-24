# Gidyops 

Gidyops is a multi-tenant log analytics and management platform built to ingest, monitor, and manage security events and application logs across different departments or products.

## 🚀 Setup Instructions

### Prerequisites
- Node.js (v18+)
- MongoDB (Local or Atlas)
- Git

### 1. Backend Setup
1. Open a terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure Environment Variables:
   Create a `.env` file in the `backend` directory (if not already present) and add the following:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   SMTP_EMAIL=praneshgara@gmail.com
   SMTP_PASSWORD=your_app_password
   ```
4. Start the server (with auto-reload enabled):
   ```bash
   npm run dev
   ```

### 2. Frontend Setup
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the React application:
   ```bash
   npm run dev
   ```
4. Access the web interface at `http://localhost:5173` (or the port provided by Vite).

---

## 🏗️ Technical Decisions & Architecture Journey

### 1. Multi-Tenant Organization System
**Decision:** We transitioned the app from a single-user data pool to a strict multi-tenant architecture using an `Organization` hierarchy.
**Reasoning & Origin:** This idea was inspired by a freelance ERP project. By implementing organizations, the system becomes highly usable for managing logs across multiple distinct departments, products, or client environments within a single deployment. Data is strictly isolated—users must pass an `x-organization-id` header to view or modify their logs.

### 2. OTP Authentication & User Limits
**Decision:** We implemented a secure, email-based OTP (One Time Password) system for Registration, Login Verification, and Password Resets using `Nodemailer`.
**Reasoning:** To ensure that only verified personnel can access sensitive logs without relying on heavy third-party OAuth providers. We also enforced a hard limit of 5 new users at the database level to maintain control over beta access and prevent spam.

### 3. Bulk Data Processing
**Decision:** Added specialized backend routes for Bulk Upload, Bulk Delete, Bulk Mark-as-Fixed, and Bulk Move.
**Reasoning:** Security logs are often generated in massive JSON arrays. We utilized Mongoose's `insertMany`, `updateMany`, and `deleteMany` to process these arrays in chunks, drastically reducing memory overhead and preventing database timeouts. The "Move to Organization" feature was added to easily migrate logs if they were uploaded to the wrong department.

### 4. High-Performance MongoDB Indexing
**Decision:** Applied compound indexes (`timestamp`, `severity`, `status`) and text-based search indexes (`actor`, `resource`) on the `Log` model.
**Reasoning:** Log tables grow incredibly fast. Without proper indexing, querying "High severity logs from the last 24 hours" would require a full collection scan. The compound indexes ensure that pagination and dashboard aggregations resolve in milliseconds.

### 5. Custom React UI & State Management
**Decision:** Built the frontend using React (Vite) with vanilla CSS and Lucide React icons, avoiding heavy CSS frameworks.
**Reasoning:** We wanted a premium, highly responsive "Glassmorphism" aesthetic that felt fast and professional. By managing state at the top level and passing the `currentOrg` downwards, we ensured that the UI instantly reflects changes when moving between different department dashboards.
---

## 🗂️ Project Structure

```text
gidy/
├── backend/
│   ├── config/          # Database connection settings
│   ├── controllers/     # API logic (authController, logController, orgController)
│   ├── middleware/      # JWT verification & request protection
│   ├── models/          # Mongoose Schemas (User, Organization, Member, Log)
│   ├── routes/          # Express route definitions
│   ├── scripts/         # Utility scripts (e.g., clearLogs.js, seedAdmin.js)
│   ├── utils/           # Helper functions (e.g., sendEmail.js)
│   └── server.js        # Main Express application entry point
│
└── frontend/
    ├── src/
    │   ├── assets/      # Static images and icons
    │   ├── components/  # React UI components (LogTable, UploadModal, Login, etc.)
    │   ├── App.jsx      # Main frontend logic & state management
    │   ├── config.js    # Global constants (API_URL)
    │   └── main.jsx     # React DOM rendering entry point
    └── package.json
```

---

## 🔄 Typical User Flow

1. **Sign Up**: The user registers with their Name, Email, and Password.
2. **Email Verification**: An OTP is sent to the registered email. The user inputs the OTP to activate their account and receive a JWT token.
3. **Organization Selection**: 
   - A new user will see a prompt to **Create an Organization**. 
   - A returning user can click on an existing Organization to enter its specific dashboard.
4. **Data Ingestion**: Inside the organization dashboard, the user clicks "Upload Logs", dragging and dropping a massive JSON payload. The logs are validated locally and pushed in chunks.
5. **Log Management**:
   - The user filters by "High Severity".
   - Selects multiple critical logs using checkboxes.
   - Marks them as **"Fixed"** or moves them to another department/organization for review.
6. **Log Out**: The JWT and local states are cleared securely.

---

## 🎯 Final Thoughts
Every feature planned during our initial check-ins was successfully executed. The platform successfully evolved from a simple log viewer into a robust, multi-tenant operations dashboard exactly as envisioned.
