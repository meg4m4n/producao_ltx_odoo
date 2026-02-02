# Production Module - Foundation

## Project Purpose

This is a production and manufacturing order (OF) management system designed to integrate with Odoo 14 CE logic. Currently, this is a standalone foundation setup that will later be connected to Odoo.

**Current Status:** Step 0 - Foundation

## Project Structure

```
/
├── apps/
│   ├── api/          # Backend REST API (Express.js)
│   └── web/          # Frontend application (React + Vite)
├── database/         # Database schema and migrations (Prisma)
├── docs/             # Documentation
│   └── prompts/      # History of prompts used during development
└── README.md
```

## Technology Stack

- **Backend:** Node.js with Express
- **Frontend:** React with Vite
- **Database:** PostgreSQL (via Supabase)
- **ORM:** Prisma
- **Styling:** Tailwind CSS

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database (configured via environment variables)

## Environment Setup

Create a `.env` file in the root directory with:

```env
DATABASE_URL=postgresql://[user]:[password]@[host]:5432/[database]
PORT=3001
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Installation

Install dependencies for all workspaces:

```bash
npm install
```

## Running the Application

### Start the Backend API

```bash
npm run dev:api
```

The API will be available at `http://localhost:3001`

Test the health endpoint:
```bash
curl http://localhost:3001/health
```

Expected response:
```json
{"status": "ok"}
```

### Start the Frontend

```bash
npm run dev:web
```

The web application will be available at `http://localhost:5173`

## Database

### Initialize Prisma

```bash
npm run db:generate
```

### Run Migrations

```bash
npm run db:migrate
```

**Note:** Currently, the schema is empty. Business tables will be added in future steps.

## Development Notes

- **Step 0 (Current):** Foundation setup complete
- No authentication implemented yet
- No business logic or production order tables yet
- Minimal design and styling
- Ready for incremental development

## Future Integration

This project is being built to integrate with Odoo 14 CE for production management workflows. The integration will be implemented in future steps.
