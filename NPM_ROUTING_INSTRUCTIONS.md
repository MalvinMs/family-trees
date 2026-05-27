# Nginx Proxy Manager (NPM) Routing Instructions for Kinova

To route public traffic to the Kinova backend and WebSocket servers running on the VPS, you must configure two Proxy Hosts in Nginx Proxy Manager.

---

## 1. REST API Routing (api.alezonyth.my.id)

This host routes all HTTP API requests (e.g., GET, POST, DELETE) to the Laravel API server.

### Detail Tab
- **Domain Names**: `api.alezonyth.my.id`
- **Scheme**: `http`
- **Forward Hostname / IP**: `kinova_backend` *(Docker container name)*
- **Forward Port**: `8000`
- **Cache Assets**: ❌ *Off*
- **Block Common Exploits**:  *On*
- **Websockets Support**: ❌ *Off*

### SSL Tab
- **SSL Certificate**: Select your existing wildcard certificate: `*.alezonyth.my.id`
- **Force SSL**:  *On*
- **HTTP/2 Support**:  *On*
- **HSTS Enabled**:  *On*
- **HSTS Subdomains**: ❌ *Off (Optional)*

---

## 2. WebSocket Server Routing (ws.alezonyth.my.id)

This host routes all WebSocket connection upgrades (e.g., `wss://`) to the Laravel Reverb WebSocket server.

### Detail Tab
- **Domain Names**: `ws.alezonyth.my.id`
- **Scheme**: `http`
- **Forward Hostname / IP**: `kinova_reverb` *(Docker container name)*
- **Forward Port**: `8080`
- **Cache Assets**: ❌ *Off*
- **Block Common Exploits**:  *On*
- **Websockets Support**:  *On (CRITICAL - enabling this toggles Connection Upgrade header support)*

### SSL Tab
- **SSL Certificate**: Select your existing wildcard certificate: `*.alezonyth.my.id`
- **Force SSL**:  *On*
- **HTTP/2 Support**:  *On*
- **HSTS Enabled**:  *On*
- **HSTS Subdomains**: ❌ *Off (Optional)*

### Advanced Tab
Paste the following custom block inside the **Custom Nginx Configuration** text area. This disables response buffering (ensures real-time push latency) and prevents Nginx from severing idle WebSocket TCP pipes.

```nginx
# Laravel Reverb WebSockets - Advanced Connection Parameters
proxy_http_version 1.1;

# Forward proper protocol properties
proxy_set_header Host $http_host;
proxy_set_header Scheme $scheme;
proxy_set_header SERVER_PORT $server_port;
proxy_set_header REMOTE_ADDR $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

# Handshake upgrade lines
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "Upgrade";

# Performance optimizations for WebSockets
proxy_buffering off;
proxy_read_timeout 86400s; # Keep connection open up to 24 hours without message activity
proxy_send_timeout 86400s;
```

---

## How it works under the hood
Since Nginx Proxy Manager is configured on the host VPS and shares the external Docker network named `proxy-net`, it accesses `kinova_backend` and `kinova_reverb` directly over the virtual bridge network. There is **no need** to bind host ports (e.g., `-p 8000:8000`) in `docker-compose.prod.yml`, ensuring your VPS remains secure and clean.
