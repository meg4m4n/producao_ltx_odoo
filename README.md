# Production Module - Foundation

## Project Purpose

This is a production and manufacturing order (OF) management system designed to integrate with Odoo 14 CE logic. Currently, this is a standalone foundation setup that will later be connected to Odoo.

**Current Status:** Slice 2A - Basic UI for Production Orders

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

## Features

### Production Orders Management

- **List View** (`/production`):
  - Table displaying all production orders
  - Visual state indicators:
    - Red highlight for orders with `issue` state
    - Green highlight for completed orders (`produced`, `invoiced`, `shipped`)
  - Client-side filtering by state
  - Click any row to view details

- **Create Order**:
  - Modal form accessible from list view
  - Required field: OF code
  - Optional fields: sale reference, customer name, delivery requested date
  - Automatic redirect to detail view after creation

- **Detail View** (`/production/:id`):
  - Display all order header information
  - Edit order details (excluding state, which is auto-managed)
  - Navigate back to list view

## Database

### Initialize Prisma

```bash
npm run db:generate
```

### Run Migrations

```bash
npm run db:migrate
```

### API Testing

See `docs/curl.md` for comprehensive API usage examples.

## Development Notes

- **Slice 2A (Current):** Basic UI for production orders
  - List view with state-based visual indicators
  - Create new production orders
  - View and edit production order details
  - Client-side state filtering

- **Completed:**
  - Step 0: Foundation setup
  - Step 1: Database schema and API endpoints for production orders, lines, sizes, and anomalies
  - Slice 2A: Minimal UI for production order management

- **Next Steps:**
  - Add UI for managing production order lines
  - Add UI for managing sizes
  - Add UI for anomaly tracking
  - Implement authentication

- No authentication implemented yet
- Minimal design and styling (functional focus)

## Future Integration

This project is being built to integrate with Odoo 14 CE for production management workflows. The integration will be implemented in future steps.
