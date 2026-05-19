Markdown Mirrors — kontent4u conventions

Purpose:
Provide clean Markdown snapshots of the site so AI systems can read the app without scripts, backgrounds, or UI chrome.

Where to store mirrors:
- Put mirrors under `public/markdown-mirrors/`.
- Since this app is a single-page app, useful mirrors are typically page-state mirrors rather than route mirrors.

Suggested file layout:
- `public/markdown-mirrors/index.md` — public landing/login shell
- `public/markdown-mirrors/trend-scraper.md` — Trend Scraper tab mirror
- `public/markdown-mirrors/the-arena.md` — The Arena tab mirror
- `public/markdown-mirrors/transcript.md` — Transcript tab mirror

Required frontmatter:
---
title: "Trend Scraper"
url: "https://kontent4u.vercel.app/"
lastmod: "2026-05-19"
type: "app-state"
state: "trend-scraper"
---

Mirror format:
# Trend Scraper

Short explanation of what the tab does.

## What it does
- One bullet per visible capability

## Input / output
- What users provide
- What the app returns

## Notes
- Mention any limitations or public-safety guardrails

Cleaning rules:
- Remove scripts, buttons that do not add meaning, and decorative backgrounds.
- Keep visible headings, labels, and short descriptions.
- Strip emails, tokens, transcripts tied to a user, and any session-specific data.
- Prefer stable wording that describes the product, not live runtime state.

Updating:
- Refresh `lastmod` when the page copy changes.
- Keep mirrors concise and easy for an LLM to scan.

Last updated: 2026-05-19
