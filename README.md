# Tesla Dashboard UI

Vite + React dashboard for Tesla vehicle status and commands.

## Runtime Role

This UI can be opened directly or launched from Sharity Admin Portal.

Production route:

```text
https://vinodbalakumar.com/tesla/
http://localhost:8080/tesla/
```

It calls:

```text
/authorization-server/api/v1/auth/login
/authorization-server/api/v1/users/me
/tesla-dashboard-services/api
```

Tesla backend calls are made with:

```http
Authorization: Bearer <access-token>
```

## Local Development

```powershell
npm install
npm run dev
```

Environment examples:

```text
VITE_API_BASE_URL=http://localhost:8080
```

For deployed same-origin Nginx, keep API base empty in the deployment Docker build.

## Authentication

Preferred flow:

```text
Sharity Admin Portal -> Services -> Tesla Dashboard
```

The admin portal opens Tesla with:

```text
/tesla/?sharityAuth=1
```

Then it sends the current Sharity JWT to Tesla UI using `postMessage`.

Direct login flow:

```text
Tesla login form -> /authorization-server/api/v1/auth/login
```

## API Paths

The UI now uses the real Tesla service context:

```text
/tesla-dashboard-services/api/vehicles
/tesla-dashboard-services/api/status
/tesla-dashboard-services/api/wake
/tesla-dashboard-services/api/flash-lights
/tesla-dashboard-services/api/honk
/tesla-dashboard-services/api/lock
/tesla-dashboard-services/api/unlock
/tesla-dashboard-services/api/climate/start
/tesla-dashboard-services/api/climate/stop
/tesla-dashboard-services/api/start/charging
/tesla-dashboard-services/api/stop/charging
```

## Docker Deployment

Do not deploy from this folder. Deployment files live in:

```text
C:\Users\HP\projects\deployments
```

Deploy only this UI:

```powershell
cd C:\Users\HP\projects\deployments
docker compose up -d --build tesla-dashboard-ui
```

Deploy all services:

```powershell
cd C:\Users\HP\projects\deployments
docker compose up -d --build
```

## Useful Commands

```powershell
npm run build
```
