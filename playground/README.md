# Dual-Lobe Website / Live Lab

This is the deployable website for the current Dual-Lobe release candidate.

The site intentionally features **one model architecture only**: the self-splitting Dual-Lobe design.

## Model shown on the site

```text
task
  ↓
Lobe A receives the full task
  ↓
valid split?
  ├─ no  → A completes single-lane → B verifies
  └─ yes
       ├─ A half ───────────┐
       └─ B half ───────────┤  concurrent
                            ↓
                   B reconvergence
             merge + repair + verify
                            ↓
                  canonical answer
```

B's finalizer uses the hardened verifier protocol from the release runtime. The website does not present legacy Gated, Non-Split, dedicated-Splitter, ACC, Evidence-Cortex, or other experimental architectures as products.

## Website sections

- **Live Run** — submit a task and watch Lobe A / Lobe B execution events.
- **Architecture** — explains self-splitting, parallel execution, B reconvergence, proof-aware verification, and canonical loop state.
- **Benchmark** — stress the single Dual-Lobe model over a JSON case suite and inspect latency, calls, tokens, errors, evidence discipline, and judge output.

## Required backend

The current frontend expects:

- `GET /v1/dual-lobe/playground/architectures`
- `POST /v1/dual-lobe/playground/run`
- `POST /v1/dual-lobe/playground/benchmark`

The architecture discovery endpoint is retained only for runtime compatibility. The UI automatically selects the current Dual-Lobe/Self-Split architecture and does not expose architecture selection to visitors.

Streaming run/benchmark responses use SSE:

```text
data: {json}

```

## Production deployment

Run the website/server separately from the inference runtime.

Environment variables:

```bash
DUAL_LOBE_BACKEND_URL=https://your-dual-lobe-runtime.example.com
DUAL_LOBE_API_KEY=your_inference_invoke_key
PORT=8080
```

Then:

```bash
npm start
```

There are no npm runtime dependencies; Node 20+ is sufficient.

### Docker

```bash
docker build -t dual-lobe-site .
docker run --rm -p 8080:8080 \
  -e DUAL_LOBE_BACKEND_URL=https://your-runtime.example.com \
  -e DUAL_LOBE_API_KEY=... \
  dual-lobe-site
```

## Security

- Never place a production API key in `config.js`.
- Use the included server proxy for public deployment.
- Keep inference credentials server-side.
- Put authentication, quotas, rate limits, and cost controls in front of public execution.
- UI emergency limits are not a security boundary.

## Release status

The website currently labels Dual-Lobe as a **release candidate** while model testing is ongoing. The design is intentionally singular so the site can transition directly from testing to release without becoming a catalog of obsolete experimental variants.
