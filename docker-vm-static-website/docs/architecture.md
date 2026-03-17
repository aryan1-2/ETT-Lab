# System Architecture

The application follows a **containerized architecture** deployed inside a **Virtual Machine**.  
Docker containers are used to run the frontend and backend services, and the application is exposed to the internet using **Cloudflare Tunnel** without requiring a public IP address.

---

## Architecture Diagram

```text
                Internet Users
                       |
                Cloudflare Tunnel
                       |
              Ubuntu Virtual Machine
                       |
                   Docker Engine
                       |
        ┌──────────────┴──────────────┐
        |                             |
Frontend Container             Backend Container
 (React + Nginx)              (Node.js + Express)
        |                             |
        |                             |
        └───────────────┬─────────────┘
                        |
                   MongoDB Atlas
```

---

## Components

### Virtual Machine

The entire environment runs inside an **Ubuntu virtual machine** created using **VirtualBox**.

This virtual machine provides an isolated infrastructure environment where Docker containers can run independently from the host system. Virtualization allows easier management, testing, and deployment of the application.

---

### Docker Containers

Docker is used to containerize the application components. Containers allow applications to run in a consistent environment regardless of where they are deployed.

The application is divided into two main containers.

---

### Frontend Container

Technologies used:

- React
- Vite
- Nginx

Responsibilities:

- Serves the React web application
- Delivers static frontend assets
- Routes API requests to the backend service
- Handles user interface interactions

Nginx acts as the web server inside this container and delivers the built React application efficiently.

---

### Backend Container

Technologies used:

- Node.js
- Express.js

Responsibilities:

- Provides REST API endpoints
- Handles authentication and user requests
- Processes application logic
- Integrates external services and APIs

The backend processes requests received from the frontend container and communicates with the database.

---

### Reverse Proxy

Nginx inside the frontend container works as a **reverse proxy**.

It forwards specific requests from the frontend to the backend container.

Example routing:

```
/api/login → Backend API
/api/chat  → Backend API
```

This architecture eliminates cross-origin issues and simplifies communication between services.

---

### Database

The application uses **MongoDB Atlas**, which is a managed cloud-based NoSQL database.

Responsibilities of the database include:

- Storing application data
- Managing user records
- Persisting system information

Using a cloud database removes the need to host a local database server inside the VM.

---

### Cloud Service Integration

The backend integrates several external cloud services including:

- MongoDB Atlas for database storage
- Cloudinary for media storage
- HuggingFace API for AI model access
- OpenAI API for advanced AI features

These services enhance the functionality of the application and enable advanced capabilities.

---

### Public Internet Access

The application is exposed to the internet using **Cloudflare Tunnel**.

Cloudflare Tunnel creates a secure connection between the public internet and the local server running inside the virtual machine.

Example public access URL:

```
https://example.trycloudflare.com
```

Benefits of Cloudflare Tunnel:

- No public IP address required
- Secure HTTPS access
- Simplified deployment and networking

---

## Request Flow

The typical request flow for the system is shown below:

```
User Browser
      |
      v
Cloudflare Tunnel
      |
      v
Frontend Container (React + Nginx)
      |
      v
Backend Container (Node.js API)
      |
      v
MongoDB Atlas Database
```

---

## Summary

This architecture demonstrates modern DevOps deployment practices including:

- Virtualization using VirtualBox
- Containerization using Docker
- Reverse proxy routing using Nginx
- Cloud service integration
- Secure public exposure using Cloudflare Tunnel

The design provides a modular, scalable, and portable deployment environment suitable for modern web applications.