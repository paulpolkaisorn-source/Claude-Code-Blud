# PROGRESS

Director log for the Claude Haiku 5.5 showcase page.

## Model verification

- Every subagent runs Claude Haiku 5.5 at max effort. Verified from every subagent transcript (`"model":"claude-haiku-5-5"`, `"effort":"max"`); the audit script flags anything else. Last audit: 61 transcripts, 0 flagged.
- `.claude/agents/*.md` (11 roles, `model: claude-haiku-5-5`, `effort: max`) were written mid-session, and Claude Code only loads agent types at session start, so this session runs each role as a workflow or general-purpose subagent overridden to `model: haiku`, `effort: max`, with each brief telling the agent to load its role file first. Future sessions pick up the role files directly.

## Done

- Phase 0: role files, Haiku verification, Vite 7 + TS strict scaffold with the html-include plugin, ESLint, Playwright smoke test (desktop, mobile, reduced motion).
- Phase 1, research: `research/facts.md`, 236 entries, every quote re-fetched by independent verifier agents (`research/verify-*.md`), a critic spot-check (no digit or unit mismatch), a fix round, and code-example sources (streaming, get started, effort).
- Phase 1, direction: two competing drafts (A editorial print, B industrial object), a scored critique, director decisions D1-D19 (`design/drafts/director-decisions.md`), and the locked direction in five files (`design/direction.md`, `direction-3d.md`, `direction-act1/2/3.md`) after a cross-file review and fix round. `src/styles/tokens.css` generated and checked against the direction (109 values).
- Phase 1, copy: `content/copy.md` from facts only, humanizer pass, adversarial fact-check, D16 overrides (full code example, hero positioning quote, titles).
- Phase 2, core: ticker (single gsap.ticker loop), bus, ease (8 curves), timing (5-7-5 scale, weighted and per-line haiku staggers), env + head script, scroll (Lenis + ScrollTrigger), pointer, loader (real weighted progress), projection (P1, matches three.js to 1e-13 px), hover (direction-aware).
- Phase 2, GL: stage, formations (9, generated from formulas, overlap-checked), block material (hand-written GLSL: kireji finish, smear), instanced blocks (one draw call), rig (keyframe fits), lighting (PCFShadowMap, RoomEnvironment PMREM), background (paper/ink fibre, ink-bleed front), post (bloom, chromatic aberration, hand-written grain/dither, DoF on demand), quality watchdog, fonts (self-hosted, measured fallback metrics), GL boot.

## In progress

- Phase 3: nine 2D section agents (motion-2d), nine 3D section agents (three-scene / shader), the choreography engine (scroll-choreo), base.css (motion-2d).

## Rejected (and why)

- Direction merge attempt 1: the agent tried to write the whole document in one tool call and hit the 128K output ceiling. Re-run as five files written in 8 KB chunks.
- Speed figure: no verified product-latency number exists. Customer quotes (excluded: no testimonials) and system-card eval timings ("not product latency") would mislead, so the Speed section shows no figure.
- Head script WebGL probe: creating a WebGL2 context before first paint cost 43 ms cold; replaced with a feature check, real failures handled at boot.
- Critique overruled in four places (direction-aware hover, per-section cursors, post stack, split-and-reassemble titles) because the client brief asks for each.
- Copy fix round that shrank the code example to a 6-line fragment and dropped the hero positioning line: overruled by D16.
- Phone race at z 110.7 (13 px blocks): replaced by a vertical race fitted by height (D15).
- Opaque CSS section backgrounds over the canvas: they would hide the 3D; replaced by the gl-ready handover (D18).

## Cut or unverifiable

- No tokens-per-second or latency figure exists on any primary page, so none is shown.
- The code example combines two documented shapes (messages.stream with .on("text"), and output_config as a top-level request parameter). No docs page shows them together, and it was not run against the live API (no key in this environment).
- Amazon Bedrock is marked "access required" because Bedrock's model table lists Haiku 5.5 as "See Access" (F-128, F-129).
