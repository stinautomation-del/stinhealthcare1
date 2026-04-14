# MediSync Pro

> **A comprehensive hospital medicine reminder system for managing patient medication schedules, clinical workflows, and automated delivery across SMS and WhatsApp channels.**

## Overview

MediSync Pro is an enterprise-grade healthcare application designed to streamline medication reminders and patient care coordination. Built with modern web technologies and cloud infrastructure, it provides role-based access for doctors, nurses, head nurses, and administrators to manage patients, prescriptions, automated reminders, daily schedules, and escalation workflows in a HIPAA-aware environment.

The system features automatic reminder delivery via SMS/WhatsApp with configurable scheduling, real-time updates, comprehensive audit logging, and built-in templating for multilingual communication across English, Tamil, and Hindi.

---

## Key Features

### Clinical Management
- **Patient Registry**: Complete patient profiles with emergency contacts, allergies, and language preferences
- **Prescription Management**: Prescriptions with flexible dosing schedules (OD, BD, TDS, QID, Custom)
- **Schedule Tracking**: Daily medication schedules with acknowledgment and escalation workflows
- **Escalation System**: Automatic escalation for missed doses with audit trail

### Reminder Workflows
- **Automated Reminders**: Email/SMS/WhatsApp delivery with per-minute cron scheduling
- **Message Templates**: Pre-designed multilingual templates (EN, TA, HI) with dynamic variable substitution
- **Delivery Channels**: Support for SMS, WhatsApp, or combined delivery
- **Retry Policy**: Configurable retry logic with exponential backoff for failed messages
- **History Tracking**: Complete history of sent, delivered, failed, and cancelled reminders

### Access Control & Security
- **Role-Based Access Control**: Admin, Doctor, Head Nurse, Nurse roles with granular permissions
- **Row-Level Security**: RLS policies enforced at database level
- **Audit Logging**: Complete action audit trail with user attribution and timestamps
- **Environment Isolation**: Support for development, staging, and production configurations

### User Experience
- **Responsive Dashboard**: Optimized for desktop and tablet clinical workflows
- **Real-time Updates**: Supabase realtime subscriptions for live data synchronization
- **Multilingual Support**: UI and message templates in English, Tamil, and Hindi
- **Timezone Handling**: Automatic local-to-UTC conversion for global deployment

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend Framework** | React 19, TypeScript |
| **Build Tool** | Vite |
| **State Management** | Zustand with persistence |
| **Forms & Validation** | React Hook Form + Zod |
| **UI Components** | Radix UI, Tailwind CSS, Lucide React |
| **Backend / Database** | Supabase (PostgreSQL 17, PostgREST, Auth) |
| **Messaging** | Twilio (SMS + WhatsApp) |
| **Scheduling** | pg_cron + pg_net (PostgreSQL extensions) |
| **Deployment** | Docker, Cloud Run, or traditional VPS |

---

## Project Structure

```
.
├── src/
│   ├── components/          # React components (UI & features)
│   │   ├── auth/            # Authentication flows
│   │   ├── dashboard/       # Dashboard & analytics
│   │   ├── patients/        # Patient management
│   │   ├── prescriptions/   # Prescription workflows
│   │   ├── nurse-reminders/ # Reminder scheduler & history
│   │   ├── schedule/        # Daily schedule views
│   │   ├── settings/        # Admin settings & audit logs
│   │   └── ui/              # Shared UI primitives
│   ├── services/            # Supabase API clients & wrappers
│   ├── store/               # Zustand state stores
│   ├── lib/                 # Utilities, validators, helpers
│   ├── types/               # TypeScript interface definitions
│   └── hooks/               # Custom React hooks
├── supabase/
│   ├── scripts/             # SQL migration & setup scripts
│   └── functions/           # Edge functions (reminder processing)
├── public/                  # Static assets
├── vite.config.ts           # Vite configuration
├── tailwind.config.js       # Tailwind CSS theme
└── tsconfig.json            # TypeScript configuration
```

---

## Prerequisites

- **Node.js**: 18.0 or higher
- **npm**: 9.0 or higher
- **Supabase Project**: Active project with PostgreSQL database
- **Twilio Account** (optional): For SMS/WhatsApp delivery
- **Git**: For version control

---

## Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/fearless-27/Hospital-Medicine-Reminder-System.git
cd Hospital-Medicine-Reminder-System
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root by copying `.env.example`:

```bash
cp .env.example .env
```

Fill in the required values:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...

# Supabase Admin (Service Role)
SUPABASE_PROJECT_REF=YOUR_PROJECT_ID
SUPABASE_ACCESS_TOKEN=sbp_...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SERVICE_ROLE_KEY=sb_secret_...

# Twilio Configuration (SMS & WhatsApp)
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_SMS_FROM=+15551234567
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
TWILIO_DEFAULT_COUNTRY_CODE=+91

# Alternative: Twilio API Key Authentication (instead of Auth Token)
# TWILIO_API_KEY_SID=SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# TWILIO_API_KEY_SECRET=your_api_key_secret

# Reminder Processing
FUNCTIONS_INVOKE_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
ENABLE_RETRY_POLICY=false  # Enable when ready for retry logic
```

**⚠️ Security**: Never commit `.env` to version control. Use `.env.example` as a template.

### 4. Initialize Supabase Database

Apply SQL scripts in `supabase/scripts/` using the Supabase SQL Editor:

```bash
# Execute in order:
1. schema.sql              # Create tables and indexes
2. production_rls.sql      # Enable Row-Level Security
3. audit_logs.sql          # Create audit logging tables
4. system_config.sql       # Initialize system settings
5. realtime_config.sql     # Enable realtime subscriptions (optional)
```

### 5. Enable Automated Reminder Processing

**This step is MANDATORY for reminders to send automatically.**

Run in Supabase SQL Editor:

```sql
-- Execute supabase_enable_due_reminder_cron.sql
-- This creates a pg_cron job that processes due reminders every minute
```

Verify the job is active:

```sql
SELECT jobid, jobname, schedule, active 
FROM cron.job 
WHERE jobname = 'process-due-reminders-every-minute';
```

Expected output: Row with `active = true` and `schedule = '* * * * *'`

### 6. Run the Development Server

```bash
npm run dev
```

The application will start at `http://localhost:5173`

---

## Development

### Available Scripts

```bash
# Start development server with hot-reload
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Run ESLint
npm run lint

# Type-check TypeScript
npx tsc --noEmit
```

### Code Quality

- **TypeScript**: Strict mode enabled for type safety
- **ESLint**: Enforces code standards and best practices
- **Zod**: Runtime type validation for API responses
- **React Hook Form**: Form state management with minimal re-renders

---

## Database Architecture

### Core Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User accounts (Admin, Doctor, Head Nurse, Nurse) |
| `patients` | Patient demographics and preferences |
| `prescriptions` | Medication orders with frequency and duration |
| `schedule_entries` | Daily medication schedules with status tracking |
| `nurse_reminders` | Automated reminders with delivery tracking |
| `escalations` | Missed dose escalation workflows |
| `audit_logs` | Complete action audit trail |
| `message_templates` | Multilingual message templates |

### Key Fields

- **Timestamp Fields**: All timestamps stored in UTC; frontend handles timezone conversion
- **Status Tracking**: Reminders tracked through: `pending` → `sent` → `delivered` (or `failed`)
- **Audit Trail**: Every action recorded with user ID, role, timestamp, and change details

---

## Reminder Processing

### How Automatic Reminders Work

1. **Scheduling** (Frontend): User creates a reminder with local date/time
2. **Storage** (Backend): Time converted to UTC and stored in `nurse_reminders` table
3. **Processing** (pg_cron): Every minute, a database function checks for due reminders
4. **Invocation** (Edge Function): Due reminders trigger `process-due-reminders` function
5. **Delivery** (Twilio): Message sent via SMS/WhatsApp to patient's number
6. **Tracking** (Database): Status updated to `sent`, `delivered`, or `failed`

### System Flow Diagram

```mermaid
flowchart TD
   A[User schedules reminder<br/>(Frontend)] --> B[Reminder stored in Supabase<br/>(nurse_reminders table)]
   B --> C[pg_cron checks for due reminders<br/>every minute]
   C --> D[Edge Function<br/>(process-due-reminders)]
   D --> E[Twilio API<br/>(SMS/WhatsApp)]
   E --> F[Patient receives message]
   E --> G[Delivery status updated<br/>in database]
   G --> H[Status visible in UI<br/>(History, Escalations)]
```

### Timezone Example

**Browser local time**: 14:30 IST (UTC+5:30)  
**Database storage**: 09:00 UTC  
**Cron check**: Every minute at `:00` UTC  
**Delivery**: Happens when server time ≥ 09:00 UTC

### Manual Trigger

Administrators can manually process due reminders immediately via the "Run Due Reminders Now" button in Settings, bypassing the cron schedule.

---

## Deployment

### Environment Requirements

- PostgreSQL 17 or higher (via Supabase)
- Node.js 18+ runtime
- Twilio account for SMS/WhatsApp (optional)

### Vercel Deployment (Recommended)

This application is configured for zero-config Vercel deployment with SPA routing support via `vercel.json`.

#### 1. Import Repository

1. Open Vercel dashboard
2. Click **Add New Project**
3. Import `fearless-27/Hospital-Medicine-Reminder-System`
4. Keep framework preset as **Vite**

#### 2. Build Settings

Use the following values (auto-detected in most cases):

- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

#### 3. Configure Environment Variables

Add these in Vercel Project Settings -> Environment Variables:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_jwt
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
```

Do not add server-only secrets to Vercel for this frontend deploy, such as:

- `SUPABASE_SERVICE_ROLE_KEY`
- `SERVICE_ROLE_KEY`
- `TWILIO_AUTH_TOKEN`

Those secrets belong in Supabase Edge Functions/Secrets, not in client hosting.

#### 4. Deploy

Click **Deploy**. Vercel will build and publish the app.

#### 5. Post-Deploy Verification

1. Open `/` and confirm the app shell loads
2. Refresh a deep route (for example `/dashboard`) and confirm no 404 appears
3. Confirm login/API reads work with Supabase
4. Verify reminder sending still works (handled by Supabase Functions, not Vercel)

### Other Deployment Options

#### Option 1: Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

#### Option 2: Traditional VPS / Cloud Run

Deploy as a standard Node.js application with environment variables configured.

---

## Troubleshooting

### Reminders Not Sending

**Symptom**: Reminders stay in `pending` status indefinitely

**Solution**:
1. Verify cron job is active in Supabase:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'process-due-reminders-every-minute';
   ```
2. Check edge function logs in Supabase dashboard
3. Verify `FUNCTIONS_INVOKE_JWT` env variable is set
4. Confirm Twilio credentials are valid

### Authentication Issues

**Symptom**: "Unauthorized" or login failures

**Solution**:
1. Clear browser cache and localStorage
2. Verify `VITE_SUPABASE_ANON_KEY` is correct
3. Check Supabase Auth settings allow Email/Password login

### Timezone Mismatches

**Symptom**: Reminders sent at incorrect times

**Solution**:
1. Verify browser timezone settings
2. Check database stores times in UTC (not local)
3. Confirm cron schedule uses UTC time

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes with clear commit messages
4. Push to your fork: `git push origin feature/your-feature`
5. Submit a pull request with description of changes

### Code Standards

- Use TypeScript for all new code
- Follow existing naming conventions
- Add JSDoc comments for complex functions
- Ensure ESLint passes: `npm run lint`
- Write guard clauses; avoid deep nesting

---

## Security & Compliance

- **Data Encryption**: All data transmitted over HTTPS
- **Row-Level Security**: RLS policies enforce data access boundaries
- **Audit Logging**: Complete audit trail for compliance audits
- **Secrets Management**: Sensitive configuration via environment variables
- **Input Validation**: Zod schemas validate all user input

---

## Performance Optimization

- **Code Splitting**: Vite enables automatic code splitting
- **Database Indexing**: Strategic indexes on frequently queried columns
- **Webhook Delivery**: Batch processing of reminders reduces API load
- **Caching**: Zustand persisted store for offline resilience

---

## License

This project is provided as-is for healthcare management use. Review and customize as needed for your institution's compliance requirements (HIPAA, GDPR, etc.).

---

## Support & Documentation

- **Supabase Docs**: https://supabase.com/docs
- **React Docs**: https://react.dev
- **Tailwind CSS**: https://tailwindcss.com
- **Twilio Docs**: https://www.twilio.com/docs

---

## Changelog

### v1.0.0 (Latest)
- Automatic reminder scheduling with cron-based delivery
- Multilingual message templates (EN, TA, HI)
- SMS and WhatsApp channel support
- Complete audit logging and history tracking
- Role-based access control with RLS
- Responsive clinical dashboard
- Production-ready deployment configurations
