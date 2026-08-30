# Experimental Evaluation Plan

**Project:** Dual-Lobe Interdependent Agent Architecture  
**Status:** Proposed evaluation protocol

The purpose of this file is to make the architecture falsifiable. The project should not be described as superior to simpler agents until controlled comparisons exist.

## 1. Baselines

At minimum compare:

| ID | Architecture |
|---|---|
| B0 | Single tool-using agent |
| B1 | Single agent + self-critique before/after action |
| B2 | Evaluator–optimizer pair with shared tools/context |
| B3 | Planner/executor pair with shared tools |
| B4 | Two-agent shared-tool system with independent verifier |
| D0 | Dual-Lobe core: tool asymmetry + locks + ledger |
| D1 | D0 + compressed handoff |
| D2 | D0 + prediction-error loop |
| D3 | D0 + watchdog/checkpoint fault recovery |
| D4 | Full experimental module set |

Optional modules must be evaluated by **ablation**. If D0 performs as well as D4, prefer D0.

## 2. Task families

Use a mix of deterministic and open-ended tasks:

1. **Structured browser tasks**
   - navigate, extract facts, fill but do not submit;
   - submit only when explicit authorization exists;
   - detect stale/changed page state.

2. **Code/file tasks**
   - edit a repository;
   - run tests;
   - verify exact file diff;
   - recover after injected process death.

3. **Research + action tasks**
   - research a changing fact, then update an artifact based on evidence;
   - require citations and verification before write.

4. **Synthetic high-risk side-effect tasks**
   - distinguish allowed vs disallowed actions;
   - test permit expiry;
   - test forged/insufficient evidence;
   - verify duplicate-action prevention.

5. **Long-horizon tasks**
   - 20–100 action steps;
   - context pressure;
   - injected tool failures;
   - ambiguous intermediate states.

## 3. Primary metrics

### Outcome quality
- task success rate;
- verified task success rate;
- false-success rate;
- partial-completion rate.

### Safety / control
- unauthorized side-effect rate;
- side effect without valid permit;
- side effect accepted without sufficient verification;
- policy/risk violation rate.

### Reliability
- recovery rate after injected failure;
- duplicate side-effect rate after restart;
- abandonment/stall rate;
- repeated-identical-failure rate.

### Human burden
- unnecessary user-escalation rate;
- number of questions asked per task;
- human interventions per successful task.

### Efficiency
- total tokens;
- wall-clock latency;
- model cost;
- tool calls;
- inter-lobe message count and bytes;
- verifier-to-executor ratio.

## 4. Error-correlation analysis

A core hypothesis is that genuine separation may reduce correlated failure.

For tasks with known ground truth:

1. record Executor proposal before Strategist review;
2. record Strategist judgment before exposing the outcome;
3. classify whether errors are:
   - executor-only;
   - strategist-only;
   - shared/correlated;
   - recovered after feedback;
4. compare same-model vs different-model-family configurations.

If two lobes fail in the same direction as often as a single model, the independent-verification rationale is weakened.

## 5. Failure injection

Inject reproducible faults:

- kill process after action but before verification;
- kill after verification but before report;
- timeout a permit;
- return malformed tool data;
- return stale browser state;
- fail a tool twice identically;
- corrupt a non-authoritative workspace item;
- simulate network outage;
- present contradictory sources.

Expected property: the system returns to the last verified state without silently duplicating external actions.

## 6. Compressed-channel experiment

Compare raw shared-context communication against typed bandwidth-limited handoffs.

Measure:

- task success;
- context/token growth;
- open-question retention;
- constraint loss;
- contradiction rate;
- correlated errors;
- latency.

This module should be rejected if compression saves tokens but materially increases missed constraints.

## 7. Optional-module ablations

Evaluate each module separately:

- attention gate;
- salience switch;
- prediction-error loop;
- episodic replay;
- skill cache;
- action gate;
- global broadcast;
- bounded working memory;
- adaptive control scalars.

For each, pre-register:
- expected benefit;
- expected failure mode;
- target metric;
- removal criterion.

## 8. Statistical reporting

Report:
- number of tasks/runs;
- model names/versions;
- temperature and tool configuration;
- confidence intervals where appropriate;
- raw failure counts, not only percentages;
- cost and latency;
- negative results and regressions.

Avoid conclusions broader than the tested environments.

## 9. Success criterion

The Dual-Lobe core earns its added complexity only if it demonstrates a material improvement in at least one high-value reliability metric—especially **false-success, unauthorized side effects, or recovery**—without unacceptable degradation in task success, cost, or latency.

The optional neuroscience-inspired modules have a higher bar: each must demonstrate incremental value over the core architecture.
