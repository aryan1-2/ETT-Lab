# Cloudflare Tunnel

Cloudflare Tunnel is used to expose the application running inside the virtual machine to the public internet **without requiring a public IP address or port forwarding**.

Instead of opening ports on the server, Cloudflare creates a secure outbound tunnel from the local machine to the Cloudflare network.

This allows users to access the application securely through a generated public URL.

---

# Why Cloudflare Tunnel is Used

In this project, the application runs inside a **Virtual Machine** and does not have a public IP address. Cloudflare Tunnel solves this problem by creating a secure connection between the local server and the internet.

Benefits include:

- No public IP required
- No router port forwarding
- Secure HTTPS connection
- Easy setup and deployment

---

# Installing Cloudflare Tunnel

First install **cloudflared**, the Cloudflare Tunnel client.

Run the following command in the Ubuntu virtual machine:

```bash
sudo apt install cloudflared
```

Verify installation:

```bash
cloudflared --version
```

---

# Starting the Tunnel

To expose the locally running application, run the following command:

```bash
cloudflared tunnel --url http://localhost:8080
```

This command tells Cloudflare to create a secure tunnel to the service running on **port 8080**.

---

# Tunnel Output

After running the command, Cloudflare will generate a public URL similar to the following:

```
https://example.trycloudflare.com
```

This URL is accessible from anywhere on the internet.

---

# Accessing the Application

Users can open the generated URL in a web browser to access the deployed application.

Example:

```
https://example.trycloudflare.com
```

The request flow works as follows:

```
User Browser
      |
      v
Cloudflare Network
      |
      v
Cloudflare Tunnel
      |
      v
Local Server (Docker Container)
```

---

# Summary

Cloudflare Tunnel allows the application to be securely exposed to the internet without modifying firewall rules or configuring public networking.

It provides a simple and secure way to demonstrate publicly accessible deployments for development and educational projects.