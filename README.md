# PARK

PARK is a digital academic coordination platform designed to simplify tertiary institution supervision, student management, and institutional workflow tracking in one secure system.

It brings together the administrative structure of academic departments with the operational needs of students, supervisors, coordinators, and administrators. Instead of relying on fragmented spreadsheets, email threads, and manual follow-up, PARK creates a unified system where academic relationships, chapter submissions, meeting records, repository content, communication, and performance tracking live in one place.

## The Problem It Solves

Universities and academic departments often struggle with disconnected processes for:

- assigning and managing student-supervisor relationships
- coordinating departmental oversight across multiple roles
- tracking submissions, meetings, and student progress
- managing institutional records and communication
- ensuring role-based access and accountability

This leads to delays, confusion, inconsistent record-keeping, and poor visibility for both staff and students.

## What PARK Does

PARK is built around a role-based academic operating model. It supports:

- student and supervisor onboarding
- institutional and departmental management
- supervisor-student pairing and relationship tracking
- role-based permissions for admin, coordinator, supervisor, and student users
- meeting and communication workflows
- repository and document management
- chapter and submission-related tracking
- dashboard visibility for institutional oversight
- secure, auditable digital records for academic operations

## Core Solution Approach

The platform uses a modern full-stack architecture:

- FastAPI backend for APIs, authentication, authorization, and business logic
- PostgreSQL/Supabase for persistent and structured data storage
- React + Vite + Tailwind on the frontend for responsive user experience
- Pydantic validation and strict role checks to keep data integrity and access control reliable
- Cloudinary-backed file handling for academic documents and uploads
- structured backend services to organize workflows into cleaner, maintainable modules

This makes the system both practical for academic administration and robust enough to scale into more advanced operations such as review flows, dashboards, and automated administrative tasks.

## Key Product Modules

### 1. Academic Registry and User Management
PARK supports institutions, departments, and user roles as first-class entities. This enables a clean hierarchy where each user belongs to a department and institution, and actions are governed by permissions rather than ad hoc decisions.

### 2. Supervisor-Student Pairing
The pairing system manages student-supervisor relationships and supports structured workflows for allocation, review, and administrative oversight. It serves as the core operational registry for the academic journey.

### 3. Meetings and Academic Coordination
The platform supports meeting records, communication, and coordination between students and supervisors, bringing academic management into a single working system.

### 4. Repository and Document Handling
Academic artifacts, chapter submissions, and related files can be stored and organized within the platform, reducing reliance on external tools and improving traceability.

### 5. Governance, Auditability, and Security
The solution emphasizes secure access control, validation, and monitoring. Role-based permissions, authenticated requests, secure configuration, and structured error handling help create a trustworthy institutional system.

## Technology Stack

- Backend: FastAPI, Python, SQLAlchemy
- Database: PostgreSQL via Supabase
- Frontend: React, TypeScript, Vite, Tailwind CSS
- Authentication: Supabase Auth + JWT-based backend verification
- File/Media: Cloudinary
- Validation: Pydantic
- Architecture: modular service-oriented backend with role-aware APIs

## Why This Idea Matters

PARK is not just a CRUD app; it is an institutional workflow platform for academic administration. Its purpose is to reduce friction in one of the most important but overlooked operational systems in universities: the coordination and tracking of supervision, progress, and academic records.

The real value is in making academic coordination transparent, scalable, and accountable while improving the experience for administrators, supervisors, and students.

## Project Structure

- backend/ — FastAPI application, models, routers, services, and configuration
- frontend/ — React interface for users and administrators
- docs/ — design and planning documentation
- scripts/ — setup and database bootstrap utilities

## Getting Started

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn backend.app.main:app --reload --app-dir ..
```

Run a Celery worker alongside the API for user bulk imports:
```bash
celery -A app.jobs.celery_app:celery_app worker --loglevel=INFO
```
On Windows development environments, add `--pool=solo`. The API and worker must share `REDIS_URL`, `JWT_SECRET`, and, if configured, `BULK_IMPORT_ENCRYPTION_KEY`.

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Environment Setup
Create and configure your environment variables for Supabase, PostgreSQL, Redis, and Cloudinary before starting the backend. For HS256 Supabase access tokens, `JWT_SECRET` must match the Supabase Auth signing secret; asymmetric Supabase tokens are verified with the project JWKS. Use strong secrets and keep the API and worker configuration in sync.

## Intended Vision

PARK is designed as a foundation for a broader academic management ecosystem. The current implementation establishes the core registry, authorization, and coordination layers, and it is structured so future modules can expand into chapter review, performance tracking, announcements, and deeper institutional analytics.

---

PARK is positioned as a practical digital infrastructure layer for academic institutions that want better oversight, clearer coordination, and more reliable student-supervisor management.
