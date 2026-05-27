# Kinova — Real-Time Collaborative Genealogy Platform

Kinova is a premium, state-of-the-art genealogy platform that allows multiple users to collaborate in real-time on interactive, highly customizable family trees. Designed with a sleek, minimalist Apple- and Notion-inspired monochrome/sage green aesthetic, the project features a fully responsive diagram workspace canvas, instant WebSockets/SSE collaboration syncing, granular activity timelines, an archival research discussion feed, and a complete unauthenticated public portal.

---

## 🚀 Implemented Features

The following features have been fully implemented and integrated across the frontend, backend, and database layers:

### 🌳 Core Genealogy & Dynamic Graph Engine
* **Interactive Diagram Canvas**: View, position, drag, and style family member nodes dynamically on a high-performance canvas powered by **React Flow**. Coordinates are debounced and persisted instantly to the database.
* **Complex Graph Relationships**: Connect members through custom-labeled lineage lines (e.g., *Parent*, *Spouse*, *Sibling*, *Adopted*, *Guardian*, *Step Parent*) with beautiful edge visualizations.
* **Dynamic Schema Engine**: Customize person profiles on-the-fly. Create dynamic custom fields (text, date, dropdowns, etc.) stored as unified JSONB payload blocks inside the database.
* **Erase Lineage**: A premium, branded **Erase Tree** alert dialog styled with our signature **Sage Green** theme colorway to safely clear files and relational records.

### 🔄 Import & Export Systems (Backup Archives)
* **JSON Archives Export**: Download the entire family tree, including custom dynamic fields, coordinate positions, profiles, and relationships in a standardized JSON backup structure.
* **JSON Archive Import**: Restore family tree archives. Features a robust **relational ID re-mapping engine** that automatically translates old node/relationship links to newly created database UUIDs to prevent conflicts.

### 👥 Real-Time Collaboration & Syncing
* **Broadcasting & Websockets**: Integrated with **Laravel Reverb (WebSockets)** and **Laravel Echo** for instant delta sync updates (member additions, relationship edits, comments) across all active collaborator canvases.
* **Fallback SSE Engine**: A non-blocking Server-Sent Events (SSE) stream powered by Redis queue polling as a secondary synchronization protocol.
* **Granular RBAC System**: Share family trees with collaborators as `Viewer` (read-only layout, disabled editing handles) or `Editor` (write access).

### 📖 Archival Memoirs & Research Feed
* **Notion-Inspired Drawer**: Click nodes to open a sliding memoir drawer showing dynamic vital stats, biographies, and a chronological dynastic timeline (Birth, marriage, departure, and currently living).
* **Research Discussion Feed**: Collaborative comment threads attached to individual family nodes, allowing clans to co-author historical logs.
* **Activity Audit Feed**: A filterable sliding history drawer logging detailed timeline entries of who added, edited, or deleted nodes and relationships within each tree.

### 🌐 Public Archival Pages & Share Controls
* **Unauthenticated Reader Workspace**: An unauthenticated, lightweight public view available at `/public/trees/[id]` for guests. Draggable features, connections, and edits are strictly disabled, while maintaining active theme settings, memoirs, timeline, and quick search.
* **Share Modal Share Link Controller**: Fully integrated **"Make Tree Public" toggle switch** and **"Copy Link" utilities** directly into the owner's sharing menu. Generates shareable, read-only URLs copyable with a single click.

---

## 🛠️ Architecture & Tech Stack

The application is containerized using **Docker** and orchestrated via **Docker Compose**:

* **Frontend**: Next.js (TypeScript) + React Flow + Zustand (State Management) + Tailwind CSS (Notion/Apple Warm-Archival Aesthetic)
* **Backend**: Laravel 11 / PHP 8.4 API with Sanctum (Token Auth) & Laravel Reverb (WebSockets)
* **Database**: PostgreSQL 16 (Full UUID schema structure)
* **Caching & Queue**: Redis (Non-blocking SSE and job queue management)

---

## ⚡ Quick Start (Docker Setup)

You can launch the entire ecosystem in development mode with a single command.

### 1. Prerequisite
Make sure you have **Docker** and **Docker Compose** installed on your machine.

### 2. Startup Containers
Run the following script from the project root to pull down containers, build assets, and launch services:
```bash
./rebuild-stack.sh
```
*Or, on Windows PowerShell:*
```powershell
.\rebuild-stack.sh
```

This spins up and automatically configures:
* **Frontend Web App**: `http://localhost:3000`
* **Laravel Backend API**: `http://localhost:8000`
* **Laravel Reverb Server**: Port `8080`
* **PostgreSQL Database**: Port `5432`
* **Redis Cache & Queue**: Port `6379`

### 3. Database Migration & Seeding
If you run `./rebuild-stack.sh`, migration and seeding are completed automatically. For manual database refreshes, run:
```bash
docker compose exec backend php artisan migrate:fresh --seed
```

#### Default Credentials:
* **Admin Account**: `admin@kinova.com`
* **Password**: `password`

---

## 💡 Key Performance Optimizations

* **Laravel Reverb Routing**: Backend-to-backend socket dispatches utilize Docker internal network DNS (`reverb:8080`), while the Next.js client establishes browser websocket bridges directly to `localhost:8080`.
* **CORS & JSON Validation Security**: The Laravel API gracefully intercepts validation failures and missing tokens, returning correct `401 Unauthorized` JSON responses rather than redirecting, keeping the frontend client in sync.
* **High-Concurrency SSE Workers**: Configured with `PHP_CLI_SERVER_WORKERS=10` inside the Laravel container environment. This allows `php artisan serve` to process the persistent, real-time SSE stream asynchronously, ensuring that everyday API requests load **instantly** (under 50ms) rather than queuing.
* **Lightweight SSE Polling**: Replaced blocking `Redis::subscribe` loops in PHP with a non-blocking `Redis::lpop()` queue polling mechanism, preventing socket lockups while preserving real-time (sub-2-second) update propagation.
