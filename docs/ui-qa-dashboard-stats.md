# Dashboard / Stats Visual QA Baseline

This document defines the visual QA baseline for Taskflow Dashboard V2 and Stats. It should be used before continuing into Calendar UI work, so future screens keep the same density, chart language, empty states, and responsive behavior.

## Visual Direction

Dashboard and Stats should feel like a real productivity SaaS product, not a landing page or poster.

- Use a Tesla-like minimal white product UI: restrained surfaces, clear hierarchy, quiet borders, and compact controls.
- Allow Dashboard data areas to carry a light Vercel-like technical product feeling: precise charts, airy but useful spacing, and subtle data-network atmosphere.
- Keep the interface clean, restrained, and business-oriented.
- Avoid marketing composition, poster-like hero sections, dark sci-fi styling, complex illustration, heavy decorative gradients, and one-off visual effects.
- Keep visible copy short and product-native: titles, numbers, short labels, sync state, and concise empty states.

## Page Scope

Validate these URLs as the primary QA surface:

- `/dashboard`
- `/dashboard?range=today`
- `/dashboard?range=week`
- `/dashboard?range=all`
- `/stats`
- `/stats?range=today`
- `/stats?range=week`
- `/stats?range=all`

Related routes to smoke check after visual QA:

- `/tasks`
- `/calendar`
- `/settings`

## Viewports

Use these viewport sizes as the baseline screenshot set:

| Name | Size | Primary Purpose |
| --- | --- | --- |
| Desktop wide | `1440 x 900` | Full Dashboard V2 hero, metrics, charts, and right rail |
| Desktop standard | `1280 x 860` | Card spacing, floating hero cards, chart density |
| Tablet | `768 x 900` | Wrapping, stacked panels, no horizontal overflow |
| Phone | `390 x 844` | Existing mobile Dashboard / Tasks / Settings remain intact |

Notes:

- Dashboard V2 desktop QA focuses on `1440` and `1280`.
- Under `960px`, Dashboard may switch to the mobile Dashboard UI. The expectation is not feature parity with desktop V2; the expectation is no breakage, no unexpected horizontal scrolling, and touch-friendly readable content.
- Stats should be verified at desktop and tablet sizes because it remains a data-heavy detail page.

## Dashboard V2 Acceptance Criteria

### Hero

- Left-side date, sync state, title, short description, and chips are readable at `1440` and `1280`.
- The right-side data-network atmosphere is distributed across the hero and does not compete with the title.
- Floating metric cards do not overlap each other or leave the hero bounds.
- Floating cards use restrained size, shadow, opacity, and blur. They should feel like useful product metrics, not decorative stickers.
- The hero works for all data states: empty account, sparse data, and normal data.
- The hero does not become a marketing banner. It remains a task overview surface.

### Range Switch

- `今天 / 本周 / 全部` active state is clear.
- Clicking a range updates the URL to the matching `range` value.
- Range changes update the hero, metric cards, charts, focus rail, deadline rail, and risk summary.
- Range switching should not cause visible layout jumps beyond normal data changes.
- The range control remains readable and clickable at tablet width.

### Metric Cards

- The five metric cards have stable heights and aligned content.
- Icon, title, number, and helper text do not collide or overflow.
- At `1280`, the metric row must not create horizontal scrolling.
- At tablet width, metric cards may wrap, but spacing should remain deliberate.
- Empty and syncing states should not look like broken zero-filled cards.

### Charts

- ECharts containers render non-empty canvas content whenever data exists.
- Empty states do not render meaningless empty axes or empty rings.
- Trend charts with sparse data do not draw exaggerated smooth curves.
- Status distribution includes a short legend and counts.
- Priority distribution keeps high / medium / low visible; zero-value dimensions may be muted, not removed.
- Tag Top 5 bars should not stretch into a full-width fake-looking bar when there is only one tag.
- Chart colors remain consistent:
  - Blue: primary task / created / low-risk support dimension
  - Green: complete / success
  - Orange: in progress / medium risk
  - Red: overdue / high risk
  - Purple: secondary dimension
- Tooltips should be available, readable, and visually consistent.

### Right Rail

- Focus titles follow the current range:
  - Today: `今日重点`
  - Week: `本周重点`
  - All: `重点任务`
- Deadline titles follow the current range:
  - Today: `今日截止`
  - Week: `本周截止`
  - All: `近期截止`
- Deadline items should not duplicate focus items in the same rail.
- Risk summary is readable and compact.
- Empty states are short and calm, for example `暂无重点任务`, `暂无近期截止`, or `暂无风险`.

## Stats Acceptance Criteria

- `range=today`, `range=week`, and `range=all` are consumed by the page.
- Invalid or missing range falls back to the intended default without throwing.
- Range tab changes update the URL.
- Overview metrics, trend chart, status distribution, priority distribution, tag Top N, and risk section update with range.
- Stats uses the same analytics and chart option language as Dashboard.
- Stats has higher information density than Dashboard, but still uses restrained spacing and short copy.
- Empty states are stable, light, and short. They should not expose empty ECharts axes.
- Chart click-through works:
  - Status chart -> `/tasks?status=...`
  - Priority chart -> `/tasks?priority=...`
  - Tag chart -> `/tasks?tag=...`
  - Risk row -> `/tasks?risk=...`
- The page should not introduce a separate visual system from Dashboard.

## Responsive Acceptance Criteria

### `1440 x 900`

- Dashboard layout is complete: hero, range switch, metric grid, chart grid, and right rail are visible and balanced.
- The hero data-network atmosphere reads as one horizontal scene.
- Floating cards sit within the middle-right hero area and do not cover primary copy.
- Stats shows a complete overview and chart layout with comfortable density.

### `1280 x 860`

- Floating hero cards do not collide or clip.
- Metric cards remain readable.
- Chart panels keep stable heights.
- Right rail remains useful and does not feel like leftover empty space.

### `768 x 900`

- Cards wrap or stack intentionally.
- Dashboard V2 or mobile Dashboard selection follows the app's existing breakpoint behavior.
- Stats panels stack without horizontal overflow.
- Range controls remain readable and touch-friendly.

### `390 x 844`

- Existing mobile Dashboard / Tasks / Settings UI is not broken.
- The page does not show unexpected horizontal scrolling.
- Text is readable, not overlapping, and primary actions remain tappable.

### Global Overflow Rule

For every target viewport:

- `document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1`
- No important text is clipped unless it is intentionally ellipsized inside a compact list item.
- No floating card, chart, or right-rail section visually overlaps unrelated content.

## Data State Matrix

Use these states when collecting screenshots or doing manual QA.

| State | Task Count | Dashboard Expected Behavior | Stats Expected Behavior |
| --- | ---: | --- | --- |
| Empty account | `0` | Calm empty state, short CTA where appropriate, no wall of stable zeros | `暂无统计` / short empty panels, no empty ECharts axes |
| Sparse data | `1-3` | Stable hero and metrics; trend does not over-curve; distribution cards still look complete | Charts remain readable; sparse bars/points do not look like loading failures |
| Normal data | `10-20` | Dashboard has enough density across hero, metrics, charts, focus, deadlines, and risk | Stats shows full chart detail and meaningful click-through targets |

Also verify a range-empty case:

- Account has tasks, but current range has none.
- UI should communicate current range is empty without implying the account has no tasks.

## Screenshot Directory And Naming

Recommended screenshot directory:

```text
docs/ui-snapshots/dashboard-stats/
```

Recommended names:

```text
dashboard-1440-today.png
dashboard-1440-week.png
dashboard-1280-all.png
dashboard-768-week.png
dashboard-390-mobile.png
stats-1440-week.png
stats-768-all.png
```

When capturing additional data states, append the state:

```text
dashboard-1440-week-empty.png
dashboard-1440-week-sparse.png
dashboard-1440-week-normal.png
stats-1440-all-normal.png
```

## Manual Screenshot Checklist

For each screenshot, record:

- Page URL.
- Viewport size.
- Data state: empty account, sparse data, normal data, or range-empty.
- Whether the account is using real data or preview data.
- Whether there is horizontal scrolling.
- Whether the Dashboard hero is readable and balanced.
- Whether floating cards are inside the hero and not overlapping.
- Whether range tabs are clear and selected correctly.
- Whether charts render when data exists.
- Whether empty states are shown instead of empty charts when data is missing.
- Whether text is short, product-native, and not explanatory prose.
- Whether any element overlaps, clips, or feels misaligned.
- Whether the screen still matches the Tesla-minimal / light SaaS direction.

Suggested manual note format:

```text
File:
URL:
Viewport:
Data state:
Result: Pass / Needs polish / Fail
Issues:
```

## Browser Automation Notes

The current development environment may not reliably run Playwright screenshots because browser or Next child processes can be blocked by local permissions. Manual screenshots are acceptable for this phase.

Future automation can add:

- Playwright screenshot baselines for Dashboard and Stats.
- Fixed viewport checks for `1440`, `1280`, `768`, and `390`.
- Canvas non-empty pixel checks for ECharts.
- `scrollWidth / clientWidth` checks for horizontal overflow.
- Bounding-box checks for hero floating-card overlap.
- Route checks for range URLs and chart click-through hrefs.

Do not add automation dependencies until the team is ready to maintain screenshot baselines.

## Exit Criteria Before Calendar UI

Before implementing the Calendar real UI, confirm:

- Dashboard V2 passes desktop hero, range, metrics, charts, right rail, and empty-state checks.
- Stats passes range, chart, empty-state, and click-through checks.
- Mobile Dashboard / Tasks / Settings remain unaffected.
- The accepted screenshots are saved using the naming convention above.
- Any known visual debt is written down before Calendar inherits the shared product language.
