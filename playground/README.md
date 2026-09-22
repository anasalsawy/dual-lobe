# Cognitive Architecture Playground Web UI

A deployable browser playground for the Dual-Lobe cognitive architecture experiment API.

## What it includes

- **Live Run**: watch Cortex A, Cortex B, ACC/Salience, and Evidence Cortex cooperate in real time.
- **Compare**: run the same task through multiple architectures and watch each lane live.
- **Benchmark**: run a JSON suite repeatedly and view aggregate judge score, errors, calls, latency, tokens, and evidence-discipline score.
- **Brain activity map**: persistent cortex vs dynamically recruited specialist regions.
- **Secure proxy mode**: included Node server injects your backend API key server-side, so the browser never needs the privileged key.

## Required backend

The backend must expose the Cognitive Architecture Playground endpoints:

- `GET /v1/dual-lobe/playground/architectures`
- `POST /v1/dual-lobe/playground/run`
- `POST /v1/dual-lobe/playground/compare`
- `POST /v1/dual-lobe/playground/benchmark`

The UI expects the streaming forms to use SSE (`data: {json}\n\n`) exactly like the playground overlay already does.

## Recommended production deployment

Run this frontend/server separately from the inference proxy.

Environment variables:

```bash
DUAL_LOBE_BACKEND_URL=https://your-dual-lobe-proxy.example.com
DUAL_LOBE_API_KEY=your_inference_invoke_key
PORT=8080
```

Then:

```bash
npm start
```

There are **no npm dependencies**; Node 20+ is sufficient.

Open `http://localhost:8080`.

### Docker

```bash
docker build -t cognitive-playground .
docker run --rm -p 8080:8080 \
  -e DUAL_LOBE_BACKEND_URL=https://your-proxy.example.com \
  -e DUAL_LOBE_API_KEY=... \
  cognitive-playground
```

## Put it on your existing website

Three practical options:

1. **Subdomain (recommended)**: deploy this app at `lab.your-domain.com`.
2. **Path proxy**: reverse proxy `/playground/` to this Node app and keep `/api/` handled by its server.
3. **Static embed**: copy `index.html`, `app.js`, `styles.css`, and `config.js` into your frontend, but then route `/api/v1/dual-lobe/playground/*` through your own server-side proxy. Do not expose a privileged Dual-Lobe bearer token in public JS.

## Direct-browser development mode

You may set `apiBase` in `config.js` to a backend URL and enter a bearer token in the Connection dialog. This is useful for private testing only. The token is stored in `sessionStorage`, not localStorage.

For public production, prefer same-origin `/api` proxy mode.

## Security notes

- Do not put production API keys in `config.js`.
- Scope the backend key to the minimum required permission (`inference:invoke`).
- Put authentication in front of this playground if it can launch costly model runs.
- Apply backend rate/concurrency/cost limits; the UI controls are not a security boundary.
- If the playground is public-facing, add application-level user authentication and per-user quotas before launch.

## UI behavior

`Run` renders semantic cognitive events as they arrive. `Compare` uses the backend's `variant` tag to create one live lane per architecture. `Benchmark` uses case/variant tags and renders the returned aggregate leaderboard.

Normal completion remains decision-driven in the backend. Emergency `fuse_max_calls` / `fuse_wall_seconds` are exposed only as circuit breakers.
