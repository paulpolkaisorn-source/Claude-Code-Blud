# Claude Haiku 5.5: product facts (Phase 1)

Owner: researcher. Date: 2026-10-08. Every source below was accessed 2026-10-08.

## How to use this file

1. The page may state only the facts listed here; anything not listed is not a fact for copy.
2. Quote numbers exactly as written in the quote, with their units, currency and per-million-token (MTok) basis.
3. Cite the F-id in copy files (for example [F-13]) so each claim traces to its source URL.
4. Do not state anything under NOT FOUND or Conflicts / wording differences as fact; use the wording given there.
5. ADJUSTED entries use the corrected value, and entries marked "head" come from page metadata, not visible text.

## Method and verification

- Inputs: research/notes-launch.md, notes-api-pricing.md, notes-platforms-family.md, notes-system-card.md, research/verify-platforms-family.md, and research/sources-scout.md.
- research/verify-platforms-family.md exists: it gives verdicts for the platforms and family rows (P-rows: 97 VERIFIED, 5 ADJUSTED, 0 FAILED) and NEW-VERIFIED rows N-01 to N-14. research/verify-launch.md, research/verify-api-pricing.md and research/verify-system-card.md were not present when this file was written.
- For the launch, API-pricing and system-card rows, verdicts come from an independent re-fetch on 2026-10-08. Each cited URL was fetched with curl, visible text was extracted (SVG chart labels included), and every quote was checked by script against the page it cites. Every P-row quote was also re-checked by script.
- Table rows are quoted in the page's cell order: " | " marks a cell boundary, "[empty]" marks an empty cell, and no spaces are added where the page's text nodes run together (for example "45.9%no tools"). PDF table cells are read from the layout text and marked as such.
- Statements that apply to Haiku 5.5 only by inference (Haiku 5.5 not named) are not carried; see NOT FOUND.
- Fix round (2026-10-08): quotes for F-41 to F-49, F-83, F-91 to F-94, F-103, F-104, F-107, F-115, F-139, F-142 and F-177 were re-quoted from freshly fetched page text. The LOCATION group (F-04, F-16, F-18, F-38, F-63, the F-64 note, F-98, F-165) now cites the Markdown copy of the models overview. F-61's note was corrected. F-47 to F-49 gained system card qualifiers. Customer statements and system card results were added as F-192 onward. NOT FOUND 1 to 3 and 15 to 20 were revised. Every quote was checked by script against the page text fetched on 2026-10-08.

## Identity

- **F-01** The newsroom titles the model "Introducing Claude Haiku 5.5".
  - Quote: "Introducing Claude Haiku 5.5"
  - Source: https://www.anthropic.com/news ; https://www.anthropic.com/claude-haiku-5-5 (document title, head)
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch.
- **F-02** The Claude API model ID for Haiku 5.5 is claude-haiku-5-5.
  - Quote: "Claude API ID | claude-fable-5-1 | claude-opus-5-5 | claude-sonnet-5-5 | claude-haiku-5-5"
  - Source: https://platform.claude.com/docs/en/models/overview ; https://platform.claude.com/docs/en/models/haiku-5-5/overview ; https://www.anthropic.com/claude-haiku-5-5
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-21; script re-check).
- **F-03** The Claude API alias for Haiku 5.5 is also claude-haiku-5-5; no dated alias is listed.
  - Quote: "Claude API alias | claude-fable-5-1 | claude-opus-5-5 | claude-sonnet-5-5 | claude-haiku-5-5"
  - Source: https://platform.claude.com/docs/en/models/overview
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch.
- **F-04** Every Claude model ID is a pinned snapshot, including the dateless IDs used from the 4.6 generation on, such as claude-haiku-5-5.
  - Quote: "Every Claude model ID is a pinned snapshot, including the dateless IDs used from the 4.6 generation on."
  - Source: https://platform.claude.com/docs/en/models/overview.md (Markdown copy; the rendered HTML page does not carry this quote)
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-26; script re-check). Re-checked against the fresh page text in the 2026-10-08 fix round.
- **F-05** The Amazon Bedrock model ID for Haiku 5.5 is anthropic.claude-haiku-5-5.
  - Quote: "Amazon Bedrock ID | anthropic.claude-fable-5-1 | anthropic.claude-opus-5-5 | anthropic.claude-sonnet-5-5 | anthropic.claude-haiku-5-5"
  - Source: https://platform.claude.com/docs/en/models/overview ; https://platform.claude.com/docs/en/build-with-claude/claude-in-amazon-bedrock ; https://platform.claude.com/docs/en/models/haiku-5-5/overview
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-22 and P-28; script re-check).
- **F-06** Model IDs in Claude in Amazon Bedrock carry an anthropic. provider prefix.
  - Quote: "Model IDs in Claude in Amazon Bedrock carry an anthropic. provider prefix."
  - Source: https://platform.claude.com/docs/en/build-with-claude/claude-in-amazon-bedrock
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-29; script re-check).
- **F-07** The Google Cloud model ID for Haiku 5.5 is claude-haiku-5-5.
  - Quote: "Google Cloud ID | claude-fable-5-1 | claude-opus-5-5 | claude-sonnet-5-5 | claude-haiku-5-5"
  - Source: https://platform.claude.com/docs/en/models/overview ; https://platform.claude.com/docs/en/build-with-claude/claude-on-vertex-ai
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-23 and P-38; script re-check).
- **F-08** The Microsoft Foundry model ID for Haiku 5.5 is claude-haiku-5-5.
  - Quote: "Microsoft Foundry ID | claude-fable-5-1 | claude-opus-5-5 | claude-sonnet-5-5 | claude-haiku-5-5"
  - Source: https://platform.claude.com/docs/en/models/overview ; https://platform.claude.com/docs/en/build-with-claude/claude-in-microsoft-foundry
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-24; script re-check).
- **F-09** Foundry deployment names default to the model IDs; the default deployment name for Haiku 5.5 is claude-haiku-5-5.
  - Quote: "By default, deployment names match the model IDs shown in the preceding table."
  - Source: https://platform.claude.com/docs/en/build-with-claude/claude-in-microsoft-foundry
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-44; script re-check).
- **F-10** The Claude Platform on AWS model ID for Haiku 5.5 is claude-haiku-5-5.
  - Quote: "Claude Platform on AWS ID | claude-fable-5-1 | claude-opus-5-5 | claude-sonnet-5-5 | claude-haiku-5-5"
  - Source: https://platform.claude.com/docs/en/models/overview ; https://platform.claude.com/docs/en/build-with-claude/claude-platform-on-aws
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-25 and P-33; script re-check).
- **F-11** Claude Platform on AWS model IDs are identical to the first-party Claude API IDs; there are no Bedrock-style ARNs or anthropic. prefixes.
  - Quote: "Model IDs are identical to the first-party Claude API. There are no Bedrock-style ARNs or anthropic. prefixes."
  - Source: https://platform.claude.com/docs/en/build-with-claude/claude-platform-on-aws
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-34; script re-check).
- **F-12** In Claude Code on the Anthropic API, the haiku alias resolves to Haiku 5.5.
  - Quote: "Anthropic API | Opus 5.5 | Sonnet 5.5 | Haiku 5.5"
  - Source: https://code.claude.com/docs/en/model-config
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-84; script re-check).

## Release

- **F-13** Claude Haiku 5.5 was launched on October 7, 2026.
  - Quote: "October 7, 2026"
  - Source: https://www.anthropic.com/claude-haiku-5-5 ; https://platform.claude.com/docs/en/models/haiku-5-5/overview ; https://platform.claude.com/docs/en/release-notes/overview ; https://support.claude.com/en/articles/12138966-release-notes ; https://www-cdn.anthropic.com/e1080d6bf5ae2018ea3c2f414064be03232f5be5/Claude%20Haiku%205.5%20System%20Card.pdf ; https://www.anthropic.com/claude/haiku (written "Oct 7, 2026") ; https://www.anthropic.com/news (written "Oct 7, 2026")
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (system card cover page, p. 1).
- **F-14** The Haiku 5.5 model status is "Active (latest)".
  - Quote: "Active (latest)"
  - Source: https://platform.claude.com/docs/en/models/haiku-5-5/overview
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch.
- **F-15** Haiku 5.5 retirement is not sooner than October 7, 2027.
  - Quote: "Not sooner than October 7, 2027"
  - Source: https://platform.claude.com/docs/en/models/overview ; https://platform.claude.com/docs/en/models/haiku-5-5/overview ; https://platform.claude.com/docs/en/about-claude/model-deprecations
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-16; independent re-fetch of the other two).
- **F-16** Anthropic's retirement commitment covers Anthropic-operated platforms (Claude API, Claude Platform on AWS, Microsoft Foundry); Amazon Bedrock and Google Cloud set their own dates.
  - Quote: "Retirement: Anthropic’s commitment for Anthropic-operated platforms (Claude API, Claude Platform on AWS, Microsoft Foundry). Amazon Bedrock and Google Cloud set their own dates."
  - Source: https://platform.claude.com/docs/en/models/overview.md (Markdown copy, bullet "Retirement", bold markup removed; the rendered HTML page does not carry this quote)
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-17; script re-check). Re-checked against the fresh page text in the 2026-10-08 fix round.
- **F-17** The API release notes record the launch as "We've launched Claude Haiku 5.5 (claude-haiku-5-5)".
  - Quote: "We've launched Claude Haiku 5.5 (claude-haiku-5-5)"
  - Source: https://platform.claude.com/docs/en/release-notes/overview
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch.
- **F-18** Claude Haiku 4.5 is listed as a legacy model that is still available; Claude Haiku 5.5 is not in that list.
  - Quote: "Legacy models (still available): Claude Fable 5, Claude Opus 5, Claude Opus 4.8, Claude Opus 4.7, Claude Opus 4.6, Claude Opus 4.5, Claude Sonnet 5, Claude Sonnet 4.6, Claude Haiku 4.5."
  - Source: https://platform.claude.com/docs/en/models/overview.md (Markdown copy, link markup removed; the rendered HTML page does not carry this quote)
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-20; script re-check). Re-checked against the fresh page text in the 2026-10-08 fix round.
- **F-19** The system card says Claude Haiku 5.5 "is a new large language model from Anthropic, released for general access."
  - Quote: "Claude Haiku 5.5 is a new large language model from Anthropic, released for general access."
  - Source: https://www-cdn.anthropic.com/e1080d6bf5ae2018ea3c2f414064be03232f5be5/Claude%20Haiku%205.5%20System%20Card.pdf (p. 8)
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-system-card S-03).

## Positioning

- **F-20** Launch-post lead: Haiku 5.5 is "the cheapest, fastest, and most capable small model" Anthropic has released.
  - Quote: "Introducing Claude Haiku 5.5: the cheapest, fastest, and most capable small model we’ve ever released."
  - Source: https://www.anthropic.com/claude-haiku-5-5
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch.
- **F-21** Meta description (head, not visible text): Haiku 5.5 is "our fastest, most capable small model", built for summarization, subagents and browser use.
  - Quote: "Claude Haiku 5.5 is our fastest, most capable small model. Built for high-volume work like summarization, subagents, and browser use."
  - Source: https://www.anthropic.com/claude-haiku-5-5 (head: meta description)
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (head metadata).
- **F-22** Anthropic says Haiku 5.5 is designed for high-volume, cost-sensitive tasks.
  - Quote: "Claude Haiku 5.5 is designed for high-volume, cost-sensitive tasks."
  - Source: https://www.anthropic.com/claude-haiku-5-5
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch.
- **F-23** Haiku 5.5 pairs well with Opus 5.5 and Sonnet 5.5 as a subagent on coding work.
  - Quote: "It pairs well with Opus 5.5 and Sonnet 5.5 as a subagent on coding work."
  - Source: https://www.anthropic.com/claude-haiku-5-5
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch.
- **F-24** Haiku 5.5 is best suited to narrowly scoped tasks that might otherwise have been cost-prohibitive with previous versions of Claude.
  - Quote: "Haiku 5.5 is best suited to more narrowly scoped tasks that might otherwise have been cost-prohibitive with previous versions of Claude—like compaction, summarization, or subagent work."
  - Source: https://www.anthropic.com/claude-haiku-5-5
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch.
- **F-25** Sonnet 5.5 and Opus 5.5 remain the better choices for complex agentic coding tasks such as those measured by Terminal-Bench 4.0.
  - Quote: "Sonnet 5.5 and Opus 5.5 remain better choices for complex agentic coding tasks like those measured by Terminal-Bench 4.0."
  - Source: https://www.anthropic.com/claude-haiku-5-5
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch.
- **F-26** The product page describes Haiku 5.5 as the fastest and most efficient model in the Claude 5.5 family.
  - Quote: "Claude Haiku 5.5 is the fastest and most efficient model in the Claude 5.5 family, built for high-volume, cost-sensitive work."
  - Source: https://www.anthropic.com/claude/haiku (announcements block)
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-48; independent re-fetch of L-19).
- **F-27** Newsroom teaser: "Our fastest, cheapest, and most capable small model yet. It’s designed for high-volume, cost-sensitive work."
  - Quote: "Our fastest, cheapest, and most capable small model yet. It’s designed for high-volume, cost-sensitive work."
  - Source: https://www.anthropic.com/news
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch.
- **F-28** Help Center launch wording: "We just launched Claude Haiku 5.5, the cheapest, fastest, and most capable small model we’ve released, designed for high-volume, cost-sensitive tasks."
  - Quote: "We just launched Claude Haiku 5.5, the cheapest, fastest, and most capable small model we’ve released, designed for high-volume, cost-sensitive tasks."
  - Source: https://support.claude.com/en/articles/12138966-release-notes
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch.
- **F-29** API release notes describe Haiku 5.5 as "our most capable model tuned for high-volume and latency-sensitive work".
  - Quote: "our most capable model tuned for high-volume and latency-sensitive work"
  - Source: https://platform.claude.com/docs/en/release-notes/overview
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch.
- **F-30** The product page calls Haiku 5.5 "our most capable Haiku yet" and a significant step up over Haiku 4.5; no figures are given for this claim.
  - Quote: "Haiku 5.5 is our most capable Haiku yet, a significant step up over Haiku 4.5 across coding, tool use, computer use, and agents."
  - Source: https://www.anthropic.com/claude/haiku
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-52; script re-check).
- **F-31** Developer documentation: Haiku 5.5 is built for high-volume, latency-sensitive work such as classification, routing, extraction, and subagent tasks.
  - Quote: "Claude Haiku 5.5 is built for high-volume, latency-sensitive work such as classification, routing, extraction, and subagent tasks."
  - Source: https://platform.claude.com/docs/en/models/haiku-5-5/overview
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch.
- **F-32** The system card describes Haiku 5.5 as "the latest Haiku-class large language model from Anthropic".
  - Quote: "This system card describes Claude Haiku 5.5, the latest Haiku-class large language model from Anthropic."
  - Source: https://www-cdn.anthropic.com/e1080d6bf5ae2018ea3c2f414064be03232f5be5/Claude%20Haiku%205.5%20System%20Card.pdf (p. 2)
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-system-card S-02).
- **F-33** The claude.com pricing card for Haiku 5.5 is tagged "Fastest, most cost-efficient model".
  - Quote: "Fastest, most cost-efficient model"
  - Source: https://claude.com/pricing
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch.
- **F-34** FAQ on the product page: "Use Haiku 5.5 when speed and volume matter most."
  - Quote: "Use Haiku 5.5 when speed and volume matter most."
  - Source: https://www.anthropic.com/claude/haiku (FAQ, "When should I use Haiku 5.5?")
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-57; script re-check).
- **F-35** FAQ on the product page: Opus 5.5 is the daily driver for complex coding and knowledge work, and Sonnet 5.5 suits well-scoped tasks.
  - Quote: "For complex coding and knowledge work, Opus 5.5 is the daily driver, and Sonnet 5.5 is a good fit for well-scoped tasks."
  - Source: https://www.anthropic.com/claude/haiku (FAQ)
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-58; script re-check).

## Speed and latency

- **F-36** Anthropic says Haiku 5.5 is its fastest model to date and works especially well for speed-sensitive tasks such as live customer support and browser use.
  - Quote: "since it’s also our fastest model to date, it works especially well for speed-sensitive tasks like live customer support and browser use."
  - Source: https://www.anthropic.com/claude-haiku-5-5 (introduction)
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch.
- **F-37** The footnote qualifies "fastest": the claim is at each model's standard speed, and Haiku 5.5 runs less quickly than the Opus models in Fast Mode.
  - Quote: "Claude Haiku 5.5 is our fastest model to date at each model’s standard speed, although it runs less quickly than our Opus models in Fast Mode."
  - Source: https://www.anthropic.com/claude-haiku-5-5 (footnote 1)
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch.
- **F-38** The overview's latency labels are relative to the current lineup; actual latency depends on prompt length, output length and thinking effort.
  - Quote: "Relative to the current lineup. Actual latency depends on prompt length, output length, and thinking effort."
  - Source: https://platform.claude.com/docs/en/models/overview.md (Markdown copy, note under the table; the rendered HTML page does not carry this quote)
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-04; independent re-fetch of A-15). Re-checked against the fresh page text in the 2026-10-08 fix round.
- **F-39** Haiku 5.5 is fast enough for real-time experiences and efficient enough to run at volume.
  - Quote: "Haiku 5.5 is fast enough for real-time experiences and efficient enough to run at volume."
  - Source: https://www.anthropic.com/claude/haiku
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-55; script re-check).
- **F-40** Haiku 5.5 is built for latency-sensitive use cases such as chat, voice agents, live support and in-app assistants, where speed matters most.
  - Quote: "Haiku 5.5 is built for latency-sensitive use cases like chat, voice agents, live support, and in-app assistants, where speed matters most."
  - Source: https://www.anthropic.com/claude/haiku
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-56; script re-check).

## Benchmarks

Column order in the launch-post Performance table: Haiku 5.5, Haiku 4.5, GPT-6 Luna, Sonnet 5.5 (labelled "For reference").

- **F-41** Performance-table columns, left to right: Haiku 5.5, Haiku 4.5, GPT-6 Luna, and Sonnet 5.5 (labelled "For reference").
  - Quote: "[empty] | Haiku 5.5 | Haiku 4.5 | GPT-6 Luna | [empty] | Sonnet 5.5For reference"
  - Source: https://www.anthropic.com/claude-haiku-5-5
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-launch L-50). Re-checked against the fresh page text in the 2026-10-08 fix round.
- **F-42** GDPval-AA v2.1 (chart unit: Elo, as reported): Haiku 5.5 1620; Haiku 4.5 735; GPT-6 Luna 1437; Sonnet 5.5 1840.
  - Quote: "GDPval-AA v2.1 | 1620 | 735 | 1437 | [empty] | 1840"
  - Source: https://www.anthropic.com/claude-haiku-5-5 (table); system card PDF p. 111 (Table 8.1.A, same values)
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-launch L-42). Re-checked against the fresh page text in the 2026-10-08 fix round.
- **F-43** AA-Briefcase v1.1 (no unit or definition is printed on the page): Haiku 5.5 1578; Haiku 4.5 614; GPT-6 Luna 1336; Sonnet 5.5 1824.
  - Quote: "AA-Briefcase v1.1 | 1578 | 614 | 1336 | [empty] | 1824"
  - Source: https://www.anthropic.com/claude-haiku-5-5 (table); system card PDF p. 111 (Table 8.1.A, same values) and p. 131 (reports the unit as Elo; see F-216)
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-launch L-43). Re-checked against the fresh page text in the 2026-10-08 fix round.
- **F-44** OSWorld 2.1, offline subset (chart unit: partial-credit score, %): Haiku 5.5 72.4%; Haiku 4.5 15.7%; GPT-6 Luna 48.9%; Sonnet 5.5 83.9%.
  - Quote: "OSWorld 2.1 | 72.4%Offline subset | 15.7%Offline subset | 48.9%Offline subset | [empty] | 83.9%Offline subset"
  - Source: https://www.anthropic.com/claude-haiku-5-5 (table); system card PDF p. 111 (Table 8.1.A, same values) and p. 128 (partial score 72.4%; strict pass rate in F-209)
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-launch L-44). Re-checked against the fresh page text in the 2026-10-08 fix round.
- **F-45** Humanity's Last Exam, no tools (chart unit: score, %): Haiku 5.5 45.9%; Haiku 4.5 10.2%; GPT-6 Luna shows a dash (no value); Sonnet 5.5 56.9%.
  - Quote: "Humanity’s Last Exam | 45.9%no tools | 10.2%no tools | — | [empty] | 56.9%no tools"
  - Source: https://www.anthropic.com/claude-haiku-5-5 (table); system card PDF p. 111 (Table 8.1.A, same values)
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-launch L-45). Re-checked against the fresh page text in the 2026-10-08 fix round.
- **F-46** Humanity's Last Exam, with tools (chart unit: score, %): Haiku 5.5 57.4%; Haiku 4.5 18.7%; GPT-6 Luna shows a dash (no value); Sonnet 5.5 64.5%.
  - Quote: "57.4%with tools | 18.7%with tools | — | [empty] | 64.5%with tools"
  - Source: https://www.anthropic.com/claude-haiku-5-5 (table); system card PDF p. 111 (Table 8.1.A, same values)
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-launch L-46). Re-checked against the fresh page text in the 2026-10-08 fix round.
- **F-47** Terminal-Bench 4.0 (chart unit: see F-58): Haiku 5.5 39.2% (the system card qualifies this as "with safeguards enabled", see below); Haiku 4.5 0.0%; GPT-6 Luna 16.4%; Sonnet 5.5 70.6%.
  - Quote: "Terminal-Bench 4.0 | 39.2% | 0.0% | 16.4% | [empty] | 70.6%"
  - Source: https://www.anthropic.com/claude-haiku-5-5 (table); system card PDF p. 115 (section 8.4) for the qualifier below
  - System card qualifier (PDF p. 115): "Claude Haiku 5.5 scored 39.2% on Terminal-Bench 4.0 with safeguards enabled." The card adds: "We ran Haiku 5.5 without a fallback model, so when the safeguards flagged a request the trial stopped there." ("This happened in 1.8% of trials (12 of 660, 10 of them on a single task), and all of these trials failed.") and "We ran the evaluation for Haiku 5.5 with no internet egress allowed."
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-launch L-47). Re-checked against the fresh page text in the 2026-10-08 fix round.
- **F-48** FrontierCode 1.1 (Main): Haiku 5.5 46.4%; Haiku 4.5 shows a dash (no value); GPT-6 Luna 42.4%; Sonnet 5.5 52.1%, carrying the qualifier "Xhigh" (not defined on the page; see the qualifier line below).
  - Quote: "FrontierCode 1.1 (Main) | 46.4% | — | 42.4% | [empty] | 52.1%Xhigh"
  - Source: https://www.anthropic.com/claude-haiku-5-5 (table); system card PDF pp. 111 and 113
  - Qualifier (system card): Table 8.1.A (PDF p. 111) gives FrontierCode 1.1 (Main) at "(max)" and "(xhigh)". PDF p. 113 says: "Its best scores were 52.1% and 64.4%, at xhigh." So Haiku 5.5's 46.4% is its max-effort score (F-204), and Sonnet 5.5's 52.1% is its xhigh score.
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-launch L-48). Re-checked against the fresh page text in the 2026-10-08 fix round.
- **F-49** Chartography, no tools: Haiku 5.5 46.4%; Haiku 4.5 6.4%; GPT-6 Luna 29.1%; Sonnet 5.5 61.6%. The system card gives Haiku 5.5 86.2% with tools (F-208).
  - Quote: "Chartography | 46.4%no tools | 6.4%no tools | 29.1%no tools | [empty] | 61.6%no tools"
  - Source: https://www.anthropic.com/claude-haiku-5-5
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-launch L-49). Re-checked against the fresh page text in the 2026-10-08 fix round.
- **F-50** Evaluation method: "For details on how we run our evaluations, see the Haiku 5.5 System Card."
  - Quote: "For details on how we run our evaluations, see the Haiku 5.5 System Card."
  - Source: https://www.anthropic.com/claude-haiku-5-5
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-launch L-51).
- **F-51** Anthropic defines OSWorld 2.1 as measuring "how well agents can operate a real computer to finish long, multi-step tasks."
  - Quote: "OSWorld 2.1 measures how well agents can operate a real computer to finish long, multi-step tasks."
  - Source: https://www.anthropic.com/claude-haiku-5-5
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-launch L-52).
- **F-52** GDPval-AA v2.1 is Artificial Analysis's benchmark evaluating agents on real-world professional work across 44 occupations.
  - Quote: "Artificial Analysis’s GDPval-AA v2.1 evaluates agents on real-world professional work across 44 occupations."
  - Source: https://www.anthropic.com/claude-haiku-5-5
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-launch L-53).
- **F-53** Humanity's Last Exam (HLE) is "a test of expert-level academic knowledge and reasoning".
  - Quote: "Humanity’s Last Exam (HLE) is a test of expert-level academic knowledge and reasoning."
  - Source: https://www.anthropic.com/claude-haiku-5-5
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-launch L-54).
- **F-54** Terminal-Bench 4.0 measures how well a model can complete complex, multi-step professional tasks within a command-line interface.
  - Quote: "Terminal-Bench 4.0 measures how well a model can complete complex, multi-step professional tasks within a command-line interface."
  - Source: https://www.anthropic.com/claude-haiku-5-5
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-launch L-55).
- **F-55** GDPval-AA chart y-axis unit: "Elo, as reported".
  - Quote: "Elo, as reported"
  - Source: https://www.anthropic.com/claude-haiku-5-5 (chart axis label)
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-launch L-56).
- **F-56** OSWorld chart y-axis unit: "Partial-credit score (%)".
  - Quote: "Partial-credit score (%)"
  - Source: https://www.anthropic.com/claude-haiku-5-5 (chart axis label)
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-launch L-57).
- **F-57** Humanity's Last Exam chart y-axis unit: "Score (%)".
  - Quote: "Score (%)"
  - Source: https://www.anthropic.com/claude-haiku-5-5 (chart axis label)
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-launch L-58).
- **F-58** Terminal-Bench 4.0 chart y-axis unit: "Score (pass@1, %)".
  - Quote: "Score (pass@1, %)"
  - Source: https://www.anthropic.com/claude-haiku-5-5 (chart axis label)
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-launch L-59).
- **F-59** The effort-setting charts show how Haiku 5.5 performs on three benchmarks at each effort setting.
  - Quote: "The charts below show how Haiku 5.5 performs on three benchmarks at each effort setting:"
  - Source: https://www.anthropic.com/claude-haiku-5-5
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-launch L-60).
- **F-60** Effort levels labelled on the charts: Low, Med, High, Xhigh, Max.
  - Quote: "Low Med High Xhigh Max"
  - Source: https://www.anthropic.com/claude-haiku-5-5 (chart legends)
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-launch L-61, quote corrected to the separate labels).
- **F-61** Haiku 4.5, not Haiku 5.5: "Claude Haiku 4.5 scores 73.3% on SWE-bench Verified, making it one of the world’s best coding models." The page gives no Haiku 5.5 SWE-bench figure. Haiku 5.5's SWE-bench results are in F-201 to F-203 (system card: SWE-Bench Pro, SWE-bench Multilingual and SWE-bench Multimodal; no SWE-bench Verified result).
  - Quote: "Claude Haiku 4.5 scores 73.3% on SWE-bench Verified, making it one of the world’s best coding models."
  - Source: https://www.anthropic.com/claude/haiku (announcements, Haiku 4.5 entry)
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-launch L-92). Fix round 2026-10-08: the earlier note that this was the only SWE-bench figure on the primary pages was wrong and is removed.

## Context and output

- **F-62** Claude Haiku 5.5 has a 1M-token context window.
  - Quote: "Claude Haiku 5.5, and Claude Mythos Preview have a 1M-token context window."
  - Source: https://platform.claude.com/docs/en/build-with-claude/context-windows ; https://platform.claude.com/docs/en/models/overview ; https://platform.claude.com/docs/en/release-notes/overview ("It has a 1M token context window, 128k max output tokens")
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-api-pricing A-34).
- **F-63** Anthropic's overview note: 1M tokens is roughly 555k words or 2.5M Unicode characters on the current tokenizer.
  - Quote: "1M tokens is roughly 555k words or 2.5M Unicode characters on the current tokenizer"
  - Source: https://platform.claude.com/docs/en/models/overview.md (Markdown copy, note under the table; the rendered HTML page does not carry this quote)
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-api-pricing A-36). Re-checked against the fresh page text in the 2026-10-08 fix round.
- **F-64** Max output for Haiku 5.5 is 128K tokens; the overview note says this is the synchronous Messages API limit.
  - Quote: "Max output | 128K tokens | 128K tokens | 128K tokens | 128K tokens"
  - Source: https://platform.claude.com/docs/en/models/overview (table row, rendered HTML); https://platform.claude.com/docs/en/models/overview.md (note under the table: "Synchronous Messages API limit."; not on the rendered HTML page)
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-api-pricing A-37 and A-38). Re-checked against the fresh page text in the 2026-10-08 fix round.
- **F-65** A single Haiku 5.5 request can generate up to 128k output tokens (max_tokens).
  - Quote: "A single request to any of them can generate up to 128k output tokens (max_tokens)."
  - Source: https://platform.claude.com/docs/en/build-with-claude/context-windows
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-api-pricing A-39).
- **F-66** Compared with Haiku 4.5, Haiku 5.5 has context up from 200k to 1M tokens and max output up from 64k to 128k.
  - Quote: "Claude Haiku 5.5 has a 1M token context window and returns up to 128k output tokens, up from 200k and 64k on Claude Haiku 4.5."
  - Source: https://platform.claude.com/docs/en/models/haiku-5-5/whats-new-haiku-5-5
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-api-pricing A-40).
- **F-67** On the Message Batches API, Haiku 5.5 supports up to 300k output tokens with the output-300k-2026-03-24 beta header. Platform scope is in conflict; see Conflicts C-10.
  - Quote: "On the Message Batches API, Claude Haiku 5.5 supports up to 300k output tokens with the output-300k-2026-03-24 beta header."
  - Source: https://platform.claude.com/docs/en/models/haiku-5-5/overview ; https://platform.claude.com/docs/en/models/overview ; https://platform.claude.com/docs/en/build-with-claude/thinking (table row "Claude Haiku 5.5 | 128K | 300K", beta ceiling); https://platform.claude.com/docs/en/build-with-claude/batch-processing
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md N-08 for the thinking-page row).
- **F-68** Reliable knowledge cutoff for Haiku 5.5: Jun 2026 (month only; no day is published). The Help Center says it was "trained on data up until June 2026."
  - Quote: "Reliable knowledge cutoff | Jun 2026 | Jun 2026 | Jun 2026 | Jun 2026"
  - Source: https://platform.claude.com/docs/en/models/overview ; https://support.claude.com/en/articles/8114494-how-up-to-date-is-claude-s-training-data
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-14; script re-check; P-72 for the Help Center sentence).
- **F-69** Training data cutoff for Haiku 5.5: Jun 2026 (month only).
  - Quote: "Training data cutoff | Jun 2026 | Jun 2026 | Jun 2026 | Jun 2026"
  - Source: https://platform.claude.com/docs/en/models/overview
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-15; script re-check).
- **F-70** Help Center context-window tables give Haiku 5.5 a 1M-token window in chat and in Claude Code.
  - Quote: "Claude Haiku 5.5 | 1M tokens"
  - Source: https://support.claude.com/en/articles/8606394-how-large-is-the-context-window-on-paid-claude-plans
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-69 and P-70; script re-check).
- **F-71** In Claude Cowork, Haiku 5.5's context window is 500K tokens.
  - Quote: "Claude Haiku 5.5 | 500K tokens"
  - Source: https://support.claude.com/en/articles/8606394-how-large-is-the-context-window-on-paid-claude-plans
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-71; script re-check).
- **F-72** The Help Center context-window article covers paid plans (Pro, Max, Team, Enterprise); it gives no Free-plan figure.
  - Quote: "This article explains how large the context window is on paid Claude plans (Pro, Max, Team, Enterprise) when you chat with Claude, or use Claude Code or Claude Cowork."
  - Source: https://support.claude.com/en/articles/8606394-how-large-is-the-context-window-on-paid-claude-plans
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-68; script re-check).
- **F-73** On the Anthropic API, Haiku 5.5 uses the 1M window on every plan, including Pro, with no [1m] variant (Claude Code documentation).
  - Quote: "On the Anthropic API, Fable 5.1, Fable 5, Sonnet 5 and later, Haiku 5.5, and Opus 4.7 and later run with the 1M window on every plan, including Pro."
  - Source: https://code.claude.com/docs/en/model-config
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-95; script re-check).
- **F-74** A single request can include up to 600 images or PDF pages; the page gives 100 for models with a 200k-token context window. Haiku 5.5's window is in F-62.
  - Quote: "A single request can include up to 600 images or PDF pages (100 for models with a 200k-token context window)."
  - Source: https://platform.claude.com/docs/en/build-with-claude/context-windows
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-api-pricing A-42).
- **F-75** The API keeps previous Haiku 5.5 thinking blocks by default, and they count toward the context window like any other input tokens.
  - Quote: "Claude Haiku 5.5, Claude Fable 5.1, Claude Mythos 5.1, Claude Fable 5, Claude Mythos 5, and Claude Mythos Preview, the API keeps previous thinking blocks by default, and they count toward the context window like any other input tokens"
  - Source: https://platform.claude.com/docs/en/build-with-claude/context-windows
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-api-pricing A-44).
- **F-76** On Google Cloud (Agent Platform), Haiku 5.5 has a 1M-token context window.
  - Quote: "Claude Fable 5.1, Claude Fable 5, Claude Opus 5.5, Claude Opus 5, Claude Opus 4.8, Claude Opus 4.7, Claude Opus 4.6, Claude Sonnet 5.5, Claude Sonnet 5, Claude Sonnet 4.6, and Claude Haiku 5.5 have a 1M-token context window on Agent Platform."
  - Source: https://platform.claude.com/docs/en/build-with-claude/claude-on-vertex-ai
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-39; script re-check).
- **F-77** On Microsoft Foundry, Haiku 5.5 has a 1M-token context window.
  - Quote: "Claude Fable 5.1, Claude Fable 5, Claude Opus 5.5, Claude Opus 5, Claude Opus 4.8, Claude Opus 4.7, Claude Opus 4.6, Claude Sonnet 5.5, Claude Sonnet 5, Claude Sonnet 4.6, and Claude Haiku 5.5 have a 1M-token context window on Microsoft Foundry."
  - Source: https://platform.claude.com/docs/en/build-with-claude/claude-in-microsoft-foundry
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-46; script re-check).
- **F-78** On Amazon Bedrock, Haiku 5.5 has a 1M-token context window (stated on the legacy Bedrock page).
  - Quote: "Claude Fable 5.1, Claude Fable 5, Claude Opus 5.5, Claude Opus 5, Claude Opus 4.8, Claude Opus 4.7, Claude Opus 4.6, Claude Sonnet 5.5, Claude Sonnet 5, Claude Sonnet 4.6, and Claude Haiku 5.5 have a 1M-token context window on Amazon Bedrock."
  - Source: https://platform.claude.com/docs/en/build-with-claude/claude-on-amazon-bedrock-legacy
  - Accessed 2026-10-08. Status: NEW-VERIFIED by independent re-fetch (verify-platforms-family.md N-10; script re-check). The legacy page is titled for Opus 4.6 and earlier.
- **F-79** Context-window sizes on Claude Platform on AWS are identical to the first-party Claude API; that page gives no Haiku-specific number.
  - Quote: "Context-window sizes on Claude Platform on AWS are identical to the first-party Claude API."
  - Source: https://platform.claude.com/docs/en/build-with-claude/claude-platform-on-aws
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-37; script re-check).

## Pricing

Pricing is in dollars ($) per million tokens (MTok). Prompts up to 100,000 tokens and prompts over 100,000 tokens are priced separately.

- **F-80** Haiku 5.5 prices are quoted per million tokens, with separate tiers for prompts up to and over 100k tokens.
  - Quote: "Price per 1 million tokens | Haiku 5.5 prompts up to / over 100k | Haiku 4.5 | Sonnet 5.5"
  - Source: https://www.anthropic.com/claude-haiku-5-5 (pricing table header)
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-launch L-63).
- **F-81** For prompts up to 100K tokens, Haiku 5.5 costs $0.10 per million input tokens and $0.50 per million output tokens.
  - Quote: "For prompts up to 100K tokens, it is $0.10 per million input tokens and $0.50 per million output tokens."
  - Source: https://www.anthropic.com/claude/haiku ; https://platform.claude.com/docs/en/models/haiku-5-5/overview ; https://platform.claude.com/docs/en/about-claude/pricing ; https://claude.com/pricing
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-64 and N-03; script re-check).
- **F-82** For prompts over 100K tokens, Haiku 5.5 costs $0.50 per million input tokens and $2.50 per million output tokens.
  - Quote: "For prompts over 100K tokens, it is $0.50 per million input tokens and $2.50 per million output tokens."
  - Source: https://www.anthropic.com/claude/haiku ; https://platform.claude.com/docs/en/models/haiku-5-5/overview ; https://platform.claude.com/docs/en/about-claude/pricing ; https://claude.com/pricing
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-65 and N-04; script re-check).
- **F-83** Launch-post pricing table, input tokens per MTok: Haiku 5.5 $0.10 (prompts up to 100k) / $0.50 (over 100k); Haiku 4.5 $1.00; Sonnet 5.5 $2.00.
  - Quote: "Input tokens | $0.10 / $0.50 | $1.00 | $2.00"
  - Source: https://www.anthropic.com/claude-haiku-5-5
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-launch L-64). Re-checked against the fresh page text in the 2026-10-08 fix round.
- **F-84** Launch-post pricing table, output tokens per MTok: Haiku 5.5 $0.50 / $2.50; Haiku 4.5 $5.00; Sonnet 5.5 $10.00.
  - Quote: "Output tokens | $0.50 / $2.50 | $5.00 | $10.00"
  - Source: https://www.anthropic.com/claude-haiku-5-5
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-launch L-65).
- **F-85** Compared with Haiku 4.5, Haiku 5.5 costs around 75% less to run on average.
  - Quote: "Haiku 5.5 is available at a much lower price than Haiku 4.5. On average, it now costs around 75% less to run."
  - Source: https://www.anthropic.com/claude-haiku-5-5
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-launch L-69).
- **F-86** The footnote says Haiku 5.5 is priced 90% lower than Haiku 4.5 for requests up to 100,000 tokens, and 50% lower for requests over 100,000 tokens.
  - Quote: "Claude Haiku 5.5 is priced 90% lower than Claude Haiku 4.5 for requests up to 100,000 tokens, and 50% lower for requests over 100,000 tokens."
  - Source: https://www.anthropic.com/claude-haiku-5-5 (footnote 2)
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-launch L-70).
- **F-87** Anthropic's value rationale: Haiku 5.5 is especially good value for prompts up to 100,000 tokens, which make up around 90% of requests to the previous Haiku model.
  - Quote: "Haiku 5.5 is especially good value when used for tasks with prompts up to 100,000 tokens, which make up around 90% of requests to our previous Haiku model."
  - Source: https://www.anthropic.com/claude-haiku-5-5
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-launch L-68).
- **F-88** Caveat: Haiku 5.5 has an updated tokenizer, so it uses slightly more tokens per task.
  - Quote: "Haiku 5.5 has an updated tokenizer (similar to Sonnet 5.5’s and Opus 5.5’s), which means it uses slightly more tokens per task."
  - Source: https://www.anthropic.com/claude-haiku-5-5 (footnote 2)
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-launch L-71).
- **F-89** Cache read (hit), prompts up to 100,000 tokens: $0.01 per MTok.
  - Quote: "$0.01 / MTok for prompts up to 100,000 tokens"
  - Source: https://platform.claude.com/docs/en/models/haiku-5-5/overview ; https://platform.claude.com/docs/en/build-with-claude/prompt-caching ; https://claude.com/pricing
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-api-pricing A-70).
- **F-90** Cache read (hit), prompts over 100,000 tokens: $0.05 per MTok.
  - Quote: "$0.05 / MTok for prompts over 100,000 tokens"
  - Source: https://platform.claude.com/docs/en/models/haiku-5-5/overview ; https://claude.com/pricing
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-api-pricing A-71).
- **F-91** Cache write (5m), prompts up to 100,000 tokens: $0.125 per MTok.
  - Quote: "$0.125 / MTok for prompts up to 100,000 tokens" (row label: "5m cache write")
  - Source: https://platform.claude.com/docs/en/models/haiku-5-5/overview (pricing block)
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-api-pricing A-66). Re-checked against the fresh page text in the 2026-10-08 fix round.
- **F-92** Cache write (5m), prompts over 100,000 tokens: $0.625 per MTok.
  - Quote: "$0.625 / MTok for prompts over 100,000 tokens" (row label: "5m cache write")
  - Source: https://platform.claude.com/docs/en/models/haiku-5-5/overview (pricing block)
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-api-pricing A-67). Re-checked against the fresh page text in the 2026-10-08 fix round.
- **F-93** Cache write (1h), prompts up to 100,000 tokens: $0.20 per MTok.
  - Quote: "$0.20 / MTok for prompts up to 100,000 tokens" (row label: "1h cache write")
  - Source: https://platform.claude.com/docs/en/models/haiku-5-5/overview (pricing block)
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-api-pricing A-68). Re-checked against the fresh page text in the 2026-10-08 fix round.
- **F-94** Cache write (1h), prompts over 100,000 tokens: $1 per MTok.
  - Quote: "$1 / MTok for prompts over 100,000 tokens" (row label: "1h cache write")
  - Source: https://platform.claude.com/docs/en/models/haiku-5-5/overview (pricing block)
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-api-pricing A-69). Re-checked against the fresh page text in the 2026-10-08 fix round.
- **F-95** 5-minute cache write costs 1.25x the base input price.
  - Quote: "5-minute cache write | 1.25x base input price"
  - Source: https://platform.claude.com/docs/en/about-claude/pricing (prompt caching multipliers)
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-api-pricing A-81).
- **F-96** 1-hour cache write costs 2x the base input price.
  - Quote: "1-hour cache write | 2x base input price"
  - Source: https://platform.claude.com/docs/en/about-claude/pricing (prompt caching multipliers)
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-api-pricing A-82).
- **F-97** Cache hits use the standard 0.1x multiplier; the pricing page lists only Fable 5.1, Mythos 5.1, Opus 5.5 and Sonnet 5.5 as exceptions, and Haiku 5.5 is not among them.
  - Quote: "All other models use the standard 0.1x multiplier."
  - Source: https://platform.claude.com/docs/en/about-claude/pricing (footnotes under the model pricing table)
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-api-pricing A-83).
- **F-98** Overview: batch requests are 50% off, and prompt cache reads cost 10% of base input (Haiku 5.5 is not named in the 2.5% or 5% exceptions).
  - Quote: "Batch API requests are 50% off; prompt cache reads cost 10% of the base input price (2.5% on Claude Fable 5.1 and Claude Mythos 5.1, 5% on Claude Opus 5.5 and Claude Sonnet 5.5)."
  - Source: https://platform.claude.com/docs/en/models/overview.md (Markdown copy, bullet "Pricing"; the rendered HTML page does not carry this quote)
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-06; script re-check). Re-checked against the fresh page text in the 2026-10-08 fix round.
- **F-99** The minimum cacheable prompt for Haiku 5.5 is 512 tokens.
  - Quote: "512 tokens for Claude Fable 5.1, Claude Mythos 5.1, Claude Opus 5.5, Claude Opus 5, Claude Sonnet 5.5, Claude Fable 5, Claude Mythos 5, and Claude Haiku 5.5"
  - Source: https://platform.claude.com/docs/en/build-with-claude/prompt-caching
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-api-pricing A-84).
- **F-100** Savings: "You can save up to 90% with prompt caching and 50% with batch processing."
  - Quote: "You can save up to 90% with prompt caching and 50% with batch processing."
  - Source: https://www.anthropic.com/claude/haiku (availability and pricing)
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-66; independent re-fetch of L-74).
- **F-101** The claude.com caching prices are for the 5-minute cache TTL; the longer-TTL write price is not shown there.
  - Quote: "Prompt caching pricing reflects 5-minute TTL."
  - Source: https://claude.com/pricing
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-api-pricing A-97).
- **F-102** Batch API: 50% discount on input and output tokens.
  - Quote: "50% discount on input and output"
  - Source: https://platform.claude.com/docs/en/models/haiku-5-5/overview
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-api-pricing A-72).
- **F-103** Batch prices for prompts up to 100,000 tokens: $0.05 per MTok input and $0.25 per MTok output.
  - Quote: "$0.05 / MTokfor prompts up to 100,000 tokens | $0.25 / MTok" (Haiku 5.5 row of the batch table: Input | Output)
  - Source: https://platform.claude.com/docs/en/about-claude/pricing (batch processing table)
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-api-pricing A-77). Re-checked against the fresh page text in the 2026-10-08 fix round.
- **F-104** Batch prices for prompts over 100,000 tokens: $0.25 per MTok input and $1.25 per MTok output.
  - Quote: "$0.25 / MTokfor prompts over 100,000 tokens | $1.25 / MTok" (second price row for Haiku 5.5: Input | Output)
  - Source: https://platform.claude.com/docs/en/about-claude/pricing (batch processing table)
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-api-pricing A-78). Re-checked against the fresh page text in the 2026-10-08 fix round.
- **F-105** Haiku 5.5 is priced by prompt length: a prompt of over 100,000 tokens pays higher prices.
  - Quote: "Claude Haiku 5.5 is priced by prompt length: a prompt of over 100,000 tokens pays higher prices."
  - Source: https://platform.claude.com/docs/en/about-claude/pricing (long context pricing) ; https://code.claude.com/docs/en/model-config ("A Haiku 5.5 request costs more per token when its prompt is longer than 100K tokens.")
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-api-pricing A-86).
- **F-106** The 1M-token context window is at standard pricing for Claude 4.6 and later models except Claude Haiku 5.5.
  - Quote: "Claude 4.6 and later models (except Claude Haiku 5.5) and Claude Mythos Preview include the full 1M token context window at standard pricing."
  - Source: https://platform.claude.com/docs/en/about-claude/pricing (long context pricing)
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-api-pricing A-87).
- **F-107** Tool-use system prompt for Haiku 5.5: 286 tokens with tool_choice auto or none; 406 tokens with any or tool.
  - Quote: "auto, none | 286 tokens" and "any, tool | 406 tokens" (two rows under Claude Haiku 5.5 in the tool-use table)
  - Source: https://platform.claude.com/docs/en/about-claude/pricing (tool use pricing table)
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-api-pricing A-88). Re-checked against the fresh page text in the 2026-10-08 fix round.
- **F-108** On Amazon Bedrock, regional endpoints carry a 10% pricing premium over global endpoints (stated for endpoints generally, not per model).
  - Quote: "Regional endpoints carry a 10% pricing premium over global endpoints."
  - Source: https://platform.claude.com/docs/en/build-with-claude/claude-in-amazon-bedrock
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-32; script re-check).
- **F-109** Scope "Claude 4.6 and later": US-only inference through inference_geo costs 1.1x on all token pricing categories.
  - Quote: "For Claude 4.6 and later models, specifying US-only inference through the inference_geo parameter incurs a 1.1x multiplier on all token pricing categories, including input tokens, output tokens, cache writes, and cache reads."
  - Source: https://platform.claude.com/docs/en/about-claude/pricing (data residency pricing) ; https://claude.com/pricing (US-only inference at 1.1x for input and output tokens)
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-api-pricing A-91).
- **F-110** On Claude Platform on AWS, token usage is rated in USD at standard per-model rates (the same as Claude API pricing) and converted to CCUs at $0.01 per CCU. No Haiku 5.5 price row is on that page.
  - Quote: "Anthropic rates your token usage in USD at standard per-model, per-feature rates, applies any negotiated discount, converts the result to CCUs at $0.01 per CCU, and reports the CCU quantity to AWS Marketplace hourly."
  - Source: https://platform.claude.com/docs/en/about-claude/pricing#claude-platform-on-aws-pricing
  - Accessed 2026-10-08. Status: NEW-VERIFIED by independent re-fetch (verify-platforms-family.md N-01; script re-check).
- **F-111** On Microsoft Foundry, usage is rated the same way and billed through the Azure Marketplace; the Foundry page says Claude usage is billed in the Azure Marketplace.
  - Quote: "Anthropic rates your token usage in USD at standard per-model, per-feature rates, applies any negotiated discount, converts the result to CCUs at $0.01 per CCU, and reports the CCU quantity to the Azure Marketplace hourly."
  - Source: https://platform.claude.com/docs/en/about-claude/pricing#claude-in-microsoft-foundry-pricing ; https://platform.claude.com/docs/en/build-with-claude/claude-in-microsoft-foundry
  - Accessed 2026-10-08. Status: NEW-VERIFIED by independent re-fetch (verify-platforms-family.md N-02 and P-47; script re-check).
- **F-112** A Message Batch is limited to 100,000 Message requests or 256 MB in size, whichever is reached first.
  - Quote: "A Message Batch is limited to either 100,000 Message requests or 256 MB in size, whichever is reached first."
  - Source: https://platform.claude.com/docs/en/build-with-claude/batch-processing
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-api-pricing A-99).
- **F-113** Batches expire if processing does not complete within 24 hours.
  - Quote: "Batches expire if processing does not complete within 24 hours."
  - Source: https://platform.claude.com/docs/en/build-with-claude/batch-processing
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-api-pricing A-100).
- **F-114** Batch results can be downloaded for 29 days after creation.
  - Quote: "Batch results are available for 29 days after creation."
  - Source: https://platform.claude.com/docs/en/build-with-claude/batch-processing
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-api-pricing A-101).

## Availability

- **F-115** The Haiku 5.5 model page lists these platforms: Claude API, Amazon Bedrock, Google Cloud, Microsoft Foundry, and Claude Platform on AWS.
  - Quote: "Claude APIAmazon BedrockGoogle CloudMicrosoft FoundryClaude Platform on AWS" (the five names are separate elements that run together in the page text)
  - Source: https://platform.claude.com/docs/en/models/haiku-5-5/overview (availability, platforms row)
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-api-pricing A-10; notes-platforms-family N-11). Re-checked against the fresh page text in the 2026-10-08 fix round.
- **F-116** Launch-post wording: Haiku 5.5 "is available now on all platforms, including Amazon Web Services, Google Cloud, and Microsoft Azure." The naming differs from the other pages; see Conflicts C-1.
  - Quote: "Claude Haiku 5.5 is available now on all platforms, including Amazon Web Services, Google Cloud, and Microsoft Azure."
  - Source: https://www.anthropic.com/claude-haiku-5-5
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-launch L-81).
- **F-117** Product page: for developers building agents, Haiku 5.5 is available on the Claude Platform natively, and in Amazon Web Services, Google Cloud, and Microsoft Foundry.
  - Quote: "For developers interested in building agents, Haiku 5.5 is available on the Claude Platform natively, and in Amazon Web Services, Google Cloud, and Microsoft Foundry."
  - Source: https://www.anthropic.com/claude/haiku
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-61; script re-check).
- **F-118** API release notes: "It's available on the Claude API, Claude in Amazon Bedrock, Claude Platform on AWS, Claude on Google Cloud, and Claude in Microsoft Foundry."
  - Quote: "It's available on the Claude API, Claude in Amazon Bedrock, Claude Platform on AWS, Claude on Google Cloud, and Claude in Microsoft Foundry."
  - Source: https://platform.claude.com/docs/en/release-notes/overview
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-launch L-86).
- **F-119** Developers can get started with claude-haiku-5-5 on the Claude Platform.
  - Quote: "On the Claude Platform, developers can get started with claude-haiku-5-5."
  - Source: https://www.anthropic.com/claude-haiku-5-5
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-launch L-82).
- **F-120** Claude apps: Free, Pro, Max, Team and Enterprise users can select Haiku 5.5 on Claude.ai, on web, iOS and Android.
  - Quote: "Free, Pro, Max, Team, and Enterprise users can select Haiku 5.5 on Claude.ai, available on web, iOS, and Android."
  - Source: https://www.anthropic.com/claude/haiku
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-60; script re-check).
- **F-121** Haiku 5.5 is also available in Claude Code.
  - Quote: "Claude Haiku 5.5 is also available in Claude Code."
  - Source: https://www.anthropic.com/claude/haiku
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-62; script re-check).
- **F-122** Claude Code's supported-models list includes Haiku 5.5 with the ID claude-haiku-5-5.
  - Quote: "Haiku 5.5, claude-haiku-5-5"
  - Source: https://support.claude.com/en/articles/11940350-claude-code-model-configuration
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-76; script re-check).
- **F-123** To start a Claude Code session on Haiku 5.5: claude --model claude-haiku-5-5.
  - Quote: "For Haiku 5.5: claude --model claude-haiku-5-5"
  - Source: https://support.claude.com/en/articles/11940350-claude-code-model-configuration
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-77; script re-check).
- **F-124** Claude Code v2.1.293 or later is needed for Haiku 5.5.
  - Quote: "Use v2.1.293 or later with Haiku 5.5. Run claude update to upgrade."
  - Source: https://code.claude.com/docs/en/model-config
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-88; script re-check).
- **F-125** From Claude Code v2.1.293, the haiku alias resolves to Haiku 5.5 on the Anthropic API.
  - Quote: "v2.1.293 | haiku resolves to Haiku 5.5 on the Anthropic API"
  - Source: https://code.claude.com/docs/en/model-config (version history)
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-89; script re-check).
- **F-126** On third-party deployments, Claude Code's built-in alias defaults can lag the newest release, so model IDs should be pinned.
  - Quote: "Without pinning, Claude Code uses model aliases such as fable, opus, sonnet, and haiku that resolve to a built-in default model ID for each provider. That default can lag the newest Anthropic release, and the model it points to may not yet be enabled in a user’s account."
  - Source: https://code.claude.com/docs/en/model-config
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-100; script re-check).
- **F-127** On Amazon Bedrock, the global endpoint is available for Haiku 5.5.
  - Quote: "The global endpoint is available for Claude Fable 5.1, Claude Fable 5, Claude Opus 5.5, Claude Opus 5, Claude Opus 4.8, Claude Opus 4.7, Claude Sonnet 5.5, Claude Sonnet 5, Claude Haiku 5.5, and Claude Haiku 4.5."
  - Source: https://platform.claude.com/docs/en/build-with-claude/claude-in-amazon-bedrock
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-31; script re-check).
- **F-128** Bedrock's supported-models table gives Haiku 5.5 the access entry "See Access"; the access criteria are not stated on the page.
  - Quote: "Claude Haiku 5.5 | anthropic.claude-haiku-5-5 | See Access"
  - Source: https://platform.claude.com/docs/en/build-with-claude/claude-in-amazon-bedrock
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-28; script re-check).
- **F-129** Haiku 5.5 is not in the Bedrock list of models open to all customers; Haiku 4.5 is.
  - Quote: "Claude Fable 5.1, Claude Fable 5, Claude Opus 4.8, Claude Sonnet 5, Claude Opus 4.7, and Claude Haiku 4.5 are open to all Amazon Bedrock customers."
  - Source: https://platform.claude.com/docs/en/build-with-claude/claude-in-amazon-bedrock
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-30; script re-check).
- **F-130** Foundry default deployment name for Haiku 5.5 is claude-haiku-5-5, checked for both Hosted on Azure and Hosted on Anthropic.
  - Quote: "Claude Haiku 5.5 | claude-haiku-5-5 | ✓ | ✓"
  - Source: https://platform.claude.com/docs/en/build-with-claude/claude-in-microsoft-foundry
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-43; script re-check).
- **F-131** Foundry hosting options: Hosted on Azure offers "The latest models in the Opus, Sonnet, and Haiku families"; Hosted on Anthropic offers "All Claude models available on Microsoft Foundry".
  - Quote: "Model availability | The latest models in the Opus, Sonnet, and Haiku families | All Claude models available on Microsoft Foundry"
  - Source: https://platform.claude.com/docs/en/build-with-claude/claude-in-microsoft-foundry
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-45; script re-check).
- **F-132** Claude Platform on AWS is operated by Anthropic; Amazon Bedrock is operated by AWS.
  - Quote: "Unlike Amazon Bedrock, where AWS operates the inference stack, Anthropic operates Claude Platform on AWS."
  - Source: https://platform.claude.com/docs/en/build-with-claude/claude-platform-on-aws
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-36; script re-check).
- **F-133** Help Center web search model list includes Haiku 5.5, listed first.
  - Quote: "Haiku 5.5 Sonnet 5.5 Opus 5.5 Fable 5.1"
  - Source: https://support.claude.com/en/articles/10684626-enable-and-use-web-search
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-74; list items sit on separate lines on the page).
- **F-134** On Team and Enterprise, an Owner or Primary Owner must first enable web search for the workspace; the article does not say this applies per model.
  - Quote: "An Owner or Primary Owner must first enable web search for the entire workspace in Organization settings > Capabilities."
  - Source: https://support.claude.com/en/articles/10684626-enable-and-use-web-search
  - Accessed 2026-10-08. Status: ADJUSTED by independent re-fetch (verify-platforms-family.md P-75; corrected value used).
- **F-135** API rate limit, Start tier (per model): 1,000 requests per minute; 2,000,000 input tokens per minute; 400,000 output tokens per minute.
  - Quote: "Claude Haiku 5.5 | 1,000 | 2,000,000 | 400,000"
  - Source: https://platform.claude.com/docs/en/api/rate-limits
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-api-pricing A-47).
- **F-136** API rate limit, Build tier (per model): 5,000 requests per minute; 5,000,000 input tokens per minute; 1,000,000 output tokens per minute.
  - Quote: "Claude Haiku 5.5 | 5,000 | 5,000,000 | 1,000,000"
  - Source: https://platform.claude.com/docs/en/api/rate-limits
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-api-pricing A-48).
- **F-137** API rate limit, Scale tier (per model): 10,000 requests per minute; 10,000,000 input tokens per minute; 2,000,000 output tokens per minute.
  - Quote: "Claude Haiku 5.5 | 10,000 | 10,000,000 | 2,000,000"
  - Source: https://platform.claude.com/docs/en/api/rate-limits
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-api-pricing A-49).
- **F-138** Rate limits apply separately to each model, so Haiku 5.5 has its own limits.
  - Quote: "Rate limits are applied separately for each model; therefore you can use different models up to their respective limits simultaneously."
  - Source: https://platform.claude.com/docs/en/api/rate-limits
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-api-pricing A-50).

## Family

Overview comparison table: columns are Claude Fable 5.1, Claude Opus 5.5, Claude Sonnet 5.5, Claude Haiku 5.5.

- **F-139** Overview-table descriptions: Fable 5.1 for demanding reasoning and long-horizon agentic work; Opus 5.5 for long-running agentic coding and knowledge work; Sonnet 5.5 the best combination of speed and intelligence; Haiku 5.5 for high-volume, latency-sensitive tasks such as classification, extraction, and routing.
  - Quote: "Description | For demanding reasoning and long-horizon agentic work | For long-running agentic coding and knowledge work | The best combination of speed and intelligence | For high-volume, latency-sensitive tasks such as classification, extraction, and routing"
  - Source: https://platform.claude.com/docs/en/models/overview.md (Markdown copy of the overview table; the rendered HTML shows the same descriptions without the "Description" label)
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-02; script re-check). Re-checked against the fresh page text in the 2026-10-08 fix round.
- **F-140** Overview-table latency labels (relative to the current lineup): Fable 5.1 Slower; Opus 5.5 Moderate; Sonnet 5.5 Fast; Haiku 5.5 Fastest.
  - Quote: "Comparative latency | Slower | Moderate | Fast | Fastest"
  - Source: https://platform.claude.com/docs/en/models/overview
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-03; script re-check).
- **F-141** Overview-table context window: 1M tokens for each of Fable 5.1, Opus 5.5, Sonnet 5.5 and Haiku 5.5.
  - Quote: "Context window | 1M tokens | 1M tokens | 1M tokens | 1M tokens"
  - Source: https://platform.claude.com/docs/en/models/overview
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-07; script re-check).
- **F-142** Overview-table prices per million tokens: Fable 5.1 $10 input / $50 output; Opus 5.5 $4 / $20; Sonnet 5.5 $2 / $10; Haiku 5.5 from $0.10 input / from $0.50 output.
  - Quote: "Pricing | $10 / input MTok, $50 / output MTok | $4 / input MTok, $20 / output MTok | $2 / input MTok, $10 / output MTok | From $0.10 / input MTok, From $0.50 / output MTok"
  - Source: https://platform.claude.com/docs/en/models/overview.md (Markdown copy; link markup removed; the rendered HTML prints the same values without commas)
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-05; script re-check; the Haiku figures are the up-to-100K tier). Re-checked against the fresh page text in the 2026-10-08 fix round.
- **F-143** Published guidance, conditional on being unsure which model to use: start with Opus 5.5 for most workloads; use Fable 5.1 for demanding reasoning and long-horizon agentic work, or when Opus 5.5 at higher effort still falls short on your evals.
  - Quote: "If you're unsure which model to use, start with Claude Opus 5.5 for most workloads. Use Claude Fable 5.1 for demanding reasoning and long-horizon agentic work, or when your evals on Claude Opus 5.5 at higher effort still fall short."
  - Source: https://platform.claude.com/docs/en/models/overview
  - Accessed 2026-10-08. Status: ADJUSTED by independent re-fetch (verify-platforms-family.md P-18; corrected value used, which keeps the opening condition).

## Capabilities and use cases

- **F-144** Haiku 5.5 takes text and images as input and returns text as output.
  - Quote: "Text and images → text"
  - Source: https://platform.claude.com/docs/en/models/haiku-5-5/overview (capabilities table, row "Input → output")
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-api-pricing A-20).
- **F-145** Anthropic states that all current models, which the overview compares, support text and image input, text output, multilingual capabilities, vision and tool use.
  - Quote: "All current models support text and image input, text output, multilingual capabilities, vision, and tool use."
  - Source: https://platform.claude.com/docs/en/models/overview
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-19; script re-check).
- **F-146** Haiku 5.5 reliably handles quick and repetitive workloads such as summaries, compactions, database queries and classification requests.
  - Quote: "It reliably handles quick and repetitive workloads (like summaries, compactions, database queries, and classification requests)."
  - Source: https://www.anthropic.com/claude-haiku-5-5
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch.
- **F-147** Haiku 5.5 powers high-volume product features and natural language processing tasks such as classification, summarization and text generation.
  - Quote: "Haiku 5.5 powers high-volume product features and natural language processing tasks like classification, summarization, and text generation."
  - Source: https://www.anthropic.com/claude/haiku
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch.
- **F-148** Haiku 5.5 works alongside larger Claude models for summarization, classification, routing and compaction in complex products and agent systems.
  - Quote: "It works alongside larger Claude models, making it practical to add things like summarization, classification, routing, and compaction to complex products and agent systems."
  - Source: https://www.anthropic.com/claude/haiku
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch.
- **F-149** Use-case wording: Haiku 5.5 is a fast, cost-efficient subagent for coding and well-defined tasks. This is a use-case description, not a family-role statement. The selection guide's family-role wording is F-226.
  - Quote: "Haiku 5.5 is a fast, cost-efficient subagent for coding and well-defined tasks."
  - Source: https://www.anthropic.com/claude/haiku (use cases, subagents)
  - Accessed 2026-10-08. Status: ADJUSTED by independent re-fetch (verify-platforms-family.md P-54 corrected the value to use-case wording; quote independently re-checked as notes-launch L-30). Re-checked against the fresh page text in the 2026-10-08 fix round.
- **F-150** A more intelligent model like Fable or Opus can plan the work and hand off subtasks to Haiku, making it practical to run many agents in parallel.
  - Quote: "A more intelligent model like Fable or Opus can plan the work and hand off subtasks to Haiku, making it practical to run many agents in parallel."
  - Source: https://www.anthropic.com/claude/haiku (use cases, subagents)
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch.
- **F-151** Haiku 5.5 is a strong computer use agent for repetitive tasks such as form filling, data entry and moving information between apps, and it is cost efficient at scale.
  - Quote: "Haiku 5.5 is a strong computer use agent for repetitive tasks like form filling, data entry, and moving information between apps, and it is cost efficient at scale."
  - Source: https://www.anthropic.com/claude/haiku (browser and desktop automation)
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch.
- **F-152** Haiku 5.5 handles focused coding and multi-step tool use, such as direct edits and small, specific changes across many files.
  - Quote: "Haiku 5.5 handles focused coding and multi-step tool use, like direct edits and small, specific changes that need to apply across many files."
  - Source: https://www.anthropic.com/claude/haiku (simple coding)
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch.
- **F-153** Anthropic says Haiku 5.5 is especially well-suited to computer use and browser use, given its combination of speed, capability and price.
  - Quote: "Haiku 5.5 is especially well-suited to these tasks, given its combination of speed, capability, and price."
  - Source: https://www.anthropic.com/claude-haiku-5-5 (further updates)
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-launch L-37).
- **F-154** FAQ: Haiku 5.5 works well as a subagent and for high-volume work such as summarization, classification and request routing, and it is fast enough for real-time experiences such as chat, voice and live support.
  - Quote: "It works well as a subagent and for high-volume work like summarization, classification, and request routing, and it is fast enough for real-time experiences like chat, voice, and live support."
  - Source: https://www.anthropic.com/claude/haiku (FAQ)
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-57; script re-check).

## Features and API changes

- **F-155** Haiku 5.5 is Anthropic's first Haiku-class model with an adjustable effort setting, and the first Haiku with effort controls.
  - Quote: "Haiku 5.5 is our first Haiku-class model to come with an adjustable effort setting."
  - Source: https://www.anthropic.com/claude-haiku-5-5 ; https://www.anthropic.com/claude/haiku ("It is also the first Haiku with effort controls, so teams can tune cost against intelligence for each task.")
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-53).
- **F-156** Effort lets users decide whether to optimize for cost or intelligence, as with other Anthropic models.
  - Quote: "This means that, as with our other models, users can decide whether to optimize for cost or intelligence."
  - Source: https://www.anthropic.com/claude-haiku-5-5
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-launch L-62).
- **F-157** Haiku 5.5 supports all five effort levels (low, medium, high, xhigh, max); medium is the default on the Claude API and in Claude Code.
  - Quote: "Claude Haiku 5.5 supports all five effort levels, and medium is the default on the Claude API and in Claude Code."
  - Source: https://platform.claude.com/docs/en/build-with-claude/effort
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-api-pricing A-25).
- **F-158** Overview-table default effort: Fable 5.1 high; Opus 5.5 medium; Sonnet 5.5 high; Haiku 5.5 medium.
  - Quote: "Default effort | high | medium | high | medium"
  - Source: https://platform.claude.com/docs/en/models/overview
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-11; script re-check).
- **F-159** In Claude Code, the effort levels for Haiku 5.5 are low, medium, high, xhigh and max.
  - Quote: "Opus 5.5, Sonnet 5.5, Haiku 5.5, Opus 5, Sonnet 5, Opus 4.8, and Opus 4.7 | low, medium, high, xhigh, max"
  - Source: https://code.claude.com/docs/en/model-config
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-91; script re-check).
- **F-160** In Claude Code, Haiku 5.5 defaults to medium effort.
  - Quote: "except that Opus 5.5, Sonnet 5.5, and Haiku 5.5 default to medium"
  - Source: https://code.claude.com/docs/en/model-config
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-92; script re-check).
- **F-161** On the Claude API and Google Cloud, Haiku 5.5 supports changing effort mid-conversation with a per-message output_config, which preserves the prompt cache.
  - Quote: "On the Claude API and Google Cloud, Claude Haiku 5.5 also supports changing effort mid-conversation with a per-message output_config, which preserves the prompt cache."
  - Source: https://platform.claude.com/docs/en/build-with-claude/effort
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-api-pricing A-30).
- **F-162** Per-message effort is a beta feature; Haiku 5.5 is listed for the Claude API and Google Cloud.
  - Quote: "On the Claude API and Google Cloud, it's available on Claude Fable 5.1, Claude Mythos 5.1, Claude Opus 5.5, Claude Opus 5, Claude Sonnet 5.5, and Claude Haiku 5.5."
  - Source: https://platform.claude.com/docs/en/build-with-claude/effort
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-api-pricing A-31).
- **F-163** Overview-table thinking label: Haiku 5.5 is "Adaptive" (no "always on"); Fable 5.1 and Opus 5.5 are "Adaptive (always on)". See Conflicts C-7.
  - Quote: "Thinking | Adaptive (always on) | Adaptive (always on) | Adaptive | Adaptive"
  - Source: https://platform.claude.com/docs/en/models/overview
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-12; script re-check).
- **F-164** Adaptive thinking is on by default for Haiku 5.5; depth is controlled with the effort parameter.
  - Quote: "Adaptive thinking is on by default. Control thinking depth with the effort parameter."
  - Source: https://platform.claude.com/docs/en/models/haiku-5-5/overview
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-api-pricing A-21).
- **F-165** Adaptive thinking lets the model decide how much to think, steered by effort.
  - Quote: "Adaptive thinking lets the model decide how much to think, steered by effort."
  - Source: https://platform.claude.com/docs/en/models/overview.md (Markdown copy; the rendered HTML page does not carry this quote)
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-13; script re-check). Re-checked against the fresh page text in the 2026-10-08 fix round.
- **F-166** Thinking is on by default and counts toward max_tokens, so leave room for it.
  - Quote: "Thinking is on by default and counts toward max_tokens, so leave room for it."
  - Source: https://platform.claude.com/docs/en/build-with-claude/effort
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-api-pricing A-29).
- **F-167** Thinking can be turned off with thinking type "disabled" at high effort or below.
  - Quote: "While you can still turn thinking off with thinking: {"type": "disabled"} at high effort or below"
  - Source: https://platform.claude.com/docs/en/models/haiku-5-5/whats-new-haiku-5-5 ; https://platform.claude.com/docs/en/build-with-claude/thinking (table row "Thinking off at high effort or below")
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-api-pricing A-33; notes-platforms-family N-12).
- **F-168** With thinking disabled, xhigh or max effort returns a 400 error, so use adaptive thinking at those levels.
  - Quote: "At xhigh or max, it returns a 400 error, so use adaptive thinking there"
  - Source: https://platform.claude.com/docs/en/build-with-claude/effort
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-api-pricing A-28).
- **F-169** In Claude Code, thinking cannot be turned off on Haiku 5.5. The API can disable thinking at high effort or below (see F-167), so this is a Claude Code limit, not a conflict with the overview label.
  - Quote: "You can’t turn thinking off on Opus 5.5, Sonnet 5.5, Haiku 5.5, or the Fable models."
  - Source: https://code.claude.com/docs/en/model-config
  - Accessed 2026-10-08. Status: ADJUSTED by independent re-fetch (verify-platforms-family.md P-94; corrected value used).
- **F-170** Fable models, Sonnet 5 and later, Haiku 5.5, and Opus 4.7 and later always use adaptive reasoning in Claude Code.
  - Quote: "Fable models, Sonnet 5 and later, Haiku 5.5, and Opus 4.7 and later always use adaptive reasoning."
  - Source: https://code.claude.com/docs/en/model-config
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (verify-platforms-family.md P-93; script re-check).
- **F-171** Thinking text is omitted by default; set thinking.display to "summarized" to receive summarized thinking.
  - Quote: "Thinking text is omitted by default"
  - Source: https://platform.claude.com/docs/en/models/haiku-5-5/whats-new-haiku-5-5
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-api-pricing A-117).
- **F-172** Haiku 5.5 thinking blocks work only in the account that produced them, or in an account linked to it.
  - Quote: "Its thinking blocks work only in the account that produced them, or in an account linked to it."
  - Source: https://platform.claude.com/docs/en/models/haiku-5-5/overview ; https://platform.claude.com/docs/en/models/haiku-5-5/whats-new-haiku-5-5 (replay each conversation through the producing account)
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-api-pricing A-23 and A-119).
- **F-173** The same text counts as approximately 30% more tokens on Haiku 5.5 than on Haiku 4.5, because of the newer tokenizer.
  - Quote: "so the same text counts as approximately 30% more tokens than on Claude Haiku 4.5."
  - Source: https://platform.claude.com/docs/en/models/haiku-5-5/overview ; https://platform.claude.com/docs/en/models/haiku-5-5/whats-new-haiku-5-5
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-api-pricing A-22 and A-118).
- **F-174** Omit temperature, top_p and top_k: a non-default value for any of them returns a 400 error.
  - Quote: "Omit temperature, top_p, and top_k, since a non-default value for any of them returns a 400 error."
  - Source: https://platform.claude.com/docs/en/models/haiku-5-5/overview
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-api-pricing A-32).
- **F-175** Model capabilities and token limits can be queried per model with the Models API.
  - Quote: "You can query model capabilities and token limits programmatically with the Models API."
  - Source: https://platform.claude.com/docs/en/models/overview
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-api-pricing A-46).
- **F-176** Thinking blocks for Haiku 5.5 are preserved by default even when non-tool-result user content is added, so the cache stays valid.
  - Quote: "On Opus 4.5+, Sonnet 4.6+, and Haiku 5.5, thinking blocks are preserved by default even when non-tool-result user content is added, so the cache remains valid"
  - Source: https://platform.claude.com/docs/en/build-with-claude/prompt-caching
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-api-pricing A-85).
- **F-177** The code execution tool lists claude-haiku-5-5 under "Haiku 4.5 and 5.5" in its supported-models table. Its visible "Supported platforms" list names Claude API, Claude Platform on AWS and Microsoft Foundry; on Microsoft Foundry, code execution requires a Hosted on Anthropic deployment. Amazon Bedrock and Google Cloud are not in that list.
  - Quote: "Haiku 4.5 and 5.5"
  - Quote (visible text): "Supported platforms | Claude API | Claude Platform on AWS | Microsoft Foundry", with footnote 1: "On Microsoft Foundry, code execution requires a Hosted on Anthropic deployment."
  - Page data (not visible text, same page): "label":"Claude API","availability":"ga"; "label":"Claude Platform on AWS","availability":"ga"; "label":"Amazon Bedrock","availability":"unavailable"; "label":"Google Cloud","availability":"unavailable"
  - Source: https://platform.claude.com/docs/en/agents-and-tools/tool-use/code-execution-tool (visible text and page data)
  - Accessed 2026-10-08. Status: VERIFIED by fix-round re-fetch. The earlier wording (Amazon Bedrock shown as not available; generally available) paraphrased page data and is withdrawn; the page data reads "ga" for Claude API and Claude Platform on AWS.
- **F-178** Python and TypeScript SDKs add support for computer use and browser use in beta.
  - Quote: "For developers, we’re also updating our Claude Python and TypeScript SDKs to add support for computer use and browser use in beta."
  - Source: https://www.anthropic.com/claude-haiku-5-5 ; https://platform.claude.com/docs/en/release-notes/overview ("The Python and TypeScript SDKs now include classes, in beta, for the browser use tool and the computer use tool.")
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-launch L-36 and L-38).
- **F-179** What's new lists a browser use tool as new in Haiku 5.5, available on the Claude API and Google Cloud.
  - Quote: "Browser use tool"
  - Source: https://platform.claude.com/docs/en/models/haiku-5-5/whats-new-haiku-5-5
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-api-pricing A-109).
- **F-180** Breaking change for computer use on the Claude API and Google Cloud: replace computer_20250124 with computer_toolset_20260801.
  - Quote: "Computer use needs the toolset on the Claude API and Google Cloud"
  - Source: https://platform.claude.com/docs/en/models/haiku-5-5/whats-new-haiku-5-5
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-api-pricing A-114; both tool version strings found on the page).
- **F-181** What's new (compared with Haiku 4.5): adaptive thinking and effort. Adaptive thinking is on by default and steered by effort; setting effort is optional.
  - Quote: "Adaptive thinking and effort"
  - Source: https://platform.claude.com/docs/en/models/haiku-5-5/whats-new-haiku-5-5
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-api-pricing A-107).
- **F-182** What's new (compared with Haiku 4.5): a larger context window and output. Existing max_tokens values stay valid, but thinking tokens count toward them.
  - Quote: "Larger context window and output"
  - Source: https://platform.claude.com/docs/en/models/haiku-5-5/whats-new-haiku-5-5
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-api-pricing A-108).
- **F-183** A response can end with stop_reason "refusal" when safety classifiers decline a request; handle it in the client; server-side fallback is not available.
  - Quote: "Safety classifiers can decline a request"
  - Source: https://platform.claude.com/docs/en/models/haiku-5-5/whats-new-haiku-5-5
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-api-pricing A-110).
- **F-184** Migration from Haiku 4.5: code written for Haiku 4.5 can break on Haiku 5.5. Manual extended thinking (budget_tokens) returns a 400 error; adaptive thinking is on by default, so a response can begin with thinking blocks.
  - Quote: "Code written for Claude Haiku 4.5 can break on Claude Haiku 5.5. Manual extended thinking (budget_tokens) returns a 400 error, and adaptive thinking is on by default, so a response can begin with thinking blocks."
  - Source: https://platform.claude.com/docs/en/release-notes/overview ; https://platform.claude.com/docs/en/models/haiku-5-5/whats-new-haiku-5-5 ("Manual extended thinking returns an error", Breaking)
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-launch L-40).
- **F-185** Breaking: assistant message prefill returns an error; end messages with a user turn.
  - Quote: "Assistant message prefill returns an error"
  - Source: https://platform.claude.com/docs/en/models/haiku-5-5/whats-new-haiku-5-5
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-api-pricing A-113).
- **F-186** Breaking: changing earlier turns invalidates thinking blocks; keep conversations append-only if thinking blocks are sent back.
  - Quote: "Changing earlier turns invalidates thinking blocks"
  - Source: https://platform.claude.com/docs/en/models/haiku-5-5/whats-new-haiku-5-5
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-api-pricing A-115).
- **F-187** Changed: responses can begin with thinking blocks, so select content blocks by type, not by position.
  - Quote: "Responses can begin with thinking blocks"
  - Source: https://platform.claude.com/docs/en/models/haiku-5-5/whats-new-haiku-5-5
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-api-pricing A-116).
- **F-188** The launch post points readers to the migration guide for details.
  - Quote: "See our migration guide for details."
  - Source: https://www.anthropic.com/claude-haiku-5-5 (availability section)
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-launch L-41).

## Safety

- **F-189** Alignment: Haiku 5.5 shows major improvements across almost all alignment evaluations relative to Haiku 4.5.
  - Quote: "Alignment. Claude Haiku 5.5 shows major improvements across almost all of our alignment evaluations relative to Haiku 4.5."
  - Source: https://www.anthropic.com/claude-haiku-5-5 (safety)
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-launch L-87).
- **F-190** Cyber safeguards on Haiku 5.5 are more restrictive than Haiku 4.5's, but somewhat less restrictive than those applied to other recent models.
  - Quote: "Safeguards. Consistent with its capabilities, Haiku 5.5’s cybersecurity safeguards are more restrictive than Haiku 4.5’s, but somewhat less restrictive than those we’ve applied to other recent models."
  - Source: https://www.anthropic.com/claude-haiku-5-5 (safety)
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-launch L-88).
- **F-191** The system card says Anthropic treats Haiku 5.5 as meeting its CB-1 and Autonomy-1 thresholds and applies the corresponding RSP mitigations. It does not name an AI Safety Level.
  - Quote: "However, we do treat Haiku 5.5 as meeting our CB-1 and Autonomy-1 thresholds, and we apply the corresponding mitigations from our RSP."
  - Source: https://www-cdn.anthropic.com/e1080d6bf5ae2018ea3c2f414064be03232f5be5/Claude%20Haiku%205.5%20System%20Card.pdf (p. 11)
  - Accessed 2026-10-08. Status: VERIFIED by independent re-fetch (notes-system-card S-04).

## Added in the fix round (2026-10-08)

Sources for this section: the launch page (https://www.anthropic.com/claude-haiku-5-5), the choosing-a-model guide (https://platform.claude.com/docs/en/about-claude/models/choosing-a-model), the Haiku 5.5 product page (https://www.anthropic.com/claude/haiku) and the system card PDF (https://www-cdn.anthropic.com/e1080d6bf5ae2018ea3c2f414064be03232f5be5/Claude%20Haiku%205.5%20System%20Card.pdf). "PDF p." is the page number in that PDF. Every quote below was fetched and checked on 2026-10-08.

### Customer statements (attributed; not Anthropic measurements)

- **F-192** Asana (Aaron Vinh, Staff Software Engineer) reports lower latency and faster inference on its AI Teammates eval suite, compared with the model it uses today.
  - Quote: "Compared with the model we use today, we saw over a 30% reduction in latency for task completions and up to 2.5x faster inference per agent turn."
  - Source: https://www.anthropic.com/claude-haiku-5-5 (customer quote, under "Here’s what they told us about the new model:")
  - Accessed 2026-10-08. Status: VERIFIED by fix-round re-fetch. Attribute to Asana. The baseline model is not named, and the figures are Asana's own measurements (see C-19).
- **F-193** Box (Yashodha Bhavnani, VP of AI Products) reports that Haiku 5.5 scored 11 points higher than Haiku 4.5 at about half the latency, in early testing.
  - Quote: "In early testing, Claude Haiku 5.5 scored 11 points higher than Haiku 4.5 at about half the latency."
  - Source: https://www.anthropic.com/claude-haiku-5-5 (customer quote, Box)
  - Accessed 2026-10-08. Status: VERIFIED by fix-round re-fetch. The metric behind the 11 points is not named on the page.
- **F-194** AlphaSense (Daniel Campos, Distinguished Engineer) reports a statistically significant improvement over Haiku 4.5 across 400 queries on its Ask in Document feature.
  - Quote: "We ran 400 queries, and Claude Haiku 5.5 was a statistically significant improvement over Haiku 4.5: 0.84 vs. 0.76."
  - Quote (product page, punctuation differs): "We ran 400 queries, and Claude Haiku 5.5 was a statistically significant improvement over Haiku 4.5, 0.84 vs. 0.76."
  - Source: https://www.anthropic.com/claude-haiku-5-5 (customer quote, AlphaSense); https://www.anthropic.com/claude/haiku (product page)
  - Accessed 2026-10-08. Status: VERIFIED by fix-round re-fetch. The metric is not named, so "0.84 vs. 0.76" is not a benchmark score.
- **F-195** HubSpot (Ze’ev Klapow, Distinguished Software Engineer) reports 92.8% averaged over three runs on HubSpot's CRM evaluation suite.
  - Quote: "Claude Haiku 5.5 got the best score we’ve seen on this suite yet, at 92.8% averaged over three runs."
  - Context (same customer quote): "At HubSpot, we use simulated portals to evaluate new models on CRM tasks like reporting on deals."
  - Source: https://www.anthropic.com/claude-haiku-5-5 (customer quote, HubSpot)
  - Accessed 2026-10-08. Status: VERIFIED by fix-round re-fetch. This is an accuracy score on a customer suite, not a speed figure.
- **F-196** HubSpot's Ze’ev Klapow reports that Haiku 5.5 was the fastest model to complete a CRM audit task among those tested. No time figure is given.
  - Quote: "Across all of the models we tested, Haiku 5.5 was fastest to complete the task, and had the highest hit rate and the lowest false positive rate."
  - Source: https://www.anthropic.com/claude-haiku-5-5 (customer quote, HubSpot)
  - Accessed 2026-10-08. Status: VERIFIED by fix-round re-fetch. Qualitative; attribute to HubSpot.
- **F-197** Cognition (Walden Yan, Co-Founder & CPO) reports a FrontierCode score of 66.2 for Devin Fusion with Haiku 5.5 as the sidekick, while cutting cost and latency.
  - Quote: "With Haiku 5.5 as the sidekick, Fusion holds a top-tier FrontierCode score of 66.2 while cutting cost and latency."
  - Quote (same paragraph): "You can try it today in the Devin CLI with Opus 5.5 as the lead."
  - Source: https://www.anthropic.com/claude-haiku-5-5 (customer quote, Cognition)
  - Accessed 2026-10-08. Status: VERIFIED by fix-round re-fetch. The 66.2 is for Devin Fusion with Haiku 5.5 as the sidekick, not for Haiku 5.5 alone.

### Speed (system card timings on Anthropic's evaluation setup; not product latency)

- **F-198** HealthBench response times, by effort: 4 to 8 seconds below max and about 44 seconds at max.
  - Quote: "with response times of 4 to 8 seconds below max and about 44 seconds at max"
  - Note: HealthBench was run "(one run per level below max)".
  - Source: system card PDF p. 133 (section 8.11.3).
  - Accessed 2026-10-08. Status: VERIFIED by fix-round re-fetch. Eval-specific timing (see NOT FOUND 1).
- **F-199** HealthBench Professional response time, by effort: 8 to 21 seconds per answer from low to xhigh and about 110 seconds at max.
  - Quote: "Response time was 8 to 21 seconds per answer from low to xhigh and about 110 seconds at max"
  - Source: system card PDF p. 133 (section 8.11.3).
  - Accessed 2026-10-08. Status: VERIFIED by fix-round re-fetch. Eval-specific timing, not product latency.
- **F-200** PhysicianBench model time per task on the evaluation setup: 48 seconds at low, 133 seconds at high, and about 11 minutes at max.
  - Quote: "Model time per task rose from 48 seconds at low and 133 seconds at high to about 11 minutes at max."
  - Definition (PDF p. 134, figure note): "time is model time per task: the summed duration of the model’s requests in an attempt, without tool and judge time, averaged over the task’s five attempts; the median over tasks is shown."
  - Source: system card PDF pp. 133 to 134 (section 8.11.3).
  - Accessed 2026-10-08. Status: VERIFIED by fix-round re-fetch. Eval-specific timing, not product latency.

### System card benchmark results (Anthropic-run)

Table 8.1.A (PDF p. 111) gives the standard configuration for Haiku 5.5 results: "adaptive thinking at max effort, default sampling settings (temperature, top_p), averaged over five trials". Results below are at max effort unless stated.

- **F-201** SWE-Bench Pro: 64.8%.
  - Quote: "Claude Haiku 5.5 achieved 64.8%."
  - Definition (PDF p. 112): SWE-Bench Pro "is composed of problems drawn from actively-maintained repositories with large, multi-file diffs."
  - Source: system card PDF p. 112 (section 8.2); Table 8.1.A, PDF p. 111.
  - Accessed 2026-10-08. Status: VERIFIED by fix-round re-fetch. The card has no SWE-bench Verified figure (NOT FOUND 19).
- **F-202** SWE-bench Multilingual: 83.7%.
  - Quote: "Haiku 5.5 achieved 83.7%."
  - Definition (PDF p. 112): "SWE-bench Multilingual extends the format to 300 problems across 9 programming languages."
  - Source: system card PDF p. 112 (section 8.2); Table 8.1.A, PDF p. 111.
  - Accessed 2026-10-08. Status: VERIFIED by fix-round re-fetch.
- **F-203** SWE-bench Multimodal: 30.7%.
  - Quote: "Haiku 5.5 achieved 30.7%."
  - Definition (PDF p. 112): "adds visual context (screenshots, design mockups) to the issue descriptions."
  - Source: system card PDF p. 112 (section 8.2); Table 8.1.A, PDF p. 111.
  - Accessed 2026-10-08. Status: VERIFIED by fix-round re-fetch.
- **F-204** FrontierCode 1.1: Main 46.4% at max effort and 45.8% at xhigh; Extended 58.4% at max effort.
  - Quote: "Claude Haiku 5.5 scored best at max effort: 46.4% on Main and 58.4% on Extended."
  - Table 8.1.A, PDF p. 111, FrontierCode 1.1 (Main), Haiku 5.5 column: 46.4 with "(max)" and 45.8 with "(xhigh)" (table cells, read from the layout text; the body text gives no Haiku 5.5 xhigh figure).
  - Definition (PDF p. 112): "FrontierCode is an agentic coding benchmark of 150 software engineering tasks created by Cognition." "We report two subsets: Extended is the full set of 150 tasks, and Main is the 100 hardest."
  - Source: system card PDF pp. 111 to 113 (sections 8.1 and 8.3).
  - Accessed 2026-10-08. Status: VERIFIED by fix-round re-fetch.
- **F-205** Terminal-Bench-Science: 20.6% with safeguards enabled.
  - Quote: "Claude Haiku 5.5 scored 20.6% on Terminal-Bench-Science with safeguards enabled."
  - Definition (PDF p. 116): "Terminal-Bench-Science is a Stanford-led community benchmark of 70 tasks drawn from scientific research workflows"
  - Condition (PDF p. 116): "As on Terminal-Bench 4.0, we ran Haiku 5.5 without a fallback model, so when the safeguards flagged a request the trial exited and failed."
  - Source: system card PDF p. 116 (section 8.5).
  - Accessed 2026-10-08. Status: VERIFIED by fix-round re-fetch.
- **F-206** FrontierSWE v2: 43.8%.
  - Quote: "Claude Haiku 5.5 scored 43.8% on FrontierSWE v2, slightly below Claude Fable 5 (47.0%) and well above GPT-5.6 Sol (32.2%)."
  - Definition (PDF p. 117): FrontierSWE v2 "is a Proximal benchmark of 34 ultra-long-horizon engineering and research tasks"
  - Source: system card PDF p. 117 (section 8.6).
  - Accessed 2026-10-08. Status: VERIFIED by fix-round re-fetch.
- **F-207** ProgramBench, on the 166-task set: 82.0%.
  - Quote: "On this set, Claude Haiku 5.5 scored 82.0%, whereas Claude Sonnet 5.5 scored 79.7% and Claude Opus 5.5 scored 91.2%."
  - Set (PDF p. 117): "We excluded 34 tasks for which the reference binary scored below 0.9 on the hidden test suite (indicating test flakiness), leaving 166 tasks."
  - Source: system card PDF p. 117 (section 8.7.1).
  - Accessed 2026-10-08. Status: VERIFIED by fix-round re-fetch.
- **F-208** Chartography with tools: 86.2% (no tools: 46.4%, see F-49).
  - Quote: "Claude Haiku 5.5 scored 46.4% without tools and 86.2% with tools."
  - Definition (PDF p. 123): Chartography "is a chart-understanding benchmark from Surge AI with 100 tasks on specialized chart types rarely evaluated in existing benchmarks."
  - Source: system card PDF pp. 123 to 124 (section 8.9.1).
  - Accessed 2026-10-08. Status: VERIFIED by fix-round re-fetch. The launch page gives the no-tools figure only (F-49).
- **F-209** OSWorld 2.1 (offline subset), system card: partial score 72.4% and strict pass rate 37.1%.
  - Quote: "Claude Haiku 5.5 achieved a partial score of 72.4% and a strict pass rate of 37.1%."
  - Definition (PDF p. 128): "we now report the benchmark’s official offline subset: the 82 of its 108 tasks on the benchmark’s offline task list, with the agent’s virtual machine given no internet access."
  - Source: system card PDF p. 128 (section 8.9.3).
  - Accessed 2026-10-08. Status: VERIFIED by fix-round re-fetch. The launch page's 72.4% (F-44) is the partial score.
- **F-210** OfficeQA and OfficeQA Pro at max effort: 73.5% and 60.3%.
  - Quote: "Claude Haiku 5.5 scored 73.5% on OfficeQA and 60.3% on OfficeQA Pro at max effort (mean of five runs), up from 63.0% and 47.1% for Claude Haiku 4.5."
  - Definition (PDF p. 130): "OfficeQA Pro is the harder 133-question subset recommended for frontier models."
  - Source: system card PDF p. 130 (section 8.10.1).
  - Accessed 2026-10-08. Status: VERIFIED by fix-round re-fetch.
- **F-211** PhysicianBench at max effort: 43.0% of attempts passed.
  - Quote: "Claude Haiku 5.5 passed 43.0% of attempts (five attempts on each task)."
  - Definition (PDF p. 132, continued on p. 133): "PhysicianBench is a public benchmark of 100 physician tasks carried out in an electronic" "health record (EHR)."
  - Source: system card PDF pp. 132 to 133 (sections 8.11.1 and 8.11.2).
  - Accessed 2026-10-08. Status: VERIFIED by fix-round re-fetch.
- **F-212** HealthBench Professional at max effort: 64.8% length-adjusted (71.0% raw).
  - Quote: "Max effort scored highest, at 64.8% (71.0% raw)"
  - Rule (PDF p. 132): "HealthBench and HealthBench Professional scores are length-adjusted, with the raw score in parentheses."
  - Source: system card PDF pp. 132 to 133 (section 8.11.3).
  - Accessed 2026-10-08. Status: VERIFIED by fix-round re-fetch.
- **F-213** GMMLU: 87.8% average accuracy across 42 languages.
  - Quote: "On GMMLU, Claude Haiku 5.5 achieved an average accuracy of 87.8% across 42 languages"
  - Note (PDF p. 135): "Scores were reported for a single trial."
  - Source: system card PDF pp. 134 to 135 (section 8.12.1).
  - Accessed 2026-10-08. Status: VERIFIED by fix-round re-fetch.
- **F-214** MILU: 87.6% average accuracy across 11 languages.
  - Quote: "On MILU, Claude Haiku 5.5 achieved an average accuracy of 87.6% across 11 languages"
  - Note (PDF p. 136): "Scores were averaged over five trials."
  - Source: system card PDF pp. 135 to 136 (section 8.12.2).
  - Accessed 2026-10-08. Status: VERIFIED by fix-round re-fetch.
- **F-215** SpatialBench Verified 67.7% and SingleCellBench 56.2%.
  - Quote: "Claude Haiku 5.5 scored 67.7% on SpatialBench Verified and 56.2% on SingleCellBench"
  - Note (PDF p. 137): Haiku 5.5 is "performing at about the level of Claude Sonnet 5 (68.9% and 56.5%)".
  - Source: system card PDF p. 137 (section 8.13.1).
  - Accessed 2026-10-08. Status: VERIFIED by fix-round re-fetch.
- **F-216** Units: GDPval-AA v2.1 and AA-Briefcase v1.1 are reported as Elo at max effort.
  - Quote (GDPval-AA v2.1, PDF p. 131, section 8.10.2): "Claude Haiku 5.5 scored an Elo of 1620 at max effort, up from 735 for Claude Haiku 4.5."
  - Quote (AA-Briefcase v1.1, PDF p. 131, section 8.10.3): "Claude Haiku 5.5 scored an Elo of 1578 at max effort, up from 614 for Claude Haiku 4.5."
  - Definition (AA-Briefcase v1.1, PDF p. 131): "measuring long-horizon knowledge work on complex projects"
  - Source: system card PDF p. 131.
  - Accessed 2026-10-08. Status: VERIFIED by fix-round re-fetch.

### Effort values (system card; the launch charts give none)

- **F-217** HealthBench (length-adjusted), by effort: low 59.9%, medium 60.2%, high 60.3%, xhigh 61.1%, max 61.6%.
  - Quote: "Haiku 5.5 scored 59.9% at low, 60.2% at medium, 60.3% at high, 61.1% at xhigh and 61.6% at max"
  - Note (PDF p. 133): "(one run per level below max)"
  - Source: system card PDF p. 133 (section 8.11.3). The length-adjustment rule is in F-212.
  - Accessed 2026-10-08. Status: VERIFIED by fix-round re-fetch.
- **F-218** HealthBench Professional (length-adjusted), by effort: low 57.9%, medium 59.9% (the API default), high 61.3%, xhigh 61.0%, max 64.8% (F-212).
  - Quote: "Haiku 5.5’s length-adjusted score rose from 57.9% (61.6% raw) at low effort to 61.3% at high, with medium, the API default, at 59.9%; high and xhigh (61.0%) were not distinguishable."
  - Source: system card PDF p. 133 (section 8.11.3).
  - Accessed 2026-10-08. Status: VERIFIED by fix-round re-fetch.
- **F-219** PhysicianBench, share of attempts passed, by effort: low 17.8%, medium 25.2%, high 31.6%, xhigh 35.8%, max 43.0%.
  - Quote: "Haiku 5.5 passed 17.8% of attempts at low, 25.2% at medium, 31.6% at high, 35.8% at xhigh and 43.0% at max."
  - Source: system card PDF p. 133 (section 8.11.3).
  - Accessed 2026-10-08. Status: VERIFIED by fix-round re-fetch.
- **F-220** GDPval-AA v2.1 at medium effort (the default effort): Elo 1277.
  - Quote: "At the default effort (medium), it scored 1277 while using about a tenth of the output tokens it used at max."
  - Source: system card PDF p. 131 (section 8.10.2). The max-effort figure is 1620 (F-216).
  - Accessed 2026-10-08. Status: VERIFIED by fix-round re-fetch.
- **F-221** AA-Briefcase v1.1 at medium effort (the default effort): Elo 1372.
  - Quote: "At the default effort (medium), it scored 1372 while using under a quarter of the output tokens it used at max."
  - Source: system card PDF p. 131 (section 8.10.3). The max-effort figure is 1578 (F-216).
  - Accessed 2026-10-08. Status: VERIFIED by fix-round re-fetch.

### Safety numbers (system card)

The launch and product pages print no safety numbers. The results below are the system card's, carried in part (see NOT FOUND 20).

- **F-222** Malicious requests, Claude Code evaluation (section 5.1.1): refusal rate 84.3%, up from 66.6% for Claude Haiku 4.5; dual-use and benign success rate 98.9%, up from 88.7%.
  - Quote: "It refused 84.3% of malicious requests, up from 66.6%, and assisted with 98.9% of dual-use and benign requests, up from 88.7%."
  - Table caption (PDF p. 48): "Claude Code evaluation results. Higher is better."
  - Source: system card PDF p. 48.
  - Accessed 2026-10-08. Status: VERIFIED by fix-round re-fetch.
- **F-223** Malicious computer use (section 5.1.2): refusal rate 82.59%, up from 58.93% for Claude Haiku 4.5.
  - Quote: "Claude Haiku 5.5 refused 82.59% of malicious computer use tasks, up from 58.93% for Claude Haiku 4.5."
  - Table caption (PDF p. 49): "Malicious computer use evaluation results without mitigations."
  - Source: system card PDF p. 49.
  - Accessed 2026-10-08. Status: VERIFIED by fix-round re-fetch.
- **F-224** Indirect prompt injection, Gray Swan IPI benchmark (section 5.2.1): the attack success rate at k=15 fell from 83.2% to 7.1%. The 83.2% is the Claude Haiku 4.5 rate, read from the same sentence's comparison.
  - Quote: "reducing the attack success rate by more than 10 times at k=15 attempts from 83.2% to 7.1%."
  - Caveat (PDF p. 50): "Claude models are evaluated without the additional prompt injection protections we deploy across our products to improve security."
  - Source: system card PDF p. 50.
  - Accessed 2026-10-08. Status: VERIFIED by fix-round re-fetch.
- **F-225** Indirect prompt injection, coding attacker (section 5.2.2.1, PDF pp. 51 to 52): attack success rate 0.08% over all attempts without prompt injection probes, against 58.40% for Claude Haiku 4.5.
  - Quote: "The attack success rate was 0.08% over all attempts without prompt injection probes, compared to 58.40% for Claude Haiku 4.5."
  - Comparison note (PDF p. 52): "Fallback mechanisms explain the large difference with Claude Sonnet 5.5, Claude Opus 5.5, and Claude Fable 5.1".
  - Source: system card PDF p. 52.
  - Accessed 2026-10-08. Status: VERIFIED by fix-round re-fetch.

### Family and selection guidance (choosing-a-model guide and launch navigation)

Source for F-226 to F-230: https://platform.claude.com/docs/en/about-claude/models/choosing-a-model (fetched 2026-10-08).

- **F-226** In the model selection matrix, Haiku 5.5 is the row for "The lowest latency and price".
  - Quote: "The lowest latency and price | Claude Haiku 5.5 | Real-time applications, high-volume intelligent processing, cost-sensitive deployments needing strong reasoning, sub-agent tasks"
  - Source: choosing-a-model guide, "Model selection matrix".
  - Accessed 2026-10-08. Status: VERIFIED by fix-round re-fetch. This is the family-role wording referred to in F-149.
- **F-227** For many applications, the guide suggests starting with Haiku 5.5 and upgrading only if needed.
  - Quote: "For many applications, starting with a faster, more cost-effective model like Claude Haiku 5.5 can be the optimal approach:"
  - Source: choosing-a-model guide, "Option 1: Start efficiency-first".
  - Accessed 2026-10-08. Status: VERIFIED by fix-round re-fetch.
- **F-228** The guide says most workloads start with Opus 5.5.
  - Quote: "Most workloads start with Claude Opus 5.5."
  - Source: choosing-a-model guide, "Model selection matrix".
  - Accessed 2026-10-08. Status: VERIFIED by fix-round re-fetch.
- **F-229** Upper tiers, per the guide: Claude Mythos 5.1 offers the same capabilities only to verified organizations, and Claude Fable 5.1 is the most capable model open to all customers.
  - Quote: "Claude Mythos 5.1 (claude-mythos-5-1) offers the same capabilities only to organizations verified through Anthropic's verification programs, such as the Cyber Verification Program."
  - Quote: "Claude Fable 5.1 (claude-fable-5-1) is Anthropic's most capable model open to all customers."
  - Navigation (launch page "Models" menu, in this order): "Mythos", "Fable", "Opus", "Sonnet", "Haiku".
  - Source: choosing-a-model guide, "Option 2: Start capability-first"; https://www.anthropic.com/claude-haiku-5-5 (navigation).
  - Accessed 2026-10-08. Status: VERIFIED by fix-round re-fetch. The navigation order is not a capability claim.
- **F-230** The guide names Opus models, not Haiku 5.5, for fast mode: "Claude Opus 5.5, Claude Opus 5, and Claude Opus 4.8 support fast mode (research preview), which delivers up to 2.5x higher output speed at premium pricing."
  - Source: choosing-a-model guide, "Establish key criteria" (Speed).
  - Accessed 2026-10-08. Status: VERIFIED by fix-round re-fetch. Do not cite the 2.5x as a Haiku 5.5 figure (see C-19).


## NOT FOUND

Searched on the primary pages named in the brief and the sources scout; none states the following.

1. Speed or latency as a product measurement for Haiku 5.5 (milliseconds, tokens per second, time to first token, or a multiple of another model): none on the primary pages. Timings do exist, but they are customer statements (F-192, F-193, F-196) and system card timings on Anthropic's evaluation setup (F-198 to F-200); neither is product latency. Checked: anthropic.com/claude-haiku-5-5, anthropic.com/claude/haiku, anthropic.com/news, platform.claude.com release notes, the Haiku 5.5 overview, the models overview, the choosing-a-model guide, and system card PDF pp. 133 to 134.
2. A first-party speed comparison of Haiku 5.5 with Haiku 4.5 or Sonnet 5.5. The only first-party comparisons are on price (F-85) and capability (F-30). The newsroom's "runs 30% faster" refers to Sonnet 5.5 against Sonnet 5 (see Conflicts C-16). A customer compares latency with Haiku 4.5 (F-193), but that is not first-party. The system card's Figure 8.11.3.A plots response times for other models; its text gives no numbers for them, and the figure was not extracted.
3. Fast Mode for Haiku 5.5: whether it is offered, and its price. Footnote 1 mentions only the Opus models in Fast Mode. The fast-mode price table lists Opus 5.5, Opus 5 and Opus 4.8 only, and the choosing-a-model guide names the same three models (F-230). Checked: https://platform.claude.com/docs/en/about-claude/pricing and https://platform.claude.com/docs/en/about-claude/models/choosing-a-model.
4. Haiku 5.5 price on Amazon Bedrock, Claude Platform on AWS, Google Cloud and Microsoft Foundry. Those pages have no Haiku row. AWS and Foundry bill at standard per-model rates (F-110, F-111). Bedrock and Google Cloud price on partner pages outside the primary domains.
5. Haiku 5.5 max output or context window on each platform beyond the model-level values (128K, 1M). Google Cloud and Foundry show max_tokens only in code samples. Checked: the four platform pages on platform.claude.com.
6. Haiku 5.5 context window on the Free plan. The Help Center table covers paid plans only (F-72). Plan-by-plan web search access is not stated; the article lists models only (F-133).
7. Bedrock access criteria for Haiku 5.5 ("See Access"). The page points readers to the AWS console for other models' criteria (F-128).
8. Bedrock regional endpoint availability for Haiku 5.5. Only the global endpoint is named (F-127).
9. Google Cloud endpoint type for Haiku 5.5. The regional premium is stated for "Sonnet 4.5 (deprecated) and future models only"; Haiku 5.5 is not named. Derived use is not carried.
10. Exact day of the knowledge cutoff (only Jun 2026, F-68 and F-69), and the exact launch time (only the date, F-13).
11. Retirement or deprecation dates beyond "Not sooner than October 7, 2027" (F-15).
12. Priority tier for Haiku 5.5. The rate-limit page mentions "anthropic-priority-*" headers "(Priority Tier only)" without naming Haiku 5.5. Checked: https://platform.claude.com/docs/en/api/rate-limits.
13. Evaluation-tier rate limits. The rate-limit page gives no numbers for any model.
14. Token overhead of the bash, computer use and browser use tools for Haiku 5.5. The pricing page gives figures for other models only.
15. Image (vision) token cost for Haiku 5.5. The vision page was read (https://platform.claude.com/docs/en/build-with-claude/vision), including its cost passage. Its only Haiku price example is for Haiku 4.5 at "$1 USD per million input tokens (standard tier)", and it gives no Haiku 5.5 image cost (its other worked example is for Opus 5).
16. Numeric Models API values for claude-haiku-5-5 (max_input_tokens, max_tokens, and the thinking.types.disabled capability value). The docs name the fields but do not show Haiku 5.5's response values. Checked: https://platform.claude.com/docs/en/api/models/list (its example response is for claude-opus-5 and shows 0 for both token fields).
17. Per-effort-level benchmark values for Haiku 5.5 on the launch page: none. The launch effort charts (F-59, F-60) have axes and legends only. Per-effort values from the system card are carried for HealthBench, HealthBench Professional and PhysicianBench (F-217 to F-219), for GDPval-AA and AA-Briefcase at medium (F-220, F-221), and for FrontierCode Main at xhigh (F-204). Other per-effort points were not extracted.
18. Launch-page units and definitions for AA-Briefcase v1.1, FrontierCode 1.1 (Main) and Chartography, and the meaning of the "Xhigh" qualifier on the Sonnet 5.5 FrontierCode cell: the launch page prints none of them (F-43, F-48, F-49). The system card gives them: Elo for AA-Briefcase v1.1 (F-216), the FrontierCode and Chartography definitions (F-204, F-208), and "xhigh" as the effort level (F-48).
19. A SWE-bench Verified score for Haiku 5.5: none found. The system card reports SWE-Bench Pro, SWE-bench Multilingual and SWE-bench Multimodal for Haiku 5.5 (F-201 to F-203) and has no SWE-bench Verified result. The product page gives no Haiku 5.5 SWE-bench figure. The only SWE-bench Verified figure on the checked pages is Haiku 4.5's (F-61).
20. Numeric safety results on the launch and product pages: none found (the launch Safety section, F-189 and F-190, has no numbers). The system card gives numeric safety results across its sections 4 to 6 and later (from PDF p. 30); only those cited in F-222 to F-225 are carried. The rest are not carried.
21. A superlative such as "most intelligent" for any model. No primary source uses one; the closest published wording is "our most capable Haiku yet" (F-30).
22. A currency code next to Haiku 5.5 prices. The launch and product pages show "$" only; the pricing page rates usage in USD (F-110).
23. Claude apps plan-by-plan context window and web search settings beyond F-70 to F-72 and F-133 to F-134.

## Conflicts / wording differences

- **C-1 Cloud platform names.** The launch post says "Claude Haiku 5.5 is available now on all platforms, including Amazon Web Services, Google Cloud, and Microsoft Azure." (https://www.anthropic.com/claude-haiku-5-5). The product page says "...available on the Claude Platform natively, and in Amazon Web Services, Google Cloud, and Microsoft Foundry." (https://www.anthropic.com/claude/haiku), and the API release notes say "Claude in Microsoft Foundry" (https://platform.claude.com/docs/en/release-notes/overview). Two of three pages say Microsoft Foundry; use it unless the copy writer decides otherwise, and note the launch post's wording.
- **C-2 Haiku 4.5 tagline on the product page.** The page H1 is "Claude Haiku 4.5" and its tagline is "The cheapest, fastest, and most capable small model we've ever released." (https://www.anthropic.com/claude/haiku). That tagline sits under the Haiku 4.5 heading. For Haiku 5.5, use F-26 or F-20 (verified: notes-platforms-family P-51, P-48).
- **C-3 Superlative wording.** Launch lead: "the cheapest, fastest, and most capable small model we’ve ever released" (F-20). Newsroom: "Our fastest, cheapest, and most capable small model yet." (F-27). Help Center: "...small model we’ve released" (F-28). API release notes: "our most capable model tuned for high-volume and latency-sensitive work" (F-29; drops "small"). Product page: "our most capable Haiku yet" (F-30). Use the launch-post lead (F-20) as the reference. The meta description (F-21, head only) reads "our fastest, most capable small model".
- **C-4 "Fastest" scope.** The launch post limits "fastest" to standard speed and says Haiku 5.5 runs less quickly than the Opus models in Fast Mode (F-37). The product page says "the fastest and most efficient model in the Claude 5.5 family" (F-26). Keep the qualifier.
- **C-5 Subagent examples.** The launch post pairs Haiku 5.5 with "Opus 5.5 and Sonnet 5.5 as a subagent on coding work" (F-23). The product page says "A more intelligent model like Fable or Opus can plan the work and hand off subtasks to Haiku" (F-150). Both are verified; name the models as each page does.
- **C-6 Scout NOT FOUND superseded.** research/sources-scout.md lists plan-level Claude apps access as NOT FOUND. The product page states it: "Free, Pro, Max, Team, and Enterprise users can select Haiku 5.5 on Claude.ai, available on web, iOS, and Android." (F-120).
- **C-7 Thinking label.** The overview labels Haiku 5.5 "Adaptive" (F-163). Claude Code says "You can’t turn thinking off on ... Haiku 5.5" (F-169). Resolved by surface: on the API, thinking can be disabled at high effort or below and returns 400 at xhigh or max (F-167, F-168); Claude Code does not offer disabling. Copy must not say Haiku 5.5 thinking can be turned off without naming the surface.
- **C-8 Context window by surface.** The Help Center gives 1M tokens in chat and Claude Code (F-70) and 500K tokens in Cowork (F-71); the overview gives 1M tokens (F-141). The surfaces differ; this is not a contradiction. Cowork copy says 500K.
- **C-9 Claude Code haiku alias by provider.** The haiku alias is Haiku 5.5 on the Anthropic API from v2.1.293 (F-12, F-125). Other providers are on Haiku 4.5: "Claude Platform on AWS | Opus 5.5 | Sonnet 4.6 | Haiku 4.5" (notes-platforms-family P-85); "Amazon Bedrock, Google Cloud’s Agent Platform | Opus 5.5 | Sonnet 4.5 | Haiku 4.5" (P-86); "Microsoft Foundry | Opus 4.6 | Sonnet 4.5 | Haiku 4.5" (P-87). Earlier versions: "fable resolves to Fable 5 and haiku resolves to Haiku 4.5 on every provider" (P-90). Availability is not the same as the alias default.
- **C-10 Batch 300K platform scope.** The Haiku 5.5 overview and models overview state the 300k batch output with no platform qualifier (F-67; "On the Message Batches API, Claude Haiku 5.5 supports up to 300k output tokens with the output-300k-2026-03-24 beta header."). The batch-processing page says: "Extended output is available on the Message Batches API only, not the synchronous Messages API. It is supported on the Claude API and Claude Platform on AWS, and is not currently available on Amazon Bedrock, Google Cloud, or Microsoft Foundry." (https://platform.claude.com/docs/en/build-with-claude/batch-processing). Treat 300k batch output as Claude API and Claude Platform on AWS until resolved.
- **C-11 Biology safeguards comparison set.** The launch post: "Haiku 5.5’s biology safeguards are the same as for Sonnet 5, Sonnet 5.5, and Opus 5." (https://www.anthropic.com/claude-haiku-5-5, safety section; kept out of the facts list because the card names different models). The system card names only Sonnet 5 and Opus 5: "we have deployed the same harmful CB misuse classifiers as for our deployments of Claude Opus 5 and Claude Sonnet 5, rather than the broader research biology classifiers used for Claude Opus 5.5" (system card p. 9); and "we are releasing Haiku 5.5 with the same safeguards we deployed for Sonnet 5 and Opus 5, rather than the broader dual-use research biology classifiers used for Opus 5.5." (p. 18). The card does not mention Sonnet 5.5 here. If quoting, use the card's wording.
- **C-12 Date format.** "October 7, 2026" on the launch post, the API and Help Center release notes, the model page and the system card cover (F-13). "Oct 7, 2026" on the product page and the newsroom. Format only; same date.
- **C-13 Platform names.** The Google Cloud page is titled "Claude on Google Cloud" under a vertex-ai URL, and its body calls the platform "Agent Platform" (for example the column "Agent Platform API model ID"). The Foundry page is titled "Claude in Microsoft Foundry". The Bedrock current page is titled for Opus 4.7 and later, and the legacy Bedrock page for Opus 4.6 and earlier (F-78). Use the platform names as the product page does.
- **C-14 Bedrock availability wording.** The product page says Haiku 5.5 is available in Amazon Web Services (F-117), but Bedrock's own table gives access "See Access" (F-128) and does not list Haiku 5.5 among models open to all (F-129).
- **C-15 Head-only metadata.** These are page metadata, not visible text: the launch post title "Introducing Claude Haiku 5.5 \ Anthropic" (notes-launch L-06), its meta description (F-21), and the product page's family-level meta description "Our fastest model, a lightweight version of our most powerful AI, at a more affordable price." (notes-launch L-94), which is not specific to Haiku 5.5 and is not carried.
- **C-16 Look-alike figures for other models.** The newsroom says of Sonnet 5.5: "A clear upgrade over Sonnet 5 that runs 30% faster and costs up to 30% less for most work." (https://www.anthropic.com/news). Do not attribute it to Haiku 5.5. The product page's "73.3% on SWE-bench Verified" is for Haiku 4.5 (F-61). The footnote 2 percentages (F-86) are price figures, not speed figures.
- **C-17 Code execution free hours (general, not carried).** claude.com/pricing says "50 free hours of usage daily per organization." (https://claude.com/pricing). The pricing page says "Each organization receives 1,550 free hours of usage per month" (https://platform.claude.com/docs/en/about-claude/pricing). These conflict and are not Haiku-specific; not carried.
- **C-18 Haiku 5.5 "fastest" versus "most efficient".** The product page's Announcements entry says "fastest and most efficient" (F-26), while the newsroom and launch post say "fastest" with qualifiers (F-27, F-37). See C-4.
- **C-19 "2.5x" figures.** Two sources print "2.5x" for different things. The choosing-a-model guide says fast mode on Claude Opus 5.5, Opus 5 and Opus 4.8 "delivers up to 2.5x higher output speed at premium pricing" (F-230). That is not a Haiku 5.5 figure. Asana's customer statement says "up to 2.5x faster inference per agent turn" for its own eval, compared with the model it uses today (F-192). Do not cite either as an Anthropic speed figure for Haiku 5.5.

## Dropped

- FAILED rows: none. verify-platforms-family.md gives 0 FAILED among its 102 P-rows (97 VERIFIED, 5 ADJUSTED); its 14 N-rows are NEW-VERIFIED. This pass checked all 319 notes rows by script (94 launch, 119 API-pricing, 4 system-card and 102 platforms rows); every quote used is present on its cited page, after the table and spacing adjustments described under Method, and no row was judged FAILED.

Verified rows not carried (kept out of the facts list on purpose):
- Inference or not stated for Haiku 5.5: A-18, A-43, A-45, A-89, A-90 (regional premium, "all future models" scope), P-40, P-41, P-42 (Sonnet 4.6 code comment; Haiku 5.5 not named), N-05, N-06, N-13.
- Outside Haiku 5.5 scope or outside the overview table: L-75, L-76 (Sonnet 5.5 cache price cut), L-77, L-78 (monthly API credits by plan), A-57 (Haiku 4.5 retirement), P-80, P-81, P-82, P-101, P-102 (sibling aliases and Fable descriptions; the family section uses the overview table only).
- Safety pointers and conflict-only text: L-89 (see C-11), L-90, L-91 (general safety pointers).
- Navigation, duplicates or conflict-only: P-59 (site navigation), P-63, P-73 (intro of F-133), A-61 (wording only), L-09, L-93, L-94 (see C-2 and C-15), P-50, P-51 (see C-2), P-85 to P-87 and P-90 (see C-9), A-103 (see C-10), P-78, P-79, P-99 (Claude Code configuration details beyond the facts above), N-09 (duplicate of F-62).
- Duplicates of carried facts (same sentence on several pages) are cited as extra sources in the entry, not listed here.
