# Dual-Lobe Interdependent Agent Architecture

**Status:** Experimental research specification  
**Version:** 1.1.0  
**Author:** Anas Alsawy  
**Research track:** Dialogue OS / autonomous-agent architecture  
**Last updated:** 2026-08-24

> **Core idea:** divide one task identity across two functionally specialized model processes that cannot complete important work independently. Cooperation is enforced by deterministic architecture—tool ownership, permission locks, typed communication, verification, and an append-only ledger—not merely requested in prompts.

## Why publish this

Many agent systems ask a model to plan, act, and judge its own work. That creates a structural problem: the same process that makes an error may also certify that error as success. Existing evaluator–optimizer and multi-agent patterns improve separation of concerns, but cooperation is often optional or both agents retain overlapping power.

The Dual-Lobe architecture tests a stricter hypothesis:

> **Can enforced functional specialization and constrained cross-module communication reduce false success, unsafe side effects, correlated errors, and unrecoverable stalls in long-running AI agents?**

The project is inspired by broad neuroscience motifs—functional specialization, interhemispheric communication, attentional gating, prediction error, replay, action selection, global broadcasting, bounded working memory, and neuromodulatory control—but it is **not a biological model of the human brain** and makes no claim of reproducing consciousness or literal hemispheric function.

## The architecture in one minute

Two persistent model processes share one task identity:

- **Strategist lobe** — senses, researches, critiques, checks policy/risk, authorizes actions, verifies outcomes, curates memory.
- **Executor lobe** — manipulates the environment: browser actions, code/file changes, API writes, deployments, messages, bookings, and other side effects.

They share a workspace and durable memory, but **no side-effecting or judgment tool is callable by both lobes**.

Four locks make interdependence mandatory:

1. **Planning lock** — a plan is not active until Strategist signs it.
2. **Action lock** — an external action is blocked until Strategist permits it.
3. **Verification lock** — an action cannot count as success until Strategist verifies evidence.
4. **Escalation lock** — the system cannot ask the user for help until internal recovery paths have been exhausted.

Every inter-lobe message is schema-validated. Every permit, denial, action, verification, and recovery event is written to an append-only ledger.

See the full [technical specification](SPEC.md).

## What is actually novel here?

This project does **not** claim that generator/evaluator separation itself is new. Related work includes evaluator–optimizer workflows, cooperative specialized agents, and planner/executor/evaluator architectures.

The research contribution being explored is the **combination of hard architectural constraints**:

- mutually exclusive tool ownership;
- independent permission and verification gates;
- a bandwidth-limited, typed inter-lobe communication channel;
- no unilateral completion;
- checkpoint recovery from the last verified state;
- a ledger from which success must be reconstructible;
- optional cognition-inspired modules that are treated as engineering mechanisms, not biological claims.

The distinction from **Dialogue OS** is also intentional: Dialogue OS governs a persistent *organization of agents*. Dual-Lobe explores the internal reliability architecture of *one task-performing cognitive unit*.

## Research hypotheses

The project is designed around falsifiable hypotheses rather than analogy alone:

- **H1 — Independent verification:** hard tool asymmetry reduces false-success declarations compared with shared-tool two-agent and self-critique baselines.
- **H2 — Side-effect control:** permission locks reduce unauthorized or weakly supported external actions.
- **H3 — Error decorrelation:** constrained, structured inter-lobe communication reduces correlated reasoning failures relative to shared-context agents.
- **H4 — Recoverability:** checkpoint + ledger recovery reduces duplicated side effects and abandonment after process/tool failure.
- **H5 — Context efficiency:** bandwidth-limited handoffs preserve task-relevant state with lower context growth, though they may hurt tasks that require high-bandwidth joint reasoning.
- **H6 — Adaptive control:** prediction-error, salience, working-memory, replay, and action-gating modules improve long-horizon reliability only if they produce measurable gains over the simpler core architecture.

See [EXPERIMENTS.md](EXPERIMENTS.md) for proposed baselines and metrics.

## Neuroscience-inspired modules

These modules are **optional hypotheses**, not requirements for the core system:

| Engineering module | Inspiration | Engineering purpose |
|---|---|---|
| Compressed handoff channel | Corpus callosum / interhemispheric communication | Prevent uncontrolled context sharing; force explicit handoff packets |
| Attention gate | Thalamic control of cortical connectivity | Admit only high-priority context into active processing |
| Salience switch | Salience/task-switching motifs | Shift between active task execution and background consolidation |
| Prediction-error loop | Predictive coding | Escalate surprising outcome differences |
| Episodic replay | Hippocampal replay | Distill lessons from prior traces during idle periods |
| Skill cache | Cerebellar learning analogy | Reuse successful procedural traces with prediction checks |
| Action gate | Basal-ganglia action-selection analogy | GO / NOGO / HOLD control over competing actions |
| Global broadcast | Global workspace theories | Share only selected high-priority information across modules |
| Bounded working memory | Working-memory capacity research | Maintain a small explicit active-state buffer |
| Adaptive control scalars | Neuromodulatory systems | Modulate patience, caution, exploration, and memory-write behavior |

The mapping is deliberately functional and approximate. Neuroscience does not support a simple “left brain plans, right brain executes” story; the project therefore uses **Strategist** and **Executor** as engineering roles rather than literal hemispheric identities.

## Repository contents

- [`SPEC.md`](SPEC.md) — architecture, invariants, protocol, data model, watchdog and acceptance criteria
- [`EXPERIMENTS.md`](EXPERIMENTS.md) — proposed empirical evaluation plan
- [`REFERENCES.md`](REFERENCES.md) — AI-agent and neuroscience prior art
- [`diagrams/`](diagrams/) — Mermaid diagrams for the core and optional modules
- [`CITATION.cff`](CITATION.cff) — citation metadata

## Research status and limitations

This is a **design and experimental research specification**, not a peer-reviewed neuroscience theory and not evidence that the architecture outperforms simpler agents. No claim should be inferred until controlled evaluation is run against explicit baselines.

The architecture may also introduce important costs:

- higher latency and token usage from dual inference;
- verifier bottlenecks;
- coordination deadlocks;
- false blocks from conservative gating;
- information loss from compressed handoffs;
- correlated failures when both lobes use closely related models/training data;
- over-engineering relative to simpler evaluator–optimizer systems.

Those are features to measure, not hide.

## Relationship to Dialogue OS

[Dialogue OS](../../README.md) is the broader constitutional and operational framework for persistent multi-agent organizations. Dual-Lobe is an experimental research track focused on **intra-agent/task-unit reliability**. A future implementation could use a Dual-Lobe unit as a Worker or Lead inside a Dialogue OS organization, but neither specification depends on the other.

## Citation

If you discuss or adapt this work, please cite:

> Alsawy, Anas. *Dual-Lobe Interdependent Agent Architecture: An Experimental Cognitive Architecture for Reliable Autonomous Agents*, v1.1.0, 2026. Dialogue OS research track. https://github.com/anasalsawy/dialogue-os/tree/main/research/dual-lobe

See [`CITATION.cff`](CITATION.cff) for machine-readable citation metadata.

## License

This research documentation is published under the repository's **CC BY-NC-SA 4.0** documentation license. See [`../../LICENSE.md`](../../LICENSE.md).

---

**Short form:** two specialized model processes, one task identity, asymmetric powers, mandatory cross-checks, evidence before success.
