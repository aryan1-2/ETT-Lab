# Deployment Process

This document explains how to deploy the full stack application using Docker and Docker Compose inside the Ubuntu Virtual Machine.

The deployment process includes building the Docker containers, starting the services, verifying container execution, and exposing the application to the internet using Cloudflare Tunnel.

---

# Prerequisites

Before deploying the application, ensure the following components are installed:

- Ubuntu Virtual Machine
- Docker
- Docker Compose
- Cloudflared (Cloudflare Tunnel client)

Verify Docker installation:

```bash
docker --version
```

Verify Docker Compose:

```bash
docker compose version
```

---

# Build Docker Containers

Navigate to the project directory and build the Docker images.

```bash
docker compose build
```

This command builds the Docker images for both the **frontend** and **backend** services.

---

# Start Application Services

Start the containers using Docker Compose.

```bash
docker compose up -d
```

The `-d` flag runs the containers in **detached mode**.

This command will start:

- Frontend container (React + Nginx)
- Backend container (Node.js + Express)

---

# Verify Running Containers

Check if the containers are running successfully.

```bash
docker ps
```

You should see both frontend and backend containers listed.

Example output:

```
CONTAINER ID   IMAGE              PORTS
abc123         frontend-image     0.0.0.0:8080->80
def456         backend-image      0.0.0.0:5000->5000
```

---

# Access the Application Locally

Once the containers are running, open the following address in your browser:

```
http://localhost:8080
```

This will load the frontend application.

---

# Expose the Application to the Internet

To make the application accessible from the internet, run the Cloudflare Tunnel command.

```bash
cloudflared tunnel --url http://localhost:8080
```

Cloudflare will generate a public URL similar to:

```
https://example.trycloudflare.com
```

---

# Access the Application Publicly

Open the generated Cloudflare URL in your browser.

Example:

```
https://example.trycloudflare.com
```

Users from anywhere on the internet can access the application using this link.

---

# Deployment Summary

The deployment workflow follows these steps:

1. Build Docker images  
2. Start containers using Docker Compose  
3. Verify containers are running  
4. Access the application locally  
5. Expose the application using Cloudflare Tunnel  
6. Access the application through the generated public URL

This process enables a full stack application to be deployed securely without requiring a public server or port forwarding.