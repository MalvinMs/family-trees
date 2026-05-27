# Kinova CI/CD Pipeline Setup Guide (GitHub Actions)

This document describes how to set up the automated Continuous Deployment (CD) pipeline for your Kinova backend stack. When a developer pushes new commits to the `main` branch, GitHub Actions will securely log in to your VPS via SSH and trigger the automated `deploy.sh` script.

---

## 🛠️ Pipeline Architecture Flow

```mermaid
graph LR
    Dev[Developer] -- "git push" --> GitHub[GitHub Repository]
    
    subgraph GitHub Actions Runner
        GitHub -- "Triggers Push event" --> Workflow[Backend Production CD]
        Workflow -- "Establishes secure SSH connection" --> SSH[SSH Step]
    end
    
    subgraph Production VPS
        SSH -- "Executes script" --> DeploySH[deploy.sh]
        DeploySH -- "Pulls code & rebuilds" --> Docker[Docker Compose]
    end
```

The workflow is defined inside [.github/workflows/deploy.yml](file:///.github/workflows/deploy.yml) and is triggered strictly when files under `backend/`, `docker-compose.prod.yml`, `deploy.sh`, or the workflow file itself are modified on the `main` branch.

---

## 🔑 Step 1: Generate SSH Keys on the VPS

To allow GitHub Actions to safely log in to your VPS, you need to set up SSH key-based authentication.

1. Connect to your VPS:
   ```bash
   ssh ubuntu@YOUR_VPS_IP
   ```
2. Generate a new SSH key pair inside the VPS or on your local machine (press enter to select default path and leave passphrase empty):
   ```bash
   ssh-keygen -t ed25519 -C "github-actions-deploy"
   ```
3. Append the newly generated **public key** to the `authorized_keys` file to authorize this key:
   ```bash
   cat ~/.ssh/id_ed25519.pub >> ~/.ssh/authorized_keys
   chmod 600 ~/.ssh/authorized_keys
   chmod 700 ~/.ssh
   ```
4. Output the **private key** content and copy it to your clipboard:
   ```bash
   cat ~/.ssh/id_ed25519
   ```

---

## 🔒 Step 2: Inject Secrets in GitHub Repository

For security, sensitive variables are stored inside **GitHub Actions Secrets** so they are never hardcoded in the codebase.

1. Go to your **GitHub Repository** -> **Settings** -> **Secrets and variables** -> **Actions**.
2. Click **New repository secret** and add the following four secrets:

| Secret Name | Value Example | Description |
| :--- | :--- | :--- |
| `SSH_HOST` | `152.42.23.45` | Your VPS public IP address |
| `SSH_USERNAME` | `ubuntu` | The system username used to log in to the VPS |
| `SSH_PRIVATE_KEY` | `-----BEGIN OPENSSH PRIVATE KEY-----...` | The entire private key text copied in **Step 1 (number 4)** |
| `SSH_PORT` | `22` | The SSH connection port (defaults to `22` if left empty) |

---

## ⚡ Step 3: Verify the Pipeline

1. Make a small code change in the backend (e.g., add a comment) or push the new CI/CD workflow configuration:
   ```bash
   git add .
   git commit -m "chore(cicd): finalize GitHub Actions CD pipeline"
   git push origin main
   ```
2. Navigate to the **Actions** tab inside your GitHub repository.
3. You will see the **Kinova Backend Production CD** workflow run in real-time.
4. Once completed successfully, the runner outputs the terminal logs of your VPS executing `deploy.sh` and migrating/building your containers automatically!
