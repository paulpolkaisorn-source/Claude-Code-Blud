# Claude Haiku 5.5 page copy

Every product fact cites its id in research/facts.md. Date: 2026-10-08.

## meta

- title: "Claude Haiku 5.5, an unofficial fan showcase"
- description: "An unofficial fan showcase of Claude Haiku 5.5. Anthropic says it is designed for high-volume, cost-sensitive tasks." [F-22]
- og-title: "Claude Haiku 5.5"
- og-description: "An unofficial fan showcase of Claude Haiku 5.5. Each product fact traces to a published Anthropic source."

## global

- skip-link: "Skip to content"
- nav-cap-0: "Computer use"
- nav-cap-1: "High volume"
- nav-cap-2: "Effort"
- back-to-top: "Back to top"

## preloader

- readout-label: "LOADING"
- sr-progress: "Loading the page, {n} percent"

## hero

- kicker: "Launched October 7, 2026" [F-13]
- h1-line-1: "Claude"
- h1-line-2: "Haiku&nbsp;5.5"
- lede: "Anthropic calls it “the cheapest, fastest, and most capable small model we’ve ever released,” designed for high-volume, cost-sensitive tasks." [F-20, F-22]
- cta-primary-label: "Haiku 5.5 docs"
- cta-primary-href: "https://platform.claude.com/docs/en/models/haiku-5-5/overview"
- cta-secondary-label: "See speed"
- cta-secondary-href: "#speed"
- dim-row-a: "05"
- dim-row-b: "07"
- dim-row-c: "05"
- dim-total: "17"
- sr-object: "Seventeen blocks set in three rows of five, seven and five."

## speed

- kicker: "Speed"
- title: "Fastest" [F-140]
- title-marker: "1"
- support: "The model selection matrix lists Haiku 5.5 under “The lowest latency and price.”" [F-226]
- source-note: "Comparative latency, relative to the current lineup." [F-140, F-38]
- footnote-marker: "1"
- footnote: "At each model’s standard speed, although it runs less quickly than our Opus models in Fast Mode." [F-37]
- example-label: "Example output"
- example-prompt: "Summarize this support ticket in a few sentences."
- example-stream:
```text
The customer reports a cracked screen and asks for a replacement before the weekend. They ask whether the damaged item must be returned. The order is confirmed and the item is in stock. A replacement ships with a return label.
```
- sr-race: "Seventeen blocks race in formation across the screen, and they streak faster as the reader scrolls."

## capabilities

- kicker: "Capabilities"
- title: "Narrow tasks, at&nbsp;volume" [F-22, F-24]
- intro: "The launch post says Haiku 5.5 is especially well-suited to computer use and browser use. It is also designed for high-volume, cost-sensitive tasks." [F-153, F-22]
- cap-0-heading: "Computer use and browser&nbsp;use" [F-153]
- cap-0-label: "BLOCKS 01 TO 05"
- cap-0-body: "Haiku 5.5 is a strong computer use agent for repetitive tasks like form filling, data entry, and moving information between apps, and it is cost efficient at scale. Haiku 5.5 is especially well-suited to these tasks, given its combination of speed, capability, and price." [F-151, F-153]
- cap-0-body-narrow: "Haiku 5.5 is a strong computer use agent for repetitive tasks like form filling, data entry, and moving information between apps." [F-151]
- cap-0-chart-title: "OSWorld 2.1" [F-44]
- cap-0-bar-a-label: "Haiku 5.5" [F-44]
- cap-0-bar-a-value: "72.4%" [F-44]
- cap-0-bar-b-label: "Haiku 4.5" [F-44]
- cap-0-bar-b-value: "15.7%" [F-44]
- cap-0-caption: "OSWorld 2.1, offline subset, partial-credit score (%). OSWorld 2.1 measures how well agents can operate a real computer to finish long, multi-step tasks." [F-44, F-56, F-51]
- cap-0-source-note: "Haiku 5.5 and Haiku 4.5, from the launch post performance table. The table also lists GPT-6 Luna (48.9%) and Sonnet 5.5 (83.9%). The system card (Table 8.1.A) reports the same values." [F-44]
- cap-1-label: "BLOCKS 06 TO 12"
- cap-1-heading: "High-volume&nbsp;work" [F-22]
- cap-1-body: "It reliably handles quick and repetitive workloads (like summaries, compactions, database queries, and classification requests). It works alongside larger Claude models, making it practical to add things like summarization, classification, routing, and compaction to complex products and agent systems." [F-146, F-148]
- cap-1-body-narrow: "It reliably handles quick and repetitive workloads (like summaries, compactions, database queries, and classification requests)." [F-146]
- cap-1-bin-1: "Summary" [F-146, F-148]
- cap-1-bin-2: "Classification" [F-148]
- cap-1-bin-3: "Routing" [F-148]
- cap-2-label: "BLOCKS 13 TO 17"
- cap-2-heading: "Adjustable&nbsp;effort" [F-155]
- cap-2-body: "Haiku 5.5 is our first Haiku-class model to come with an adjustable effort setting. This means that, as with our other models, users can decide whether to optimize for cost or intelligence." [F-155, F-156]
- cap-2-body-narrow: "Haiku 5.5 is our first Haiku-class model to come with an adjustable effort setting." [F-155]
- cap-2-step-1: "Low" [F-60]
- cap-2-step-2: "Med" [F-60]
- cap-2-step-3: "High" [F-60]
- cap-2-step-4: "Xhigh" [F-60]
- cap-2-step-5: "Max" [F-60]
- cap-2-caption: "Effort levels on the launch charts: Low, Med, High, Xhigh, Max. Medium is the default on the Claude API and in Claude Code." [F-60, F-157]

## code

- kicker: "The API"
- title: "In code"
- intro: "On the Claude Platform, developers can get started with claude-haiku-5-5. This request streams the reply and sets effort to low." [F-119, F-157, F-231, F-233]
- request-label: "REQUEST"
- code:
```ts
import Anthropic from "@anthropic-ai/sdk";
const client = new Anthropic();
const ticket = "Charged twice for one seat.";

await client.messages
  .stream({
    model: "claude-haiku-5-5", max_tokens: 1024,
    output_config: { effort: "low" },
    messages: [{ role: "user", content: ticket }],
  })
  .on("text", (t) => process.stdout.write(t));
```
- code-sources: "Streaming: https://platform.claude.com/docs/en/build-with-claude/streaming; Get started: https://platform.claude.com/docs/en/get-started; Effort: https://platform.claude.com/docs/en/build-with-claude/effort" [F-02, F-157, F-231, F-232, F-233, F-234, F-236]
- response-label: "EXAMPLE OUTPUT"
- response-stream:
```text
The customer was charged twice for one seat.
Refund the second charge.
Bill the seat once from now on.
```
- copy-label: "Copy"
- copied-label: "Copied"
- sr-code: "Short TypeScript program that streams a reply from Claude Haiku 5.5 with effort set to low, and an example of that reply."

## family

- kicker: "Family"
- title: "Four models, by&nbsp;latency" [F-139, F-140]
- intro: "The product page says a more intelligent model like Fable or Opus can plan the work and hand off subtasks to Haiku, making it practical to run many agents in parallel." [F-150]
- axis-label: "Comparative latency" [F-140]
- axis-note: "Relative to the current lineup. Actual latency depends on prompt length, output length, and thinking effort." [F-38]
- price-note: "For prompts up to 100K tokens, it is $0.10 per million input tokens and $0.50 per million output tokens." [F-81]
- fable-name: "Claude Fable 5.1" [F-139]
- fable-latency: "Slower" [F-140]
- fable-description: "For demanding reasoning and long-horizon agentic work" [F-139]
- fable-price: "$10 / input MTok, $50 / output MTok" [F-142]
- opus-name: "Claude Opus 5.5" [F-139]
- opus-latency: "Moderate" [F-140]
- opus-description: "For long-running agentic coding and knowledge work" [F-139]
- opus-price: "$4 / input MTok, $20 / output MTok" [F-142]
- sonnet-name: "Claude Sonnet 5.5" [F-139]
- sonnet-latency: "Fast" [F-140]
- sonnet-description: "The best combination of speed and intelligence" [F-139]
- sonnet-price: "$2 / input MTok, $10 / output MTok" [F-142]
- haiku-name: "Claude Haiku 5.5" [F-139]
- haiku-latency: "Fastest" [F-140]
- haiku-description: "For high-volume, latency-sensitive tasks such as classification, extraction, and routing" [F-139]
- haiku-price: "From $0.10 / input MTok, From $0.50 / output MTok" [F-142]

## pricing

- kicker: "Pricing"
- title: "Pricing per million&nbsp;tokens" [F-80]
- intro: "Haiku 5.5 is priced by prompt length. Prompts over 100K tokens pay higher rates than prompts up to 100K." [F-105]
- table-caption: "Haiku 5.5 prices per million tokens" [F-80]
- col-1: "Per million tokens" [F-80]
- col-2: "Prompts up to 100K tokens" [F-80]
- col-3: "Prompts over 100K tokens" [F-80]
- input-label: "Input" [F-83]
- input-up: "$0.10" [F-81, F-83]
- input-over: "$0.50" [F-82, F-83]
- output-label: "Output" [F-84]
- output-up: "$0.50" [F-81, F-84]
- output-over: "$2.50" [F-82, F-84]
- cache-write-5m-label: "5m cache write" [F-91]
- cache-write-5m-up: "$0.125" [F-91]
- cache-write-5m-over: "$0.625" [F-92]
- cache-write-1h-label: "1h cache write" [F-93]
- cache-write-1h-up: "$0.20" [F-93]
- cache-write-1h-over: "$1" [F-94]
- cache-read-label: "Cache read" [F-89]
- cache-read-up: "$0.01" [F-89]
- cache-read-over: "$0.05" [F-90]
- savings: "The product page says you can save up to 90% with prompt caching and 50% with batch processing." [F-100]
- comparison: "Compared with Haiku 4.5, Haiku 5.5 costs around 75% less to run on average." [F-85]
- context: "A 1M-token context window and up to 128K output tokens." [F-62, F-66]
- availability-title: "Availability"
- availability-platforms: "Claude API, Amazon Bedrock (access required), Claude Platform on AWS, Google Cloud and Microsoft Foundry." [F-115, F-128, F-129]
- availability-apps: "Claude.ai for Free, Pro, Max, Team and Enterprise on web, iOS and Android, and Claude Code v2.1.293 or later." [F-120, F-121, F-124]

## closing

- kicker: "In one breath"
- haiku-line-1: "Small task, done with care"
- haiku-line-2: "Each word set in its own place"
- haiku-line-3: "In a single breath"
- haiku-syllables: "5-7-5"
- haiku-syllable-check: "Line 1: small 1, task 1, done 1, with 1, care 1 = 5. Line 2: each 1, word 1, set 1, in 1, its 1, own 1, place 1 = 7. Line 3: in 1, a 1, single 2, breath 1 = 5."
- cta-primary-label: "Read the docs"
- cta-primary-href: "https://platform.claude.com/docs/en/models/haiku-5-5/overview"
- cta-secondary-label: "View sources"
- cta-secondary-href: "#sources"

## footer

- cell-title-label: "TITLE"
- cell-title-value: "Claude Haiku 5.5"
- cell-scale-label: "SCALE"
- cell-scale-value: "1:1"
- cell-sheet-label: "SHEET"
- cell-sheet-value: "1 / 1"
- cell-rev-label: "REV"
- cell-rev-value: "A"
- cell-date-label: "DATE"
- cell-date-value: "2026-10-08"
- sources-title: "Sources"
- source-01: "Launch post" https://www.anthropic.com/claude-haiku-5-5
- source-02: "Haiku 5.5 product page" https://www.anthropic.com/claude/haiku
- source-03: "Newsroom" https://www.anthropic.com/news
- source-04: "Models overview" https://platform.claude.com/docs/en/models/overview
- source-05: "Models overview, Markdown copy" https://platform.claude.com/docs/en/models/overview.md
- source-06: "Haiku 5.5 overview" https://platform.claude.com/docs/en/models/haiku-5-5/overview
- source-07: "Haiku 5.5 what’s new" https://platform.claude.com/docs/en/models/haiku-5-5/whats-new-haiku-5-5
- source-08: "API release notes" https://platform.claude.com/docs/en/release-notes/overview
- source-09: "Help Center release notes" https://support.claude.com/en/articles/12138966-release-notes
- source-10: "Haiku 5.5 system card (PDF)" https://www-cdn.anthropic.com/e1080d6bf5ae2018ea3c2f414064be03232f5be5/Claude%20Haiku%205.5%20System%20Card.pdf
- source-11: "Context windows" https://platform.claude.com/docs/en/build-with-claude/context-windows
- source-12: "API pricing" https://platform.claude.com/docs/en/about-claude/pricing
- source-13: "claude.com pricing" https://claude.com/pricing
- source-14: "Prompt caching" https://platform.claude.com/docs/en/build-with-claude/prompt-caching
- source-15: "Claude Code model configuration" https://code.claude.com/docs/en/model-config
- source-16: "Effort" https://platform.claude.com/docs/en/build-with-claude/effort
- source-17: "Streaming" https://platform.claude.com/docs/en/build-with-claude/streaming
- source-18: "Get started" https://platform.claude.com/docs/en/get-started
- source-19: "Choosing a model" https://platform.claude.com/docs/en/about-claude/models/choosing-a-model
- docs-title: "Anthropic&nbsp;docs"
- docs-link-models: "Models overview" https://platform.claude.com/docs/en/models/overview
- docs-link-haiku: "Haiku 5.5 overview" https://platform.claude.com/docs/en/models/haiku-5-5/overview
- docs-link-pricing: "API pricing" https://platform.claude.com/docs/en/about-claude/pricing
- disclaimer: "Unofficial fan and showcase page. Not affiliated with Anthropic."
- credit: "Set in Bodoni Moda and Geist Mono."

## notes

- not-applied: none. Every blocker and major finding was applied as written.
- open: closing haiku lines 1 and 3 ("Small task, done with care", "In a single breath") are unchanged. The finding reads "done with care" as a quality claim and "In a single breath" as a speed sense. The director decides under D7: record both as poetic license, or replace line 3 with five syllables that carry no speed sense.
- resolved (D16, F-233 to F-235): the request sets effort with a top-level output_config, and the effort page says no beta header is required. F-161 and F-162 describe the per-message form, which the code does not use.
- open: output_config inside client.messages.stream() is not shown on any checked page (F-231 to F-236). The code keeps it because the effort page shows it as a top-level request parameter. The director decides whether to accept this.
- open: the hero lede quotes Anthropic's unqualified "fastest" (F-20). The speed footnote carries the standard-speed qualifier (F-37, C-4). The director decides whether the hero needs a marker.
- changed by D16: hero lede, capabilities and family titles, the code section and its intro, sr-code, code-sources and the footer sources. Streaming (source-17) and Get started (source-18) are added; Choosing a model is now source-19.
- open: kicker keys are not in the act II slot list. Since D16 the capabilities and family titles differ from their kickers. capabilities.intro is also not in the act II slot list. The director decides on both.
- changed beyond the findings: cap-2-default-note is replaced by cap-2-caption (same fact, act II wording, the Medium default scope kept). cap-0-chart-condition is removed because the caption repeats it. filename is removed (act II has no filename row, and the example no longer streams). The Streaming source is removed and "Choosing a model" is renumbered to source-17.
- changed beyond the findings: F-ids in captions are bracket tags, not printed text (act III C12). The card 1 narrow variant ends with a period. The family intro lower-cases "a" after its attribution lead-in.
- humanizer pass (D16 round, changed strings only): one edit, response-stream line 2 made active (passive voice). The lede quote and the code are not rewritten. The copy has no em or en dashes and no exclamation marks. "showcase" stays because it names the page type from the brief.
