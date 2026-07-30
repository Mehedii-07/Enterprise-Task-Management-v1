# Enterprise Task Manager SaaS Platform

An enterprise-grade, multi-tenant corporate productivity and management application built with **Angular 20+**, **FastAPI**, **SQLAlchemy 2.x**, **PostgreSQL**, and **JWT RBAC Authentication**.

---

## 🌟 Key Architecture & Features

### 1. Multi-Tier Role-Based Access Control (RBAC) Matrix
- **CEO (Super Admin)**: Global unrestricted visibility and CRUD over every organization, project, task, user account, system audit log, and executive dashboard.
- **Admin**: Full management over single company organization, team leads, employees, department budgets, and company performance ranking.
- **Team Lead**: Manage assigned projects, create & assign tasks, review completed work, monitor team performance, and track team leaderboards.
- **Employee**: Dedicated personal workspace with assigned tasks, daily goals, work hours logging, productivity score, and team contribution metrics.

### 2. Modern Angular 20 Frontend Architecture
- **Standalone Components & Angular Signals**: Modern state management without unnecessary boilerplate.
- **Dynamic Role Dashboards**: Context-aware UI rendering for CEO, Admin, Team Lead, and Employee roles.
- **Kanban Board**: Interactive task workflows across 6 status columns (`TODO`, `IN_PROGRESS`, `REVIEW`, `TESTING`, `COMPLETED`, `CANCELLED`).
- **Glassmorphism Design System**: Modern dark-theme styling, micro-animations, and responsive tables.

### 3. FastAPI & SQLAlchemy 2.x Clean Backend Architecture
- **19 Normalized PostgreSQL Entities**: Multi-tenant organizations, departments, roles, permissions, projects, tasks, subtasks, task labels, comments, work logs, activity logs, audit logs, and tokens.
- **Security Protocols**: Bcrypt password hashing, JWT Access & Refresh Token rotation, CORS protection, SQL injection prevention via ORM parameterization, and dependency injection permission guards.
- **Reports Exporters**: Dynamic Excel (`.xlsx`) and CSV report generation for task metrics and employee work logs.

---

## 🚀 Quick Start & Installation

### Option A: Local Development

#### 1. Backend Setup (FastAPI)
The backend uses `uv` for lightning-fast dependency management.

```bash
cd backend

# Create a virtual environment and sync dependencies
uv venv
uv pip install -r requirements.txt

# On Windows, activate the virtual environment:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

# Run FastAPI Server
uvicorn app.main:app --reload --port 8000
```
- API Interactive Swagger Specs: `http://localhost:8000/docs` (Note: The default FastAPI docs path is `/docs`)

#### 2. Frontend Setup (Angular 20)
```bash
cd frontend

# Install node dependencies
npm install

# Start Angular Dev Server
ng serve
```
- Open workspace in browser: `http://localhost:4200`

---

### Option B: Docker Container Deployment

```bash
docker-compose up --build -d
```
This starts:
- **PostgreSQL Database** on port `5432`
- **FastAPI Backend** on port `8000`
- **Angular Nginx Frontend** on port `4200`

---

## 🔑 Pre-seeded Quick Demo Accounts

Upon backend startup, initial roles, default organization, and demo users are automatically seeded into the database:

| Role | Email | Password | Access Scope |
| :--- | :--- | :--- | :--- |
| **CEO (Super Admin)** | `ceo@enterprise.com` | `CeoSuperAdmin123!` | Global Multi-Org Master Control |
| **Admin** | `admin@enterprise.com` | `Admin123!` | Organization Administration |
| **Team Lead** | `lead@enterprise.com` | `Lead123!` | Team & Project Management |
| **Employee** | `emp@enterprise.com` | `Emp123!` | Personal Workspace & Work Logs |

---

## 🧪 Automated Testing

Run the Pytest test suite for backend unit and integration coverage:
```bash
cd backend
python -m pytest
```

---

## 📄 License
Enterprise Proprietary Software - All Rights Reserved.
