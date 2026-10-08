# Verification report: system-card

Archived by the director from the verifier agent's returned report (workflow wf_f2349192-4e4, label verify:system-card), because the agent returned it as its final message instead of writing this file. Content below is the agent's report, unedited.

Verification of research/notes-system-card.md is complete. Result: S-01 to S-03 VERIFIED, S-04 ADJUSTED, and no row FAILED. NOT FOUND item 1 is wrong as scoped: the card's summary table is on p.111 and is added as NEW-01 and NEW-02.

| id | verdict | corrected value (if ADJUSTED) | evidence | URL |
|---|---|---|---|---|
| S-01 | VERIFIED | n/a | p.1 cover, text layer: "System Card: Claude Haiku 5.5 October 7, 2026 anthropic.com" (date sits below the title, with no "publication" label). Same string on p.125 and p.127: "uses the updated cache-read price as of October 7, 2026". Launch post: `<time dateTime="2026-10-07">October 7, 2026</time>`. The label "publication date" is an inference that the launch-post date supports. | CDN |
| S-02 | VERIFIED | n/a | p.2, first paragraph under "Executive summary": "This system card describes Claude Haiku 5.5, the latest Haiku-class large language model from Anthropic. We present results from a wide variety of pre-deployment evaluations, which show Claude Haiku 5.5 significantly outperforming its predecessor, Claude Haiku 4.5, across many domains." One hit, verbatim. | CDN |
| S-03 | VERIFIED | n/a | p.8, "1 Introduction": "Claude Haiku 5.5 is a new large language model from Anthropic, released for general access." One hit, verbatim. | CDN |
| S-04 | ADJUSTED | "Standard is Anthropic's Responsible Scaling Policy (RSP). Haiku 5.5 is treated as meeting CB-1 and Autonomy-1, with RSP mitigations applied (quoted sentence). Haiku 5.5 does not cross CB-2 or Autonomy-2 (the preceding sentence, also p.11: "As such, we determine that Haiku 5.5 does not cross our CB-2 or Autonomy-2 RSP thresholds."). Cite both sentences. "No ASL named" stands (NF-2)." | Quoted sentence verbatim on p.11 under "2.1 Introduction" (TOC p.4 confirms "2 RSP evaluations 11 / 2.1 Introduction 11"). "Responsible Scaling Policy (RSP)" is named on p.11. The CB-2/Autonomy-2 clause is verbatim on p.11 but is not in the quoted sentence. | CDN |
| NEW-01 | NEW-VERIFIED | n/a | NF-1 found on p.111, section "8.1 Evaluation summary". Caption: "[Table 8.1.A] Capability evaluation summary. Unless otherwise noted, all Haiku 5.5 results use the following standard configuration: adaptive thinking at max effort, default sampling settings (temperature, top_p), averaged over five trials." Also: "The best score at max effort in each row is bolded." Column order Haiku 5.5 / Haiku 4.5 / Sonnet 5.5 / GPT-6 Luna, checked on the rendered page. | CDN |
| NEW-02 | NEW-VERIFIED | n/a | Haiku 5.5 column of Table 8.1.A, values as printed (the card prints no % signs): SWE-Bench Pro 64.8; SWE-bench Multilingual 83.7; SWE-bench Multimodal 30.7; FrontierCode 1.1 (Main) 46.4 (max) and 45.8 (xhigh); Humanity's Last Exam No tools 45.9, With tools 57.4; OSWorld 2.1 (offline subset) 72.4; HealthBench Professional (Length-adjusted) 64.8; GDPval-AA v2.1 1620; AA-Briefcase v1.1 1578. The launch Performance table gives the same values for GDPval-AA, AA-Briefcase, OSWorld (printed 72.4%) and HLE (45.9%, 57.4%). | CDN (p.111); LAUNCH |
| NF-1 | NOT FOUND on pp.1-20 (confirmed) | n/a | pp.1-20 have one table caption, [Table 2.2.1.A] on p.12 (CB evaluation portfolio, no scores). Figures on pp.13, 15, 16, 17, 18 and 20 each hold one raster image. Page 1's image is the logo. Numeric scan of pp.1-20 prose found no benchmark scores. Closest sentence, p.20: "On our most recent fit, Claude Haiku 5.5's AECI of 167.11 was much lower than Claude Opus 5.5's score of 174.56." The summary table is on p.111 (NEW-02). | CDN |
| NF-2 | NOT FOUND (confirmed) | n/a | All 144 pages, text layer: "ASL" appears only as ASLR (pp.24, 29); "safety level" has 0 hits; "AI safety" appears only on pp.59 and 63, as general prose. Launch post, MD-MODELS and MD-RES: 0 hits for ASL, "safety level", "AI Safety" and "abstract". Limit: text layer only. | CDN; LAUNCH; MD-MODELS; MD-RES |
| NF-3 | NOT FOUND (confirmed) | n/a | "abstract": 0 hits in raw and layout text, all 144 pages. Nearest sections: "Executive summary" (p.2) and "1 Introduction" (p.8). | CDN |
| C-1 | VERIFIED | n/a | p.9, "1.5 Safeguards": "For chemical and biological (CB) risks, we have deployed the same harmful CB misuse classifiers as for our deployments of Claude Opus 5 and Claude Sonnet 5, rather than the broader research biology classifiers used for Claude Opus 5.5." p.18, "2.2.4 Conclusions": "As such, we are releasing Haiku 5.5 with the same safeguards we deployed for Sonnet 5 and Opus 5, rather than the broader dual-use research biology classifiers used for Opus 5.5." Launch "Safety": "Haiku 5.5’s biology safeguards are the same as for Sonnet 5, Sonnet 5.5, and Opus 5." Neither card passage names Sonnet 5.5. | CDN; LAUNCH |
| NC-1 | VERIFIED | n/a | Card p.1 and launch post both show October 7, 2026 (see S-01). | CDN; LAUNCH |
| NC-2 | VERIFIED | n/a | p.2: "does not cross any new RSP thresholds". p.11: "we do treat Haiku 5.5 as meeting our CB-1 and Autonomy-1 thresholds". | CDN |
| M-1 | VERIFIED | n/a | Entry URL: HTTP 307, then 307, then 200 from the CDN. Entry and direct CDN downloads have the same SHA-256 (d5dbaab6...). 13,007,054 bytes, 144 pages. Printed page numbers equal PDF indexes on pp.2, 3, 8, 9, 11, 18, 111, 125 and 127. | CDN |

URL key:
- CDN = https://www-cdn.anthropic.com/e1080d6bf5ae2018ea3c2f414064be03232f5be5/Claude%20Haiku%205.5%20System%20Card.pdf (reached from https://www.anthropic.com/claude-haiku-5-5-system-card)
- LAUNCH = https://www.anthropic.com/claude-haiku-5-5
- MD-MODELS = https://platform.claude.com/docs/en/models/overview.md
- MD-RES = https://platform.claude.com/docs/en/resources/overview.md

Counts:
- Notes rows (S-01 to S-04): VERIFIED 3 (S-01, S-02, S-03), ADJUSTED 1 (S-04), FAILED 0.
- NOT FOUND items: NF-1 confirmed on pp.1-20 but found on p.111 (NEW-VERIFIED 2: NEW-01, NEW-02). NF-2 and NF-3 confirmed NOT FOUND.
- Extra checks: VERIFIED 4 (C-1, NC-1, NC-2, M-1).
- Failed ids: none.

Notes:
- research/verify-system-card.md was not written. The agent rules forbid report .md files, so this message is the deliverable.
- Downloads and extracted text are in /tmp/claude-0/-home-user-Claude-Code-Blud/0296b1a2-ba52-5009-bc6b-94d771daca14/scratchpad/verify-S/ (dl-entry, dl-cdn, dl-launch, dl-models-md, dl-resources-md, text/). I used the session scratchpad instead of /tmp/verify-S, per the environment's scratch-directory rule.
- Limits: figure images were not OCR'd, so plotted values and any text inside those images are unchecked. The "publication" label on S-01 is an inference.
