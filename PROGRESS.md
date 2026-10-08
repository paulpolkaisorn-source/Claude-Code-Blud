# PROGRESS

Director log for the Claude Haiku 5.5 showcase page. Newest entries at the top of each list.

## Model verification

- Every subagent runs Claude Haiku 5.5 at max effort. Verified from subagent transcripts (`"model":"claude-haiku-5-5"`, `"effort":"max"`) after each phase.
- Note: `.claude/agents/*.md` (11 roles, `model: claude-haiku-5-5`, `effort: max`) were written mid-session, and Claude Code only loads agent types at session start, so this session runs each role as `general-purpose` / workflow subagents overridden to `model: haiku`, `effort: max`, with the brief instructing the agent to load its role file first. Future sessions pick up the role files directly.

## Done

- Phase 2 core foundations (all verified in Chromium harness pages): src/core/types.ts, ticker.ts (single gsap.ticker loop, priorities), bus.ts, ease.ts (8 curves, exact bezier solver), timing.ts (5-7-5 T scale, weighted and per-line haiku staggers), env.ts + head-env partial, scroll.ts (Lenis + ScrollTrigger), pointer.ts (damped, velocity-aware), src/gl/stage.ts (persistent canvas, DPR cap, context-loss fallback), src/core/loader.ts (real weighted progress).
- Phase 1 research: research/facts.md, 230 entries, every quote re-fetched and verified by independent agents (verify-*.md), a critic spot-check (no digit/unit mismatch) and a fix round.
- Phase 0: Vite 7 + TS strict scaffold, html-include plugin, ESLint, Playwright smoke test (desktop, mobile, reduced motion).
- Phase 0: agent definitions written (`.claude/agents/`), first agent verified as `claude-haiku-5-5` / `max`.
- Architecture contract: `design/architecture.md`.

## In progress

- Phase 1: art direction locked as five files (design/direction*.md) after drafts A/B, critique and director decisions; copy (content/copy.md) with fact-check.

## In review

## Rejected (and why)

- Direction merge attempt 1: the agent tried to write the whole document in one tool call and hit the 128K output ceiling; nothing was written. Re-run as five files written in 8 KB chunks.
- Speed figure: no verified product-latency number exists. Customer quotes (excluded: no testimonials) and system-card eval timings ("not product latency") would mislead, so the Speed section shows no figure.
- Head script WebGL probe: creating a WebGL2 context before first paint cost 43 ms cold; replaced with a feature check, real failures handled at boot.
- Critic overruled by the director in four places (direction-aware hover, per-section cursors, post stack, split-and-reassemble titles) because the client brief asks for each.

## Cut or unverifiable
