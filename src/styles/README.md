# Stylesheet ownership

- `base.css`: tokens, reset, shared form controls, and page toolbar (including its breakpoints).
- `responsive.css`: responsive primitives shared across pages.
- `dashboard-shell.css`: sidebar, content shell, mobile navigation, and shell breakpoints.
- `auth.css`: login/register layout, form, preview, entry animation, themes, and breakpoints.
- `dashboard-overview.css`: desktop dashboard layout, workspace, charts, and toolbar.
- `dashboard-mobile.css`: mobile dashboard and its theme states.
- `dashboard-empty.css`: dashboard orbit scene and motion states.
- `task-components.css`: shared task actions, badges, dialogs, and date composer, including mobile dialog rules.
- `tasks.css`: task workbench, detail panel, loading states, and mobile task list.
- `calendar.css`, `stats.css`, `settings.css`: page-specific styles and breakpoints. The settings mobile view remains in `responsive-settings.css`.

Import `task-components.css` before the relevant page stylesheet when a page uses task dialogs or controls. Dashboard and calendar must not import `tasks.css` for shared components.

CSS order is intentional. Keep breakpoint and theme overrides in their owning stylesheet and preserve their order when combining rules. Global styles can remain loaded after client navigation; check direct loads and navigation when changing imports, including a production build.

Keep dynamic status, priority, metric, and orbit-position selectors even when a literal class-name search has no match. Reduced-motion and focus-visible rules are part of the component behavior.
