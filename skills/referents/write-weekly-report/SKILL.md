---
name: write-weekly-report
description: Use this skill when the user asks to write, draft, summarize, polish, or format a weekly report / 周报 / weekly status update, especially from rough notes, task lists, standup updates, chat logs, or project summaries.
---

# Write Weekly Report

Use this skill to turn rough status inputs into a concise weekly report for a manager, team, or stakeholder update.

## When to use

- The user asks for a weekly report, 周报, weekly status update, progress summary, or team update.
- The user provides bullets, tickets, meeting notes, commits, or chat messages and wants them cleaned up into a report.
- The user wants the report adapted for a manager, team, or stakeholder audience.

## Quick defaults

- Match the language of the user's request. If the input is mixed, prefer the language the user asked in.
- Use a concise, professional, factual tone.
- Default structure:
  - This week's completed work
  - Work in progress
  - Risks or blockers
  - Next week's plan
- Default length: 4 to 8 bullets total unless the user asks for more detail.

## Workflow

1. Infer the reporting period, audience, and language from the request or source material. Ask at most one clarifying question only if a wrong assumption would materially change the output.
2. Extract concrete outcomes, milestones, metrics, blockers, and next steps from the source material.
3. Group items by status when the input is short. Group by workstream first when the input spans multiple projects or teams.
4. Rewrite notes into parallel, action-oriented bullets. Prefer results over activity logs.
5. Keep facts intact. Do not invent numbers, deadlines, or impact. If a useful detail is missing, omit it or mark it as an assumption.
6. Include blockers or risks only when they are real. Do not add empty "None" sections unless the user asks for them.

## Writing rules

- Lead with outcomes: "Completed X", "Shipped Y", "Resolved Z".
- Compress low-signal task logs into a single higher-level bullet.
- Preserve metrics, owners, dates, and dependencies when provided.
- For manager or stakeholder audiences, emphasize progress, impact, and risk.
- For peer or team audiences, keep enough implementation detail to be useful.
- If the user asks for a very short update, collapse to three sections: Completed, In Progress, Next.
- If the source is messy, normalize tense and terminology instead of echoing raw phrasing.

## Templates

For common Chinese and English formats, see [references/report-formats.md](references/report-formats.md).

## What not to do

- Do not ask the user to rewrite their notes.
- Do not inflate tiny tasks into oversized claims.
- Do not include confidential details in a broader stakeholder update unless the user explicitly asks.
- Do not turn the report into a diary or meeting transcript.
