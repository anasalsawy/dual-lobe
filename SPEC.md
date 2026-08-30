# Dual-Lobe Interdependent Agent Architecture — Technical Specification

**Version:** 1.1.0  
**Status:** Experimental specification  
**Author:** Anas Alsawy

> Two specialized model processes operate as one task-performing unit. Neither possesses enough authority to plan, act, verify, and complete important work alone.

## 1. Scope and terminology

“Dual-Lobe” is an engineering name. **Strategist** and **Executor** are not claims about literal left/right cerebral hemisphere function. Neuroscience is used as a source of design motifs and testable analogies only.

This specification separates the **core architecture** from optional neuroscience-inspired modules. The core must be evaluated first; optional modules are retained only if they improve measured outcomes.

### Core research question

Does mandatory functional specialization—enforced through tool asymmetry, permission locks, independent verification, structured communication, and durable state—produce more reliable autonomous agents than simpler baselines?

## 2. Architectural invariants

These are non-negotiable in a conforming implementation.

1. **One task identity, two model processes.** The user interacts with one system and receives one final result.
2. **Exclusive tool ownership.** No operational tool is callable by both lobes.
3. **No unilateral completion.** Executor cannot certify success; Strategist cannot directly perform side effects.
4. **Evidence before success.** A side effect is not complete until its evidence is independently verified.
5. **Typed communication.** Inter-lobe messages use validated schemas rather than unrestricted chat.
6. **Durable shared state.** Workspace, memory, ledger, and checkpoints survive process restart.
7. **Append-only audit trail.** Material permits, denials, actions, observations, verifications, and recovery events are attributable.
8. **Recovery before escalation.** The system tries bounded internal alternatives before asking the user for information it could obtain itself.
9. **Human sovereignty.** User authorization and external policy boundaries supersede the architecture.
10. **Complexity must earn its place.** An optional module is removed if it does not improve evaluation outcomes.

## 3. Components

| Component | Responsibility |
|---|---|
| Task Orchestrator | Owns run state, lifecycle, checkpoints and scheduling |
| Executor | Proposes and performs side-effecting actions |
| Strategist | Researches, critiques, authorizes, verifies and curates |
| Tool Router | Enforces exclusive tool ownership and action permits |
| Shared Workspace | Run-scoped observations, files, artifacts and task state |
| Shared Memory | Cross-run durable facts, lessons and reusable procedures |
| Permission Ledger | Append-only causal/audit record |
| Watchdog | Detects stalls, loops, silence and lost heartbeats |
| Final Report Generator | Reconstructs outcome from verified ledger entries |

See [`diagrams/00_core_architecture.mmd`](diagrams/00_core_architecture.mmd).

## 4. Capability partition

### Executor-owned: change the environment

Examples:

`browser_action`, `form_fill`, `click`, `submit`, `file_write`, `file_edit`, `code_modify`, `shell_execute`, `api_write`, `send_message`, `create_calendar_event`, `deploy_function`, `run_browser_automation`, `create_artifact`, `book`, `pay`, `delete`.

### Strategist-owned: sense, judge, authorize, verify

Examples:

`web_research`, `memory_search`, `task_decomposition`, `risk_classifier`, `policy_checker`, `source_verifier`, `test_runner`, `artifact_validator`, `plan_critic`, `tool_registry_auditor`, `approval_gate`, `stall_detector`, `memory_curator`.

### Shared substrate

Both lobes may read/write structured state through the Shared Workspace and Shared Memory interfaces. These interfaces must not provide a hidden path around the Tool Router.

**Invariant:** every tool record has exactly one owner. Calls from the wrong owner return a typed `ToolAccessDenied` event and are written to the ledger.

## 5. Dependency locks

| Lock | Transition controlled | Release condition |
|---|---|---|
| Planning | draft plan → active plan | Strategist signs |
| Action | proposed side effect → executable action | Strategist permit with scoped TTL |
| Verification | raw action result → verified success | Strategist verifies evidence |
| Escalation | internal blocker → user question | Strategist confirms bounded internal exhaustion |

A conforming runtime must make bypass of these locks impossible at the dispatch/state-machine layer, not merely undesirable in prompts.

## 6. Inter-lobe protocol

Every message is validated before dispatch.

```json
{
  "task_id": "string",
  "run_id": "string",
  "seq": 42,
  "from_lobe": "executor | strategist",
  "to_lobe": "strategist | executor",
  "message_type": "plan_draft | plan_review | action_intent | permit | verify_request | verify_result | escalation_request | escalation_verdict | stall_report",
  "payload": {}
}
```

Schema failure is a protocol error. The runtime must not silently coerce malformed messages.

### Action intent

```json
{
  "proposed_action": "fill booking form passenger details",
  "tool_requested": "browser_action",
  "expected_result": "form completed, not submitted",
  "risk_level_guess": "low",
  "needs_external_change": true,
  "executor_confidence": 0.74,
  "evidence_pointers": ["workspace://observations/screenshot-3.png"],
  "question_for_strategist": "Do we have verified passenger names?"
}
```

### Permit

```json
{
  "decision": "permit | revise | block | research_needed",
  "reason": "string",
  "required_evidence": ["memory://passenger.name.verified"],
  "allowed_tools": ["browser_action"],
  "blocked_tools": ["submit", "pay"],
  "next_instruction": "string",
  "ttl_seconds": 120
}
```

### Verification result

```json
{
  "outcome": "success | retry | repair | rollback",
  "evidence": ["workspace://observations/result.json"],
  "notes": "string"
}
```

### Escalation verdict

```json
{
  "verdict": "solve_internally | use_alternate_tool | create_tool | ask_user",
  "internal_workaround": "string",
  "user_question_if_needed": "string"
}
```

## 7. Core control loop

```text
USER TASK
  ↓
Executor interprets
  ↓
Strategist checks interpretation
  ↓
Executor drafts plan
  ↓
Strategist critiques/signs
  ↓
[Planning lock released]

repeat:
  Executor proposes action
  ↓
  Strategist researches / permits / revises / blocks
  ↓
  [Action lock released only on permit]
  ↓
  Executor executes through Tool Router
  ↓
  Strategist verifies independent evidence
  ↓
  [Verification lock released only on success]
  ↓
  Ledger + Workspace + checkpoint update

until completion criteria are verified
  ↓
Final report reconstructed from ledger
```

This is intentionally not a generic “think → act” loop. The central design is alternating **proposal → independent gate → action → independent verification**.

## 8. Tool creation and fallback

A missing capability is a recoverable planning problem, not immediate user escalation.

Before asking the user for a missing capability, evaluate bounded alternatives:

1. existing tool with alternate method;
2. script or code-generated helper;
3. ephemeral function/sandbox;
4. browser-based workflow;
5. reversible manual workaround;
6. user escalation only for genuinely unavailable secret, approval, identity claim, legal acceptance, or irreducibly human input.

New tools must be registered with an exclusive owner and explicit side-effect classification before use.

## 9. Watchdog and anti-stall behavior

Example stall signals:

- no workspace update for `T_stall`;
- no inter-lobe message for `T_silence`;
- repeated identical plan hash;
- repeated identical failed tool call;
- expired permit;
- missed heartbeat on long-running activity;
- cyclic permit/revise messages without new evidence.

### Recovery

1. freeze side effects;
2. snapshot current state;
3. write `stall_report`;
4. ask the opposite lobe for the smallest recoverable next step;
5. narrow the action or decision surface;
6. if both remain stuck, restore the latest **verified** checkpoint;
7. escalate only after bounded recovery attempts.

Recovery must be idempotent: restarting from a checkpoint must not repeat a previously verified side effect.

## 10. Minimum data model

```sql
runs(
  id primary key,
  task_id,
  status,
  started_at,
  ended_at,
  final_report_id
);

workspace_items(
  id primary key,
  run_id,
  kind,
  uri,
  meta jsonb,
  created_at
);

memory_items(
  id primary key,
  scope,
  key,
  value jsonb,
  provenance jsonb,
  confidence numeric,
  updated_at
);

ledger(
  id primary key,
  run_id,
  seq,
  from_lobe,
  to_lobe,
  message_type,
  payload jsonb,
  created_at
);

tool_registry(
  name primary key,
  owner check(owner in ('executor','strategist')),
  schema jsonb,
  side_effects boolean,
  risk_class text
);

checkpoints(
  id primary key,
  run_id,
  seq,
  snapshot jsonb,
  created_at
);
```

The ledger is append-only. Checkpoints are taken after verified state transitions.

## 11. Final report contract

```json
{
  "task_requested": "string",
  "task_understood": "string",
  "plan_chosen": "string",
  "strategist_objections": [],
  "actions_completed": [
    {
      "tool": "string",
      "result": "string",
      "verified_by": "strategist",
      "evidence": []
    }
  ],
  "tools_used": [],
  "tools_created": [],
  "blockers": [],
  "user_approvals_required": [],
  "next_recommended_move": "string"
}
```

Every claim about completed side effects must be traceable to ledger evidence. The report generator may compress verified records, but may not invent facts absent from the ledger.

## 12. Optional cognition-inspired modules

The core system does not require these modules. Each must survive ablation testing.

### 12.1 Compressed cross-lobe handoff

Inspired by interhemispheric communication as an analogy for a limited, structured channel.

Instead of raw scratchpad transfer, each lobe emits a compact packet:

```json
{
  "goal": "string",
  "constraints": [],
  "key_facts": [],
  "open_questions": [],
  "surprises": [],
  "confidence": 0.0
}
```

**Hypothesis:** compression reduces context growth and forces explicit uncertainty representation.  
**Risk:** important latent information may be lost.

### 12.2 Attention gate

Candidate context items bid for inclusion using relevance/novelty/urgency/confidence. Only top-ranked items enter active context.

**Hypothesis:** selective admission improves signal-to-noise and long-horizon context stability.

### 12.3 Salience switch

A controller shifts between active task mode and background consolidation based on novelty, urgency and idle time.

**Hypothesis:** background consolidation can improve memory quality without contaminating active execution.

### 12.4 Prediction-error loop

Strategist records predicted outcomes before execution; actual outcomes are compared after action.

Large deviations create a high-priority error signal.

**Hypothesis:** explicit surprise detection improves recovery and reduces repeated failed plans.

### 12.5 Episodic replay

Low-confidence or high-surprise traces are periodically replayed to distill candidate reusable rules with provenance.

Rules are not promoted to durable memory without evidence and later validation.

### 12.6 Skill cache

Verified successful procedures can be compiled into reusable skills.

Each skill stores an expected result distribution. Repeated prediction mismatch demotes the skill back to supervised execution.

### 12.7 Action-selection gate

Competing actions receive GO / NOGO / HOLD decisions based on risk, cost, policy, recent failure history and expected value.

This is an engineering analogy to action-selection functions associated with basal-ganglia circuitry—not a neural simulation.

### 12.8 Global broadcast

Independent modules submit high-priority information to a shared active-context surface. A bounded subset is broadcast to both lobes.

This borrows a functional motif from global-workspace theories without making claims about consciousness.

### 12.9 Bounded working memory

Maintain a small explicit set of active task slots (goal, critical constraint, current blocker, last surprise, etc.) with relevance-based replacement.

The number of slots is a tunable engineering parameter, not a biological constant.

### 12.10 Adaptive control state

Maintain transparent control scalars such as:

- `caution`
- `exploration`
- `patience`
- `memory_write_rate`
- `verification_depth`

Events update those scalars under deterministic bounds.

Names such as “dopamine” or “serotonin” should be reserved for diagrams/analogy notes, not treated as claims that scalar updates model actual neuromodulatory biology.

## 13. Safety and threat model

The architecture specifically attempts to reduce:

- self-certification of hallucinated success;
- unauthorized external side effects;
- silent tool misuse;
- duplicate actions after restart;
- unbounded retry loops;
- asking the user for avoidable decisions;
- memory contamination from unverified outcomes;
- action/verification collusion caused by shared powers.

It does **not** solve:

- malicious or systematically biased underlying models;
- collusion between two models with correlated training failures;
- compromised tools or forged evidence;
- policy errors encoded in the verifier;
- social/legal authorization questions;
- prompt injection without separate defenses;
- security of credentials or runtime infrastructure.

## 14. Conformance tests

A conforming implementation must pass, at minimum:

1. Executor call to Strategist-owned tool → `ToolAccessDenied`, logged.
2. Strategist call to Executor-owned tool → `ToolAccessDenied`, logged.
3. Action without active permit → blocked before dispatch.
4. Expired permit → blocked.
5. Completion without verification evidence → impossible state transition.
6. User escalation without exhaustion verdict → blocked.
7. Process death mid-run → resumes from latest verified checkpoint.
8. Resume does not duplicate verified side effects.
9. Final report claim lacking ledger evidence → validation failure.
10. Tool registry contains no shared operational tool owner.
11. Mutation of prior ledger entry → rejected.
12. Optional module disabled → core architecture still runs.

## 15. Evaluation requirement

Complexity is justified only by measurable improvement.

Before calling the architecture successful, compare it against the baselines in [`EXPERIMENTS.md`](EXPERIMENTS.md), report negative results, and publish:

- task success;
- **false-success rate**;
- unsafe/unauthorized side-effect rate;
- verification precision/recall where ground truth exists;
- recovery success after injected faults;
- duplicate side effects after restart;
- user-escalation rate;
- latency;
- tokens/cost;
- communication overhead;
- ablation results for optional modules.

## 16. Relationship to prior agent patterns

The architecture is related to, but distinct from:

- **Evaluator–optimizer** patterns: separate generation/evaluation, typically without mandatory exclusive tool ownership.
- **ConAgents**: specialization across tool selection, execution and calibration; demonstrates value of cooperative specialized agents.
- **Planner/executor/evaluator** systems: similar role separation, but often coordinated through prompts rather than hard permission locks.
- **Tool-RoCo**: evaluates cooperation and self-organization; its findings motivate directly testing whether optional cooperation is underused by LLM agents.
- **Dialogue OS**: organization-level governance; Dual-Lobe is task-unit/cognitive-unit architecture.

See [`REFERENCES.md`](REFERENCES.md).

## 17. Suggested implementation stack

Implementation is framework-agnostic. One practical stack:

- TypeScript or Python runtime;
- explicit state machine or LangGraph-style graph;
- Postgres for ledger/memory/workspace metadata;
- object storage for screenshots/artifacts;
- JSON Schema / Pydantic / Zod for protocol validation;
- durable activities via Temporal, Inngest, Trigger.dev or equivalent;
- OpenTelemetry traces keyed by `run_id`;
- two independently configurable model providers.

For strong tests of error decorrelation, use different model families/providers where feasible rather than two identical calls to the same checkpoint.

## 18. Milestones

### M1 — deterministic substrate
Tool registry, exclusive router, append-only ledger, state machine, schemas.

### M2 — two lobes
Strategist and Executor online with planning/action locks.

### M3 — verification and durability
Independent verification, checkpoints, watchdog, idempotent restart.

### M4 — real tools
Browser, files, APIs, code, research/test tools.

### M5 — evaluation harness
Baselines, failure injection, ground-truth tasks, metrics dashboard.

### M6 — cognition-inspired ablations
Add optional modules one at a time. Keep only those with measurable benefit.

## 19. Definition of done for the research prototype

A v1 research prototype is complete when:

- the core conformance suite passes;
- at least three baseline architectures are implemented;
- controlled failure injection is reproducible;
- results include success and false-success rates;
- cost/latency tradeoffs are reported;
- optional modules have ablation results;
- no claim of superiority is made beyond measured conditions.

---

**Design principle:** architecture should constrain authority and preserve evidence; models should retain freedom to reason within those boundaries.
