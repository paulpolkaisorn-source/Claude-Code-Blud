# Verification report: launch

Archived by the director from the verifier agent's returned report (workflow wf_f2349192-4e4, label verify:launch), because the agent returned it as its final message instead of writing this file. Content below is the agent's report, unedited.

**Verification of research/notes-launch.md (fresh downloads, accessed 2026-10-08)**

- **File:** research/verify-launch.md was not written. The subagent output rule forbids report .md files, so this message is the report. No other files were changed.
- **Downloads:** the scratchpad, `/tmp/claude-0/-home-user-Claude-Code-Blud/0296b1a2-ba52-5009-bc6b-94d771daca14/scratchpad/verify-L/` (`dl/`, `text/`, `img/`), not `/tmp/verify-L`, per the session scratchpad rule.
- **Method:** the five notes pages plus about 30 other primary pages from the scout list, fetched fresh (all HTTP 200). Quotes were matched whitespace-normalized against extracted visible text. Numeric rows were checked cell by cell. The system card PDF was read with pdftotext, and its page 111 table was rendered and read as an image.

**Counts (94 rows):** VERIFIED 92, ADJUSTED 2 (L-04, L-48), FAILED 0. **Failed ids: none.** NEW-VERIFIED 32 (NEW-01 to NEW-32).

URL keys: [L] https://www.anthropic.com/claude-haiku-5-5 · [H] https://www.anthropic.com/claude/haiku · [N] https://www.anthropic.com/news · [A] https://platform.claude.com/docs/en/release-notes/overview (also checked against its .md variant) · [S] https://support.claude.com/en/articles/12138966-release-notes

**Table 1: notes rows**

| id | verdict | corrected value | evidence | URL |
|---|---|---|---|---|
| L-01 | VERIFIED | — | "October 7, 2026" line above H1 "Claude Haiku 5.5" | [L] |
| L-02 | VERIFIED | — | "Claude Haiku 5.5 Oct 7, 2026", tagged New | [H] |
| L-03 | VERIFIED | — | "Introducing Claude Haiku 5.5 … Oct 7, 2026", first card | [N] |
| L-04 | ADJUSTED | Keep "October 7, 2026" as the label above the Haiku entries. Strike "no other date label comes before the Haiku entry": an "October 8, 2026" label sits above it, heading a different entry (Compliance API). | "October 8, 2026 / The Compliance API chat endpoints…" then "October 7, 2026 / We've lowered the price…" | [A] |
| L-05 | VERIFIED | — | month heading "October 2026", date heading "October 7, 2026", entry "Claude Haiku 5.5 launch" | [S] |
| L-06 | VERIFIED | — | title element "Introducing Claude Haiku 5.5 \ Anthropic" | [L] |
| L-07 | VERIFIED | — | the only h1 is "Claude Haiku 5.5" | [L] |
| L-08 | VERIFIED | — | h2 "Introducing Claude Haiku 5.5" | [N] |
| L-09 | VERIFIED | — | only h1 is "Claude Haiku 4.5"; tagline matches | [H] |
| L-10 | VERIFIED | — | "Introducing Claude Haiku 5.5: the cheapest, fastest, and most capable small model we’ve ever released." | [L] |
| L-11 | VERIFIED | — | meta description, exact | [L] |
| L-12 | VERIFIED | — | "Claude Haiku 5.5 is designed for high-volume, cost-sensitive tasks." | [L] |
| L-13 | VERIFIED | — | "It reliably handles quick and repetitive workloads (like summaries, compactions, database queries, and classification requests)." | [L] |
| L-14 | VERIFIED | — | "It pairs well with Opus 5.5 and Sonnet 5.5 as a subagent on coding work." ("lead" is the notes' gloss) | [L] |
| L-15 | VERIFIED | — | "…best suited to more narrowly scoped tasks… like compaction, summarization, or subagent work." | [L] |
| L-16 | VERIFIED | — | "Sonnet 5.5 and Opus 5.5 remain better choices for complex agentic coding tasks…" | [L] |
| L-17 | VERIFIED | — | "Haiku 5.5 is our first Haiku-class model to come with an adjustable effort setting." | [L] |
| L-18 | VERIFIED | — | "It is also the first Haiku with effort controls, so teams can tune cost against intelligence for each task." | [H] |
| L-19 | VERIFIED | — | "Claude Haiku 5.5 is the fastest and most efficient model in the Claude 5.5 family…" | [H] |
| L-20 | VERIFIED | — | "Our fastest, cheapest, and most capable small model yet. It’s designed for high-volume, cost-sensitive work." | [N] |
| L-21 | VERIFIED | — | "We just launched Claude Haiku 5.5, the cheapest, fastest, and most capable small model we’ve released…" | [S] |
| L-22 | VERIFIED | — | "our most capable model tuned for high-volume and latency-sensitive work" (Oct 7 entry) | [A] |
| L-23 | VERIFIED | — | "Haiku 5.5 is our most capable Haiku yet, a significant step up over Haiku 4.5 across coding, tool use, computer use, and agents." | [H] |
| L-24 | VERIFIED | — | "Use Haiku 5.5 when speed and volume matter most." | [H] |
| L-25 | VERIFIED | — | "For complex coding and knowledge work, Opus 5.5 is the daily driver, and Sonnet 5.5 is a good fit for well-scoped tasks." | [H] |
| L-26 | VERIFIED | — | "Haiku 5.5 powers high-volume product features and natural language processing tasks like classification, summarization, and text generation." | [H] |
| L-27 | VERIFIED | — | "Haiku 5.5 is fast enough for real-time experiences and efficient enough to run at volume." | [H] |
| L-28 | VERIFIED | — | "It works alongside larger Claude models, making it practical to add things like summarization, classification, routing, and compaction…" | [H] |
| L-29 | VERIFIED | — | "Haiku 5.5 is built for latency-sensitive use cases like chat, voice agents, live support, and in-app assistants…" | [H] |
| L-30 | VERIFIED | — | "Haiku 5.5 is a fast, cost-efficient subagent for coding and well-defined tasks." | [H] |
| L-31 | VERIFIED | — | "A more intelligent model like Fable or Opus can plan the work and hand off subtasks to Haiku…" | [H] |
| L-32 | VERIFIED | — | "Haiku 5.5 is a strong computer use agent for repetitive tasks like form filling, data entry…" | [H] |
| L-33 | VERIFIED | — | "Haiku 5.5 handles focused coding and multi-step tool use, like direct edits and small, specific changes…" | [H] |
| L-34 | VERIFIED | — | "since it’s also our fastest model to date, it works especially well for speed-sensitive tasks like live customer support and browser use." | [L] |
| L-35 | VERIFIED | — | footnote 1: "fastest model to date at each model’s standard speed, although it runs less quickly than our Opus models in Fast Mode." | [L] |
| L-36 | VERIFIED | — | "For developers, we’re also updating our Claude Python and TypeScript SDKs to add support for computer use and browser use in beta." | [L] |
| L-37 | VERIFIED | — | "Haiku 5.5 is especially well-suited to these tasks, given its combination of speed, capability, and price." | [L] |
| L-38 | VERIFIED | — | "The Python and TypeScript SDKs now include classes, in beta, for the browser use tool and the computer use tool." | [A] |
| L-39 | VERIFIED | — | "It has a 1M token context window, 128k max output tokens, and adaptive thinking with the effort parameter." | [A] |
| L-40 | VERIFIED | — | "Code written for Claude Haiku 4.5 can break on Claude Haiku 5.5. Manual extended thinking (budget_tokens) returns a 400 error…" | [A] |
| L-41 | VERIFIED | — | "See our migration guide for details." | [L] |
| L-42 | VERIFIED | — | table row GDPval-AA v2.1: 1620 / 735 / 1437 / 1840 (Haiku 5.5, Haiku 4.5, GPT-6 Luna, Sonnet 5.5). System card Table 8.1.A agrees. | [L] |
| L-43 | VERIFIED | — | row AA-Briefcase v1.1: 1578 / 614 / 1336 / 1824. System card agrees. | [L] |
| L-44 | VERIFIED | — | row OSWorld 2.1: 72.4% / 15.7% / 48.9% / 83.9% (all "Offline subset"). System card agrees. | [L] |
| L-45 | VERIFIED | — | row HLE no tools: 45.9% / 10.2% / — / 56.9%. System card agrees. | [L] |
| L-46 | VERIFIED | — | row HLE with tools: 57.4% / 18.7% / — / 64.5%. System card agrees. | [L] |
| L-47 | VERIFIED (caveat) | — | row Terminal-Bench 4.0: 39.2% / 0.0% / 16.4% / 70.6%. Caveat, system card s.8.4: Haiku 5.5's 39.2% is "with safeguards enabled", no fallback model, 1.8% of trials (12 of 660) stopped and failed. GPT-6 Luna 16.4% is from the public leaderboard. | [L] |
| L-48 | ADJUSTED | FrontierCode 1.1 (Main): Haiku 5.5 46.4% (max effort); Haiku 4.5 —; GPT-6 Luna 42.4%; Sonnet 5.5 52.1% (xhigh effort; Sonnet's max-effort score is 46.2%). Strike "the only qualified cell in the table": OSWorld, HLE and Chartography cells are qualified too. Haiku 5.5 at xhigh is 45.8%. | row "46.4% / — / 42.4% / 52.1%Xhigh"; system card Table 8.1.A (rendered): Haiku 46.4 (max), 45.8 (xhigh); Sonnet 46.2 (max), 52.1 (xhigh) | [L] |
| L-49 | VERIFIED | — | row Chartography no tools: 46.4% / 6.4% / 29.1% / 61.6%. System card s.8.9.1 confirms Haiku 46.4%, Haiku 4.5 6.4%, Sonnet 61.6%. | [L] |
| L-50 | VERIFIED | — | column header "Sonnet 5.5For reference" | [L] |
| L-51 | VERIFIED | — | "For details on how we run our evaluations, see the Haiku 5.5 System Card." | [L] |
| L-52 | VERIFIED | — | "OSWorld 2.1 measures how well agents can operate a real computer to finish long, multi-step tasks." | [L] |
| L-53 | VERIFIED | — | "Artificial Analysis’s GDPval-AA v2.1 evaluates agents on real-world professional work across 44 occupations." | [L] |
| L-54 | VERIFIED | — | "Humanity’s Last Exam (HLE) is a test of expert-level academic knowledge and reasoning." | [L] |
| L-55 | VERIFIED | — | "Terminal-Bench 4.0 measures how well a model can complete complex, multi-step professional tasks within a command-line interface." | [L] |
| L-56 | VERIFIED | — | chart y-axis "Elo, as reported" (GDPval chart) | [L] |
| L-57 | VERIFIED | — | chart y-axis "Partial-credit score (%)" (OSWorld chart) | [L] |
| L-58 | VERIFIED | — | chart y-axis "Score (%)" (HLE chart) | [L] |
| L-59 | VERIFIED | — | chart y-axis "Score (pass@1, %)" (Terminal-Bench chart) | [L] |
| L-60 | VERIFIED | — | "The charts below show how Haiku 5.5 performs on three benchmarks at each effort setting:" | [L] |
| L-61 | VERIFIED | — | chart legends "LowMedHighXhighMax" (4 occurrences) | [L] |
| L-62 | VERIFIED | — | "…users can decide whether to optimize for cost or intelligence." | [L] |
| L-63 | VERIFIED | — | pricing table header "Price per 1 million tokens" | [L] |
| L-64 | VERIFIED | — | row Input tokens: $0.10 / $0.50 / $1.00 / $2.00 | [L] |
| L-65 | VERIFIED | — | row Output tokens: $0.50 / $2.50 / $5.00 / $10.00 | [L] |
| L-66 | VERIFIED | — | row Cache reads: $0.01 / $0.05 / $0.10 / $0.10 | [L] |
| L-67 | VERIFIED | — | row Cache writes: $0.125 / $0.625 / $1.25 / $2.50 | [L] |
| L-68 | VERIFIED | — | "…especially good value when used for tasks with prompts up to 100,000 tokens, which make up around 90% of requests to our previous Haiku model." | [L] |
| L-69 | VERIFIED | — | "On average, it now costs around 75% less to run." | [L] |
| L-70 | VERIFIED | — | "Claude Haiku 5.5 is priced 90% lower than Claude Haiku 4.5 for requests up to 100,000 tokens, and 50% lower for requests over 100,000 tokens." | [L] |
| L-71 | VERIFIED (conflict flag) | — | "…has an updated tokenizer… which means it uses slightly more tokens per task." Conflict: the migration guide and what's-new say "the same input text produces approximately 30% more tokens on Claude Haiku 5.5 than on Claude Haiku 4.5." | [L] |
| L-72 | VERIFIED | — | "For prompts up to 100K tokens, it is $0.10 per million input tokens and $0.50 per million output tokens." | [H] |
| L-73 | VERIFIED | — | "For prompts over 100K tokens, it is $0.50 per million input tokens and $2.50 per million output tokens." | [H] |
| L-74 | VERIFIED | — | "You can save up to 90% with prompt caching and 50% with batch processing." | [H] |
| L-75 | VERIFIED | — | "Cache reads now cost 50% less: $0.10 per million tokens rather than $0.20." | [L] |
| L-76 | VERIFIED | — | "We've lowered the price of prompt cache reads on Claude Sonnet 5.5 from $0.20 USD to $0.10 USD per million tokens…" (first entry under Oct 7) | [A] |
| L-77 | VERIFIED | — | "Max 5x users will get $100 in credits per month, Max 20x users will get $200, and Team subscribers will receive up to $500…" | [L] |
| L-78 | VERIFIED | — | "Max and Team plans now include monthly API credits for running your own apps and agents on the Claude Platform." | [S] |
| L-79 | VERIFIED | — | model ID block "Model IDCopiedclaude-haiku-5-5" | [L] |
| L-80 | VERIFIED | — | "We've launched Claude Haiku 5.5 (claude-haiku-5-5)" | [A] |
| L-81 | VERIFIED | — | "Claude Haiku 5.5 is available now on all platforms, including Amazon Web Services, Google Cloud, and Microsoft Azure." | [L] |
| L-82 | VERIFIED | — | "On the Claude Platform, developers can get started with claude-haiku-5-5." | [L] |
| L-83 | VERIFIED | — | "Free, Pro, Max, Team, and Enterprise users can select Haiku 5.5 on Claude.ai, available on web, iOS, and Android." (contradicts the scout's NOT FOUND) | [H] |
| L-84 | VERIFIED | — | "…available on the Claude Platform natively, and in Amazon Web Services, Google Cloud, and Microsoft Foundry." | [H] |
| L-85 | VERIFIED | — | "Claude Haiku 5.5 is also available in Claude Code." | [H] |
| L-86 | VERIFIED | — | "It's available on the Claude API, Claude in Amazon Bedrock, Claude Platform on AWS, Claude on Google Cloud, and Claude in Microsoft Foundry." (Haiku entry; same sentence also in Sonnet and Opus entries) | [A] |
| L-87 | VERIFIED | — | "Alignment. Claude Haiku 5.5 shows major improvements across almost all of our alignment evaluations relative to Haiku 4.5." | [L] |
| L-88 | VERIFIED | — | "…cybersecurity safeguards are more restrictive than Haiku 4.5’s, but somewhat less restrictive than those we’ve applied to other recent models." (value covers the first clause only) | [L] |
| L-89 | VERIFIED | — | "Haiku 5.5’s biology safeguards are the same as for Sonnet 5, Sonnet 5.5, and Opus 5." | [L] |
| L-90 | VERIFIED | — | "We’ve conducted extensive testing and evaluation of Haiku 5.5 against our standards for safety, security, and reliability." | [H] |
| L-91 | VERIFIED | — | "In the system card for this release, we discuss new safety results in several categories." | [H] |
| L-92 | VERIFIED | — | "Claude Haiku 4.5 scores 73.3% on SWE-bench Verified, making it one of the world’s best coding models." Date Oct 15, 2025 confirmed. Only SWE-bench figure on [L][H][N][A][S]; the system card has Haiku 5.5 SWE-bench (NEW-15). | [H] |
| L-93 | VERIFIED | — | "The cheapest, fastest, and most capable small model we've ever released." (tagline under H1 "Claude Haiku 4.5") | [H] |
| L-94 | VERIFIED | — | meta description "Our fastest model, a lightweight version of our most powerful AI, at a more affordable price." | [H] |

**Table 2: NEW rows (NOT FOUND items answered)**

| id | verdict | answers | evidence (verbatim unless noted) | URL |
|---|---|---|---|---|
| NEW-01 | NEW-VERIFIED | item 2 | table row "Comparative latency / Slower / Moderate / Fast / Fastest" (Fable 5.1, Opus 5.5, Sonnet 5.5, Haiku 5.5). "Actual latency depends on prompt length, output length, and thinking effort." | https://platform.claude.com/docs/en/models/overview |
| NEW-02 | NEW-VERIFIED | item 3 | row "Context window" = 1M tokens for Haiku 5.5; row "Max output" = 128K tokens for Haiku 5.5 | https://platform.claude.com/docs/en/models/overview |
| NEW-03 | NEW-VERIFIED | item 3 | "Context window: 1M tokens · Max output: 128K tokens · Input pricing: From $0.10 / MTok · Output pricing: From $0.50 / MTok" | https://platform.claude.com/docs/en/models/haiku-5-5/overview |
| NEW-04 | NEW-VERIFIED | item 3 | "Claude Haiku 5.5 has a 1M token context window and returns up to 128k output tokens, up from 200k and 64k on Claude Haiku 4.5." (the words "context window" are a markdown link in source) | https://platform.claude.com/docs/en/models/haiku-5-5/whats-new-haiku-5-5 |
| NEW-05 | NEW-VERIFIED | item 3 (Help Center) | Haiku 5.5 rows: Chatting with Claude = 1M tokens; Claude Code = 1M tokens; Claude Cowork = 500K tokens | https://support.claude.com/en/articles/8606394-how-large-is-the-context-window-on-paid-claude-plans |
| NEW-06 | NEW-VERIFIED | item 3 (batch, extra) | "On the Message Batches API, … Claude Haiku 5.5, … support up to 300k output tokens with the output-300k-2026-03-24 beta header." | https://platform.claude.com/docs/en/models/overview |
| NEW-07 | NEW-VERIFIED | item 3 | "…Claude Haiku 5.5, … have a 1M-token context window." and "except on Claude Haiku 5.5, where prompts over 100,000 tokens cost more." | https://platform.claude.com/docs/en/build-with-claude/context-windows |
| NEW-08 | NEW-VERIFIED | item 4 | "Claude Haiku 5.5 was trained on data up until June 2026." | https://support.claude.com/en/articles/8114494-how-up-to-date-is-claude-s-training-data |
| NEW-09 | NEW-VERIFIED | item 4 | rows "Reliable knowledge cutoff / Jun 2026" and "Training data cutoff / Jun 2026" (Haiku 5.5 column) | https://platform.claude.com/docs/en/models/overview |
| NEW-10 | NEW-VERIFIED | item 4 | "Haiku 5.5’s knowledge cutoff date is June 2026." (system card s.1.1) | https://www.anthropic.com/claude-haiku-5-5-system-card |
| NEW-11 | NEW-VERIFIED | item 5 | "Most Claude models default to high effort, spending as many tokens as needed for excellent results; Claude Opus 5.5 and Claude Haiku 5.5 default to medium." | https://platform.claude.com/docs/en/build-with-claude/effort |
| NEW-12 | NEW-VERIFIED | item 5 | row "Default effort / medium" (Haiku 5.5 overview) | https://platform.claude.com/docs/en/models/haiku-5-5/overview |
| NEW-13 | NEW-VERIFIED | item 5 | "`medium` is the default on the Claude API and in Claude Code." | https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-haiku-5-5 |
| NEW-14 | NEW-VERIFIED | item 6; item 14 | "Fast mode is supported on the following models:" lists Claude Opus 5.5, Opus 5, Opus 4.8. Haiku 5.5 is not listed. Look-alike: "Fast mode delivers up to 2.5x higher output tokens per second from Claude Opus 5.5, Claude Opus 5, and Claude Opus 4.8." | https://platform.claude.com/docs/en/build-with-claude/fast-mode |
| NEW-15 | NEW-VERIFIED | item 7 | Table 8.1.A (Haiku 5.5 / Haiku 4.5 / Sonnet 5.5 / GPT-6 Luna): SWE-Bench Pro 64.8 / – / 81.3 / –; SWE-bench Multilingual 83.7 / 67.4 / 90.3 / –; SWE-bench Multimodal 30.7 / 19.8 / 54.3 / –. No SWE-bench Verified row. | https://www.anthropic.com/claude-haiku-5-5-system-card (p.111) |
| NEW-16 | NEW-VERIFIED | item 7 | Table 8.1.A: HealthBench Professional (Length-adjusted) 64.8 / 32.2 / 69.2 / – | same, p.111 |
| NEW-17 | NEW-VERIFIED | item 7 | "Claude Haiku 5.5 scored 46.4% without tools and 86.2% with tools." (Chartography, s.8.9.1) | same |
| NEW-18 | NEW-VERIFIED | item 7 | "Claude Haiku 5.5 scored best at max effort: 46.4% on Main and 58.4% on Extended." (FrontierCode, s.8.3) | same |
| NEW-19 | NEW-VERIFIED | item 8 (unit, definition) | "Claude Haiku 5.5 scored an Elo of 1578 at max effort, up from 614 for Claude Haiku 4.5." and "AA-Briefcase v1.1, developed by Artificial Analysis, is a new benchmark built by industry experts for measuring long-horizon knowledge work on complex projects." (s.8.10.3) | same |
| NEW-20 | NEW-VERIFIED | item 8 (unit; resolves L-56) | "…performance is measured via Elo ratings derived from blind pairwise comparisons of model outputs, anchored to DeepSeek V4.1 Flash (max) at 1600." and "Claude Haiku 5.5 scored an Elo of 1620 at max effort" (s.8.10.2) | same |
| NEW-21 | NEW-VERIFIED | item 8 (definition) | "FrontierCode is an agentic coding benchmark of 150 software engineering tasks created by Cognition." and "Extended is the full set of 150 tasks, and Main is the 100 hardest." (s.8.3) | same |
| NEW-22 | NEW-VERIFIED | item 8 (definition) | "Chartography17 is a chart-understanding benchmark from Surge AI with 100 tasks on specialized chart types rarely evaluated in existing benchmarks." ("17" is a footnote marker; this is the one notes-check miss, a formatting artifact) | same |
| NEW-23 | NEW-VERIFIED | item 8 ("Xhigh" meaning) | "`xhigh` | Extended capability for long-horizon work. Available on … and Claude Haiku 5.5." | https://platform.claude.com/docs/en/build-with-claude/effort |
| NEW-24 | NEW-VERIFIED | item 9 | "At the default effort (medium), it scored 1277 while using about a tenth of the output tokens it used at max." (GDPval-AA, s.8.10.2; max score 1620) | system card |
| NEW-25 | NEW-VERIFIED | item 9 | "At the default effort (medium), it scored 1372 while using under a quarter of the output tokens it used at max." (AA-Briefcase, s.8.10.3; max score 1578) | system card |
| NEW-26 | NEW-VERIFIED | item 9 | Table 8.1.A FrontierCode 1.1 (Main), read from the rendered page: Haiku 5.5 46.4 (max) and 45.8 (xhigh); Sonnet 5.5 46.2 (max) and 52.1 (xhigh) | system card p.111 (image read) |
| NEW-27 | NEW-VERIFIED | item 9 (configuration) | "Unless otherwise noted, all Haiku 5.5 results use the following standard configuration: adaptive thinking at max effort, default sampling settings (temperature, top_p), averaged over five trials." | system card p.111 |
| NEW-28 | NEW-VERIFIED | item 10 | "This page provides detailed pricing information for Anthropic's models and features. All prices are in USD." | https://platform.claude.com/docs/en/about-claude/pricing |
| NEW-29 | NEW-VERIFIED | item 11 | row "claude-haiku-5-5 / Active / N/A / Not sooner than October 7, 2027" (header "API model name / Current state / Deprecated / Tentative retirement date") | https://platform.claude.com/docs/en/about-claude/model-deprecations |
| NEW-30 | NEW-VERIFIED | item 13 | "Haiku 5.5 had the highest harmless response rate of any recent model tested on the API without a system prompt, at 98.39% compared with 97.23% for Claude Haiku 4.5." (s.4.1.1; higher is better) | system card |
| NEW-31 | NEW-VERIFIED | item 13 | "Claude Haiku 5.5 over-refused benign requests less often than Claude Haiku 4.5 on the API (0.17% versus 0.44%) and substantially less often than Haiku 4.5 on claude.ai (0.82% versus 3.05%)." (s.4.1.2) | system card |
| NEW-32 | NEW-VERIFIED | item 13 | "The attack success rate was 0.08% over all attempts without prompt injection probes, compared to 58.40% for Claude Haiku 4.5." and "With prompt injection probes enabled, no attack succeeded against Claude Haiku 5.5 in any scenario, compared to 30.43%…" (s.5.2.2.1) | system card |

**Table 3: NOT FOUND items (status after this pass)**

| item | status | note |
|---|---|---|
| 1 numeric speed | NOT FOUND (confirmed) | No first-party number on [L][H][N][A][S], the models overview, the Haiku overview, fast-mode, or the system card (no "latency" or "tokens per second" hits). Customer testimony only (launch post: Asana "over a 30% reduction in latency"; Box "at about half the latency"). Excluded per brief, not added. |
| 2 non-numeric comparison | FOUND → NEW-01 | Haiku 5.5 "Fastest", Sonnet 5.5 "Fast". |
| 3 context and max output | FOUND → NEW-02 to NEW-07 | Notes said "only [A]"; that holds for the five pages only. The Help Center context article also gives Haiku 5.5 values, including Cowork 500K. |
| 4 knowledge cutoff | FOUND → NEW-08 to NEW-10 | June 2026. |
| 5 default effort | FOUND → NEW-11 to NEW-13 | medium. The notes' Opus 4.8 "high" quote is verbatim in [A] line 214. |
| 6 Fast Mode | FOUND (negative) → NEW-14 | Haiku 5.5 not on the supported list. |
| 7 benchmarks beyond table | FOUND → NEW-15 to NEW-18 | SWE-bench Verified not found; the system card has Pro, Multilingual and Multimodal. |
| 8 units and definitions | FOUND → NEW-19 to NEW-23 | Elo for GDPval-AA and AA-Briefcase; definitions for FrontierCode and Chartography; xhigh meaning. |
| 9 per-effort scores | PARTIAL → NEW-24 to NEW-27 | Text gives medium-effort points for GDPval-AA and AA-Briefcase, and xhigh for FrontierCode. Other per-effort points exist only in system card charts (8.3.A/B, 8.9.1.B), not read. |
| 10 non-USD pricing | NOT FOUND in other currencies; "All prices are in USD" → NEW-28 | |
| 11 retirement date | FOUND → NEW-29 | Active; not sooner than October 7, 2027. |
| 12 exact launch time | NOT FOUND (confirmed) | No time of day on [L][H][N][A][S]. |
| 13 safety numbers | FOUND → NEW-30 to NEW-32 | Harmless 98.39%; over-refusal 0.17%; prompt-injection success 0.08%. |
| 14 look-alikes | Verified | "runs 30% faster" is Sonnet 5.5 vs Sonnet 5 [N]. SWE-bench on [H] is Haiku 4.5. Footnote 2 figures are prices. The "2.5x" fast-mode figure is Opus-only (NEW-14). |

**Flags for the director**

1. The notes' "Checked, no conflict" section says Haiku 5.5 prices agree on [A]. [A] has no Haiku 5.5 prices. Only the Sonnet 5.5 cache-read cut appears there. Drop [A] from that claim.
2. The scout's "Notes for the director" calls plan-level Claude.ai access NOT FOUND. L-83 on [H] states it, and it is verified.
3. L-71 conflicts with the docs' "approximately 30% more tokens" statement for the same input text (NEW-04 page / migration guide). Do not write "slightly" without the caveat.
4. L-47: carry the "with safeguards enabled" qualifier if the 39.2% is used.
5. L-48: the launch's Sonnet 52.1% is an xhigh figure, and Haiku's 46.4% is a max figure. Only the Sonnet cell is labeled.
6. Context window differs by surface: 1M in chat and Claude Code, 500K in Cowork (NEW-05). The launch copy says only "1M".
