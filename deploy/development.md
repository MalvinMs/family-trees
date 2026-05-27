# Kinova Local Development Environment Setup

This guide provides a comprehensive step-by-step walkthrough to set up the Kinova full-stack development environment locally using Docker and Docker Compose.

---

## 🛠️ System Prerequisites

Ensure you have the following software installed on your machine before beginning:
1. **Docker Desktop** (or Docker Engine on Linux): [Get Docker](https://www.docker.com/products/docker-desktop/)
2. **Git**: [Get Git](https://git-scm.com/)
3. **PowerShell** (Windows) or **Bash** (macOS/Linux)

Verify your Docker Compose availability:
```bash
docker compose version
```

---

## 💻 Step-by-Step Setup

### 1. Clone the Repository
Clone the repository to your local computer and navigate into the root directory:
```bash
git clone https://github.com/MalvinMs/family-trees.git
cd family-trees
```

### 2. Configure Environmental Variables
Copy the default environmental settings file for the backend:
```bash
# On macOS/Linux
cp backend/.env.example backend/.env

# On Windows (PowerShell)
copy backend/.env.example backend/.env
```

*(Note: The default `.env` configuration is pre-configured to connect instantly to the Docker development Postgres and Redis containers without any modifications.)*

---

## 🚀 Orchestrating the Stack

We provide utility scripts to control the multi-container stack easily.

### Option A: The Full Automated Setup (Recommended)
This script completely cleans the Docker state, builds all containers, runs fresh migrations, and seeds the PostgreSQL database with an initial dummy tree and user profile.
```bash
# On Windows (PowerShell)
.\rebuild-stack.sh

# On macOS/Linux/Git Bash
chmod +x rebuild-stack.sh
./rebuild-stack.sh
```

### Option B: The Multi-Environment Orchestrator
We use the `./dc` tool (Bash) or `.\dc.ps1` (PowerShell on Windows) to launch environment profiles:
```bash
# Start Development Containers
./dc dev up -d --build

# Stop Development Containers
./dc dev down
```

---

## 🔍 Verification & Host Port Bindings

Once the stack is successfully built and launched, you can access individual services:

* **Vite React Frontend Client**: `http://localhost:3000` (or `http://localhost:5173` via local npm run dev)
* **Laravel Backend API REST Services**: `http://localhost:8000`
* **Zustand Echo WebSockets (Reverb)**: `ws://localhost:8080`
* **Admin Login Details**:
  - Email: `admin@kinova.com`
  - Password: `password`

---

## 📦 Container Services Schema

The development orchestrator spins up the following local containers:

1. **`kinova_frontend`** (Node.js/Vite/React Flow canvas workspace)
2. **`kinova_backend`** (PHP-FPM/Laravel 11 REST API engine)
3. **`kinova_reverb`** (Laravel Reverb high-performance WebSocket server)
4. **`kinova_queue`** (Laravel background Redis queue listener worker)
5. **`kinova_postgres`** (PostgreSQL 16 relational database engine)
6. **`kinova_redis`** (Redis in-memory caching and queuing broker)

To view real-time container log output:
```bash
docker compose -f docker-compose.dev.yml logs -f
```
