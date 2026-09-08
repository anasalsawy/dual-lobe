# Dual-Lobe Runtime and Oversight Reference

## Purpose

Dual-Lobe is an execution architecture around a primary Worker rather than a second sequential CrewAI task. Lobe A performs the complete research/build assignment. Lobe B is an independent shadow process that broadens context, detects tunnel vision, helps solve blockers, and checks consequential claims against observable evidence. A separate Floor Analyst remains the verdict gate, with a Final Auditor at pipeline completion.

## Core roles

### Lobe A — primary Worker

Lobe A owns execution end to end: understand the goal, inspect context, reason, use tools, observe results, modify artifacts where required, validate, and produce a complete deliverable. It must not control the evidence ledger, mark its own claims verified, decide whether its floor passes, or modify Lobe B state.

### Lobe B1 — Context Shadow

The Context Shadow asks what A may fail to ask: whether prior art already solves the problem, whether APIs/rules/dependencies changed, whether the current approach is obsolete, what assumptions are untested, what external constraints apply, what evidence is missing, what adjacent technology offers a better pattern, and what information could solve the current blocker.

### Lobe B2 — Integrity Sentinel

The Integrity Sentinel checks whether claimed actions actually occurred and what evidence proves them. It reconciles statements against files, commits, tool results, tests, citations, artifacts, and runtime evidence, and distinguishes observed facts from inference or assertion.

### Floor Analyst and Final Auditor

Lobe B supplies context and evidence but never writes the verdict. The Floor Analyst judges correctness, completeness, integrity, design quality, and readiness and may require correction. The Final Auditor remains an independent terminal build gate.

## Active Oversight Channel

Oversight should be observable and consequential rather than theatrical. At floor start the Worker is told that independent verification is active, unsupported claims remain unverified, contradictions can be forwarded to the Analyst, and critical evidence debt can block acceptance. During execution, compact status pulses or targeted claim challenges may be injected between inference cycles.

Do not monitor or pressure hidden chain-of-thought. Oversight should operate on observable tool traces, artifacts, claims, repository changes, tests, citations, and outputs.

## Runtime architecture

The full target runtime places an OpenAI-compatible gateway between CrewAI Worker LLM calls and the upstream model. The gateway loads bounded shadow/integrity state before an A inference, injects only relevant distilled context, routes to the configured provider, returns A promptly, persists an event digest, and triggers an asynchronous B post-pass. The next A inference receives any new corrections, blocker help, evidence status, or external context.

Recommended components:

```text
dual_lobe/
├── api/
│   ├── chat_completions
│   ├── models
│   ├── health
│   └── readiness
├── routing/
│   ├── normalized_request
│   ├── featherless_adapter
│   └── opencode_adapter
├── shadow/
│   ├── bootstrap
│   ├── prepass
│   ├── postpass
│   ├── context_selector
│   └── oversight
├── evidence/
│   ├── event_ingest
│   ├── claim_extractor
│   ├── verifier
│   └── ledger
├── persistence/
│   ├── state_store
│   └── event_store
└── observability/
    ├── logging
    ├── metrics
    └── tracing
```

## Evidence model

Maintain append-only event/evidence history and derive current state from it. A practical schema includes Run, WorkerState, ShadowState, IntegrityState, Claim, Evidence, and OversightState. Lobe A must never have write authority to fields that determine whether a claim is verified or contradicted.

Tracked events should include A requests/responses, tool calls/results/errors, repository mutations, test results, task lifecycle, Analyst verdicts, B bootstrap/post-pass activity, shadow injections, claim creation/status changes, attached evidence, and provider errors.

## Injection contract

Do not dump B's full state into A. Each injection should be a compact projection containing only material verified context, new context, corrections, blocker help, and oversight status. External repository/web/tool text is untrusted data and must not be treated as instructions.

## Provider boundary

Expose an OpenAI-compatible Worker-facing interface:

```text
POST /v1/chat/completions
GET  /v1/models
GET  /healthz
GET  /readyz
```

Provider routing must be explicit and adapter-based. Featherless can use a Chat Completions adapter. OpenCode/Zen may require Responses-API translation depending on the actual configured connection. Analysts, auditors, and B itself bypass normal dual-lobe injection to prevent recursive monitoring.

## Timing model

Use four timing points:

1. Floor bootstrap before A starts.
2. Cheap pre-pass before each A inference.
3. Asynchronous B post-pass after A/tool activity.
4. High-priority intervention on the next cycle when a critical contradiction or blocker appears.

The useful real-time unit is the next inference/tool cycle, not arbitrary wall-clock interruption.

## Failure semantics

- B unavailable: A fails open, oversight is visibly degraded, Analyst sees that degradation.
- A provider unavailable: surface the provider failure; do not silently substitute unless explicitly configured.
- Evidence store unavailable: useful work may continue, but a clean PASS must not be inferred from missing evidence.
- Analyst/Auditor: bypass B injection but may read evidence.
- B accidentally calls gateway: bypass recursively.

## Security and operations

Use separate gateway and provider credentials, provider/model allowlists, secret redaction, bounded queues, context limits, concurrency controls, timeouts, structured logging, and OpenTelemetry. Treat scraped content and repository text supplied to B as untrusted input.

For a single-host prototype, SQLite WAL can be adequate if the runtime SQLite build is safe. For production evidence durability, PostgreSQL is the preferred target.

## Acceptance criteria

A functioning runtime is not proven by merely running two LLMs or opening a gateway port. Evidence should show that B discovers useful context, A receives it later, B independently observes A/tool activity, unsupported claims become evidence debt, real artifacts can resolve that debt, oversight status is visible to A, B failure does not kill A, the Analyst remains independent, and provider routing is explicit and provable.
