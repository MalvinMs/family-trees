# Kinova — Real-Time Collaborative Genealogy Platform

Kinova is a modern, state-of-the-art genealogy platform that allows multiple users to collaborate in real time on interactive family trees. Built with a sleek Apple/Notion-inspired monochrome aesthetic, the project features a fully responsive diagram canvas, instant collaboration syncing, granular activity timelines, and an archival research discussion feed.

---

## 🚀 Key Features

### 🌳 Core Genealogy Engine
* **Interactive Diagram Canvas**: View, position, drag, and style family member nodes dynamically on a responsive canvas powered by React Flow.
* **Complex Graph Relationships**: Connect members through custom-labeled lineage lines (e.g., Parent-Child, Spouses, Adoptive, etc.) with custom color profiles.
* **Extensible Schema**: Customize person profiles on-the-fly with custom fields.

### 👥 Phase 2 Collaboration & Sync System
* **Granular Role Permissions**: Share family trees with collaborators as `Viewer` (read-only) or `Editor` (write access).
* **SSE Real-Time Sync**: Instantly propagate updates (member additions, relationship edits, comments) across all active collaborator tabs using highly responsive, non-blocking Server-Sent Events (SSE).
* **Archival Research Comments**: Leave focused discussion threads and research logs on specific family nodes to coordinate historical discovery.
* **Activity Audit Trail**: Keep a clear, filterable timeline of who added, edited, or deleted nodes and relationships within each tree.

---

## 🛠️ Architecture & Tech Stack

The application is fully containerized using **Docker** and orchestrated using **Docker Compose**:

* **Frontend**: Next.js (TypeScript) + React Flow + Zustand (State Management)
* **Backend**: Laravel (PHP 8.4) API with Sanctum (Token Authentication)
* **Database**: PostgreSQL (Data Persistence with full UUID schemas)
* **Caching & Real-time Queue**: Redis (Non-blocking SSE event polling)

---

## ⚡ Quick Start (Docker Setup)

You can launch the entire ecosystem in development mode with a single command. 

### 1. Prerequisite
Make sure you have **Docker** and **Docker Compose** installed on your machine.

### 2. Startup Containers
Run the following command from the project root:
```bash
docker compose up --build -d
```
This spins up:
* **Frontend app** at `http://localhost:3000`
* **Laravel backend API** at `http://localhost:8000`
* **PostgreSQL database** on port `5432`
* **Redis server** on port `6379`

### 3. Database Migration & Seeding
To set up all the tables and seed default users:
```bash
docker compose exec backend php artisan migrate:fresh --seed
```

#### Default Credentials:
* **Admin / Creator Account**: `admin@kinova.com` / `password`

---

## 💡 Key Dev Optimizations Implemented

* **CORS & JSON Validation Security**: The Laravel API gracefully intercepts validation failures and missing tokens, returning correct `401 Unauthorized` JSON responses rather than redirecting, keeping the frontend seamlessly in sync.
* **High-Concurrency SSE Workers**: Designed with `PHP_CLI_SERVER_WORKERS=10` inside the Laravel container environment. This allows `php artisan serve` to process the persistent, real-time SSE stream asynchronously on separate workers, ensuring that everyday API requests load **instantly** (under 50ms) rather than queuing.
* **Lightweight SSE Polling**: Replaced blocking `Redis::subscribe` loops in PHP with a non-blocking `Redis::lpop()` queue polling mechanism, preventing socket lockups while preserving real-time (sub-2-second) update propagation.
