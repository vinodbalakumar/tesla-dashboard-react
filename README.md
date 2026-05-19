# Tesla Control React App

React dashboard for the Spring Boot Tesla backend.

## Local development

```powershell
npm install
npm run dev
```

Open `http://localhost:8080/web`.

If your backend is not same-origin, create `.env.local`:

```env
VITE_API_BASE_URL=http://localhost:8080
```

## Docker

Single frontend container:

```powershell
docker build -t tesla-control-webapp .
docker run -d --name tesla-control-webapp -p 8080:8080 tesla-control-webapp:latest
```

The container serves React at `/web` on port `8080` and proxies `/auth/*` and `/api/*` to `http://host.docker.internal:8080` by default.

Full stack on one public port:

```powershell
docker compose up --build -d
```

In compose, the React app is available at `http://localhost:8080/web`, and Nginx proxies backend requests to the Spring Boot service over the Docker network.
