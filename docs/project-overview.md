# Production Module - Project Overview

## Purpose

This project is a production and manufacturing order (OF) management system designed to integrate with Odoo 14 CE. The goal is to create a modern web application that can interface with Odoo's production workflows while providing an enhanced user experience.

## Current Status: Step 0 - Foundation

This initial phase establishes the project structure and basic infrastructure:

- Monorepo structure with separate frontend and backend
- PostgreSQL database with Prisma ORM
- Basic API with health check endpoint
- React frontend with placeholder

## Architecture

### Backend (apps/api)
- Node.js with Express
- REST API architecture
- Environment-based configuration

### Frontend (apps/web)
- React with Vite
- TypeScript
- Tailwind CSS for styling

### Database (database/)
- PostgreSQL via Supabase
- Prisma ORM for schema management
- Migration-based workflow

## Next Steps

Future development will include:
- Production order data models
- Integration with Odoo 14 CE APIs
- User authentication
- Production workflow UI
- Real-time updates

## Development Philosophy

- Keep it simple and maintainable
- Incremental development in clear steps
- Documentation-first approach
- No over-engineering
