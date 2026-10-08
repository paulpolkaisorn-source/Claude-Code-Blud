# PROGRESS

Director log for the Claude Haiku 5.5 showcase page. Newest entries at the top of each list.

## Model verification

- Every subagent runs Claude Haiku 5.5 at max effort. Verified from subagent transcripts (`"model":"claude-haiku-5-5"`, `"effort":"max"`) after each phase.
- Note: `.claude/agents/*.md` (11 roles, `model: claude-haiku-5-5`, `effort: max`) were written mid-session, and Claude Code only loads agent types at session start, so this session runs each role as `general-purpose` / workflow subagents overridden to `model: haiku`, `effort: max`, with the brief instructing the agent to load its role file first. Future sessions pick up the role files directly.

## Done

- Phase 0: agent definitions written (`.claude/agents/`), first agent verified as `claude-haiku-5-5` / `max`.
- Architecture contract: `design/architecture.md`.

## In progress

- Phase 0: scaffold (perf), Playwright smoke test (qa).
- Phase 1: source scout (researcher), art direction drafts A/B + critique (art-director).

## In review

## Rejected (and why)

## Cut or unverifiable
