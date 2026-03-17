# Docker Installation

Docker is used in this project to containerize the frontend and backend applications.  
It allows the application to run in isolated environments called containers.

This document explains how to install Docker on the Ubuntu virtual machine.

---

# Update System Packages

Before installing Docker, update the system package list.

```bash
sudo apt update
```

---

# Install Docker

Install Docker using the following command:

```bash
sudo apt install docker.io
```

This installs the Docker engine and required dependencies.

---

# Start Docker Service

After installation, start the Docker service.

```bash
sudo systemctl start docker
```

---

# Enable Docker at System Boot

Enable Docker so it starts automatically when the system boots.

```bash
sudo systemctl enable docker
```

---

# Verify Docker Installation

Check whether Docker is installed correctly.

```bash
docker --version
```

Example output:

```
Docker version 24.x.x, build xxxx
```

---

# Test Docker Installation

Run the Docker test container.

```bash
sudo docker run hello-world
```

If Docker is installed correctly, it will display a confirmation message.

---

# Optional: Run Docker Without sudo

By default, Docker commands require root privileges.  
To allow running Docker commands without `sudo`, add your user to the Docker group.

```bash
sudo usermod -aG docker $USER
```

Then log out and log back in to apply the changes.

---

# Summary

After completing these steps:

- Docker will be installed
- Docker service will be running
- Docker will start automatically on system boot
- Containers can be executed using Docker commands

Docker is now ready to be used for building and running the application containers.