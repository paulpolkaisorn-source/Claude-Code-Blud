# Claude Haiku 5.5: source scout

Date: 2026-10-08. Owner: researcher (scout pass). This file records where information lives. It records no facts.

## Method

- Primary domains only: anthropic.com, claude.com, docs.claude.com, platform.claude.com, support.claude.com. One first-party page outside that list is flagged (code.claude.com).
- Each URL was fetched with `curl -sL` (redirects followed, proxy preconfigured). "grep" is the brief's pattern `grep -o -i 'haiku[ -]5[.-]5'` counted on the response body. Main pages were also checked in visible text (script and style removed), so a match inside a script payload alone does not count as a mention.
- The system card is a PDF: grep on the raw file, plus `pdftotext -layout` on a fresh download in its own directory.
- WebSearch was used for discovery only. Every URL it returned was fetched before it was listed. Search summaries were not used as sources.

## A. Mentions Haiku 5.5 (canonical URLs)

| URL | mentions Haiku 5.5? (yes/no) | what kind of info it seems to hold (one line) | how you checked |
|---|---|---|---|
| https://www.anthropic.com/claude-haiku-5-5 | yes | Launch announcement, titled "Introducing Claude Haiku 5.5": pricing, performance, safety and availability sections, model ID block, links to system card, migration guide and partner pages | curl 200; grep 122; visible text confirmed; title read |
| https://www.anthropic.com/claude/haiku | yes | Haiku product page with an "Announcements" block that lists the Haiku 5.5 post; links to pricing, docs and system card | curl 200; grep 72; visible text confirmed |
| https://www.anthropic.com/news | yes | Newsroom index; one entry for the Haiku 5.5 announcement, linking to /claude-haiku-5-5 | curl 200; grep 8; visible text confirmed |
| https://www.anthropic.com/claude-haiku-5-5-system-card | yes | System card, PDF titled "Claude Haiku 5.5 System Card" (144 pages), served from https://www-cdn.anthropic.com/e1080d6bf5ae2018ea3c2f414064be03232f5be5/Claude%20Haiku%205.5%20System%20Card.pdf | curl 200 to CDN PDF; raw grep 4; pdftotext on fresh download grep 296 |
| https://claude.com/pricing | yes | "Plans & pricing" page; Haiku 5.5 row in the API pricing section, including prompt caching | curl 200; grep 1; visible text confirmed |
| https://claude.com/platform/api | yes | API product page; Haiku 5.5 model card with positioning text | curl 200; grep 2; visible text confirmed |
| https://claude.com/resources/articles | yes | Articles listing (claude.com/blog redirects here); Haiku 5.5 card linking to the anthropic.com launch post | curl 200; grep 13; visible text confirmed |
| https://www.anthropic.com/claude-sonnet-5-5 | yes (pre-launch wording only) | Sonnet 5.5 launch post; one sentence says Haiku 5.5 "will join the Claude 5.5 family in the coming weeks" | curl 200; grep 2; visible text confirmed |
| https://www.anthropic.com/claude-opus-5-5 | yes (pre-launch wording only) | Opus 5.5 launch post; one sentence says Sonnet 5.5 and Haiku 5.5 "will follow in the coming weeks" | curl 200; grep 2; visible text confirmed |
| https://platform.claude.com/docs/en/models/haiku-5-5/overview | yes | Haiku 5.5 model page: overview, model ID, links to what's new, migration, prompting and system prompts | curl 200; grep 167; visible text confirmed |
| https://platform.claude.com/docs/en/models/haiku-5-5/whats-new-haiku-5-5 | yes | "What's new in Claude Haiku 5.5": API changes for this model | curl 200; grep 166; visible text confirmed |
| https://platform.claude.com/docs/en/models/haiku-5-5/migration-guide | yes | Migration guide to Haiku 5.5: what changes when moving from Haiku 4.5 | curl 200; grep 190; visible text confirmed |
| https://platform.claude.com/docs/en/models/overview | yes | Models overview: comparison table with a Haiku 5.5 column, and a model ID table by platform (API, Bedrock, Google Cloud, Foundry, Claude Platform on AWS) | curl 200; grep 51; visible text confirmed |
| https://platform.claude.com/docs/en/models/overview.md | yes | Markdown copy of the models overview, with the Haiku 5.5 column | curl 200; grep 10; table text confirmed |
| https://platform.claude.com/docs/en/models/sonnet-5-5/overview | yes | Sonnet 5.5 model page; comparison table row for Haiku 5.5 | curl 200; grep 39; visible text confirmed |
| https://platform.claude.com/docs/en/models/opus-5-5/overview | yes | Opus 5.5 model page; comparison table row for Haiku 5.5 | curl 200; grep 39; visible text confirmed |
| https://platform.claude.com/docs/en/models/haiku-4-5/overview | yes | Legacy Haiku 4.5 page; points readers to Haiku 5.5 with a migration link | curl 200; grep 67; visible text confirmed |
| https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-haiku-5-5 | yes | Prompting guide specific to Haiku 5.5 | curl 200; grep 113; visible text confirmed |
| https://platform.claude.com/docs/en/resources/overview | yes | "Model cards" index with a "Claude Haiku 5.5 System Card" entry | curl 200; grep 24; visible text confirmed |
| https://platform.claude.com/docs/en/about-claude/pricing | yes | API pricing doc: Haiku 5.5 rows in the price tables and a note on long prompts | curl 200; grep 40; visible text confirmed |
| https://platform.claude.com/docs/en/build-with-claude/prompt-caching | yes | Prompt caching doc: Haiku 5.5 row in the pricing table | curl 200; grep 34; visible text confirmed |
| https://platform.claude.com/docs/en/build-with-claude/batch-processing | yes | Batch processing doc: Haiku 5.5 row in the pricing table | curl 200; grep 24; visible text confirmed |
| https://platform.claude.com/docs/en/build-with-claude/context-windows | yes | Context windows doc: Haiku 5.5 in the 1M-context list, with max output and long-prompt billing notes | curl 200; grep 24; visible text confirmed |
| https://platform.claude.com/docs/en/about-claude/model-deprecations | yes | Deprecations table with a claude-haiku-5-5 row | curl 200; grep 22; visible text confirmed |
| https://platform.claude.com/docs/en/release-notes/overview | yes | API release notes: entry for the Haiku 5.5 launch (claude-haiku-5-5) | curl 200; grep 34; visible text confirmed |
| https://platform.claude.com/docs/en/release-notes/system-prompts/claude-haiku-5-5 | yes | Haiku 5.5 system prompt release notes (core system prompt for claude.ai, iOS and Android) | curl 200; grep 89; visible text confirmed |
| https://platform.claude.com/docs/en/release-notes/system-prompts/overview | yes | System prompts index with a Haiku 5.5 entry | curl 200; grep 26; visible text confirmed |
| https://support.claude.com/en/articles/12138966-release-notes | yes | Help Center release notes: dated "Claude Haiku 5.5 launch" entry linking the launch post | curl 200; grep 8; visible text confirmed |
| https://platform.claude.com/docs/en/build-with-claude/claude-in-amazon-bedrock | yes | Amazon Bedrock page (titled for Opus 4.7 and later): Haiku 5.5 row with its Bedrock model ID | curl 200; grep 24; visible text confirmed |
| https://platform.claude.com/docs/en/build-with-claude/claude-on-amazon-bedrock-legacy | yes | Legacy Bedrock page (titled for Opus 4.6 and earlier): Haiku 5.5 named in availability and context text | curl 200; grep 22; visible text confirmed |
| https://platform.claude.com/docs/en/build-with-claude/claude-platform-on-aws | yes | "Claude Platform on AWS" page: model ID table with a Haiku 5.5 row | curl 200; grep 22; visible text confirmed |
| https://platform.claude.com/docs/en/build-with-claude/claude-on-vertex-ai | yes | Google Cloud page (titled "Claude on Google Cloud" under a vertex-ai URL): model ID table row and a 1M-context sentence | curl 200; grep 24; visible text confirmed |
| https://platform.claude.com/docs/en/build-with-claude/claude-in-microsoft-foundry | yes | "Claude in Microsoft Foundry" page: model ID table row and a 1M-context sentence | curl 200; grep 26; visible text confirmed |
| https://platform.claude.com/docs/en/build-with-claude/effort | yes | Effort parameter doc: Haiku 5.5 named in default-effort and supported-model text | curl 200; grep 53; visible text confirmed |
| https://platform.claude.com/docs/en/build-with-claude/thinking-steering-and-cost | yes | "Steering thinking" doc (target of the /adaptive-thinking redirect): Haiku 5.5 default-effort line | curl 200 via redirect; grep 18; visible text confirmed |
| https://platform.claude.com/docs/en/claude_api_primer | yes | API usage primer: Haiku 5.5 with its model ID in the model list | curl 200; grep 24; visible text confirmed |
| https://support.claude.com/en/articles/11940350-claude-code-model-configuration | yes | Help Center: Claude Code model configuration; Haiku 5.5 in the supported models list | curl 200; grep 26; visible text confirmed |
| https://code.claude.com/docs/en/model-config | yes | Claude Code model configuration doc (Anthropic first-party, outside the brief's domain list): provider table and a Haiku 5.5 context and pricing section | reached via docs.claude.com redirect; curl 200; grep 55; visible text confirmed |
| https://support.claude.com/en/articles/8606394-how-large-is-the-context-window-on-paid-claude-plans | yes | Help Center: context window by model on paid plans; Haiku 5.5 row | curl 200; grep 6; visible text confirmed |
| https://support.claude.com/en/articles/8114494-how-up-to-date-is-claude-s-training-data | yes | Help Center: knowledge cutoff per model; Haiku 5.5 line | curl 200; grep 3; visible text confirmed |
| https://support.claude.com/en/articles/10684626-enable-and-use-web-search | yes | Help Center: web search; Haiku 5.5 in the supported models list | curl 200; grep 3; visible text confirmed |

## B. Redirect aliases (same page as a row in A; grep counts from the same run)

| URL | mentions Haiku 5.5? (yes/no) | what kind of info it seems to hold (one line) | how you checked |
|---|---|---|---|
| https://www.anthropic.com/pricing | yes | Redirects to the claude.com pricing page (section A) | curl 200 to https://claude.com/pricing; grep 1 |
| https://www.anthropic.com/news/claude-opus-5-5 | yes (pre-launch wording only) | Redirects to the Opus 5.5 launch post (section A) | curl 200 to https://www.anthropic.com/claude-opus-5-5; grep 2 |
| https://www.anthropic.com/document/claude-haiku-5-5-system-card | yes | Redirects to the same system card PDF (section A) | curl 200 to CDN PDF; raw grep 4; pdftotext grep 296 |
| https://claude.com/blog | yes | Redirects to the Articles listing (section A) | curl 200 to https://claude.com/resources/articles; grep 13 |
| https://docs.claude.com/en/docs/about-claude/pricing | yes | Redirects to the platform pricing doc (section A) | curl 200 to /docs/en/about-claude/pricing; grep 40 |
| https://platform.claude.com/docs/en/about-claude/models/overview | yes | Redirects to the models overview (section A) | curl 200 to /docs/en/models/overview; grep 51 |
| https://platform.claude.com/docs/en/about-claude/models/all-models | yes | Redirects to the models overview (section A) | curl 200 to /docs/en/models/overview; grep 51 |
| https://docs.claude.com/en/docs/about-claude/models/overview | yes | Redirects to the models overview (section A) | curl 200 to /docs/en/models/overview; grep 51 |
| https://docs.claude.com/en/docs/about-claude/models/all-models | yes | Redirects to the models overview (section A) | curl 200 to /docs/en/models/overview; grep 51 |
| https://platform.claude.com/docs/en/models/haiku-4-5/migration-guide | yes | Redirects to the Haiku 5.5 migration guide (section A) | curl 200 to /docs/en/models/haiku-5-5/migration-guide; grep 190 |
| https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking | yes | Redirects to "Steering thinking" (section A) | curl 200 to /docs/en/build-with-claude/thinking-steering-and-cost; grep 18 |
| https://platform.claude.com/docs/en/release-notes/api | yes | Redirects to the API release notes (section A) | curl 200 to /docs/en/release-notes/overview; grep 34 |
| https://docs.claude.com/en/release-notes/overview | yes | Redirects to the API release notes (section A) | curl 200 to /docs/en/release-notes/overview; grep 34 |
| https://docs.claude.com/en/release-notes/api | yes | Redirects to the API release notes (section A) | curl 200 to /docs/en/release-notes/overview; grep 34 |
| https://docs.claude.com/en/docs/build-with-claude/context-windows | yes | Redirects to the context windows doc (section A) | curl 200 to /docs/en/build-with-claude/context-windows; grep 24 |
| https://docs.claude.com/en/docs/about-claude/model-deprecations | yes | Redirects to the deprecations doc (section A) | curl 200 to /docs/en/about-claude/model-deprecations; grep 22 |
| https://platform.claude.com/docs/en/build-with-claude/claude-on-amazon-bedrock | yes | Redirects to the legacy Bedrock page (section A) | curl 200 to /docs/en/build-with-claude/claude-on-amazon-bedrock-legacy; grep 22 |
| https://docs.claude.com/en/docs/build-with-claude/claude-on-amazon-bedrock | yes | Redirects to the legacy Bedrock page (section A) | curl 200 to /docs/en/build-with-claude/claude-on-amazon-bedrock-legacy; grep 22 |
| https://docs.claude.com/en/docs/build-with-claude/claude-on-vertex-ai | yes | Redirects to the Google Cloud page (section A) | curl 200 to /docs/en/build-with-claude/claude-on-vertex-ai; grep 24 |
| https://docs.claude.com/en/docs/build-with-claude/claude-in-microsoft-foundry | yes | Redirects to the Microsoft Foundry page (section A) | curl 200 to /docs/en/build-with-claude/claude-in-microsoft-foundry; grep 26 |
| https://docs.claude.com/en/docs/claude-code/model-config | yes | Redirects to the Claude Code model configuration doc on code.claude.com (section A) | curl 200 to https://code.claude.com/docs/en/model-config; grep 55 |

## C. Checked, no mention or not confirmed

| URL | mentions Haiku 5.5? (yes/no) | what kind of info it seems to hold (one line) | how you checked |
|---|---|---|---|
| https://www.anthropic.com/news/claude-haiku-5-5 | no (404) | Not Found page; the 2 raw matches are the requested slug echoed inside the page payload | curl 404; visible text 22 characters; grep 2 (slug echo only) |
| https://www.anthropic.com/news/introducing-claude-haiku-5-5 | no (404) | Not Found page; same slug echo | curl 404; grep 2 (slug echo only) |
| https://www.anthropic.com/models | no (404) | Not Found | curl 404; grep 0 |
| https://www.anthropic.com/claude/sonnet | no | Sonnet product page; no Haiku 5.5 string | curl 200; grep 0 |
| https://www.anthropic.com/claude/opus | no | Opus product page; no Haiku 5.5 string | curl 200; grep 0 |
| https://support.claude.com/en/ | no | Help Center home page | curl 200; grep 0 |
| https://platform.claude.com/docs/en/models/choosing-a-model | not confirmed (JS-only) | "Choosing a model" guide; body is rendered client-side (32 visible characters); the 16 matches are sidebar route data only | curl 200; grep 16 (navigation data only); visible text 32 characters |
| https://claude.com/partners/claude-on-aws | no | AWS partner page (also served at /partners/amazon-bedrock) | curl 200; grep 0 |
| https://claude.com/partners/google-cloud-vertex-ai | no | Google Cloud partner page (redirects to /partners/google-cloud) | curl 200; grep 0 |
| https://claude.com/partners/microsoft-foundry | no | Microsoft Foundry partner page | curl 200; grep 0 |
| https://claude.com/product/claude-code | no | Claude Code product page | curl 200; grep 0 |
| https://support.claude.com/en/articles/13930452-manage-custom-roles-on-enterprise-plans | no | Enterprise custom roles article | curl 200; grep 0 |
| https://support.claude.com/en/articles/14503794-model-availability-in-claude-for-government | no | Redirects to the Claude for Government admin guide (claude.com/docs/government/overview) | curl 200 after redirect; grep 0 |
| https://support.claude.com/en/articles/11049741-what-is-the-max-plan | no | Max plan article | curl 200; grep 0 |
| https://support.claude.com/en/articles/11869629-use-claude-with-android-apps | no | Android app article | curl 200; grep 0 |
| https://support.claude.com/en/articles/14604842-cyber-verification-program | no | Cyber Verification Program article | curl 200; grep 0 |

## Notes for the director

- Claude apps, plan by plan: not stated on the launch post. Its text contains no "claude.ai", "plan", "Free", "mobile", "iOS" or "Android". Partial evidence only: the help articles (`8606394`, `10684626`) and the system prompt release notes for claude.ai, iOS and Android (`release-notes/system-prompts/claude-haiku-5-5`). No primary page found that lists access by plan. Status: NOT FOUND.
- Labels differ across primary pages. The launch post's availability text says "Microsoft Azure", while the Foundry page is titled "Claude in Microsoft Foundry". The Google Cloud page is titled "Claude on Google Cloud" under a vertex-ai URL, and one sentence there says "Agent Platform". AWS has three pages: claude-in-amazon-bedrock (Opus 4.7 and later), claude-on-amazon-bedrock-legacy (Opus 4.6 and earlier) and claude-platform-on-aws.
- Pre-launch wording: the Sonnet 5.5 and Opus 5.5 launch posts say Haiku 5.5 is coming "in the coming weeks". Do not cite them for Haiku facts.
- Citations: use the platform.claude.com URLs. All docs.claude.com URLs in this list redirect to platform.claude.com, except the Claude Code one, which goes to code.claude.com.
- Conflicts: a WebSearch summary said the models overview and the API usage primer leave out Haiku 5.5. Both fetched pages include it (sections A). An unfiltered search also returned third-party pages (gradually.ai, datalearner.com, pasqualepillitteri.it), and its summary said Haiku 5.5 had not shipped. Those pages were not fetched or used, and the claim conflicts with the primary pages.
- Outside the brief's list, not checked: Amazon Bedrock, Google Cloud and Microsoft provider documentation.

## Blocked or weak

No 403, 405, 407 or TLS errors. 404 on guessed slugs: https://www.anthropic.com/news/claude-haiku-5-5, https://www.anthropic.com/news/introducing-claude-haiku-5-5 and https://www.anthropic.com/models. https://platform.claude.com/docs/en/models/choosing-a-model is JS-only (32 visible characters).
