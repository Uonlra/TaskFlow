# Accessibility Audit

## 2026-08-19: Task form dialog

Scope: the keyboard and focus behavior of the new-task dialog.

Verified with Testing Library:

- The dialog exposes `role="dialog"`, `aria-modal="true"`, and labelled heading/description.
- Opening the dialog moves focus to the task title field.
- Tab navigation is contained within the dialog and wraps from the last control to the first.
- Closing the dialog restores focus to the button that opened it.
- The dialog can be closed with Escape when it is not submitting.
- Background scrolling is locked while the dialog is open and restored after closing.

Status: passed for this scope.

Next scope: the destructive-action confirmation dialog, including semantic dialog markup, initial focus, focus restoration, Escape handling, and keyboard containment.

## 2026-08-19: Confirmation dialog

Initial verification found these issues:

- The confirmation surface was a `section` without dialog semantics.
- Opening it did not move focus away from the trigger.
- Tab could leave the modal surface.
- Escape and backdrop dismissal did not consistently restore focus.

Implemented and verified:

- Added `role="dialog"`, `aria-modal`, and labelled title/description.
- Focuses the cancel action on open to make the destructive action opt-in.
- Keeps Tab navigation inside the dialog.
- Restores focus to the trigger after Escape, cancel, successful confirmation, or backdrop dismissal.
- Announces submit failures with `role="alert"`.

Verification: 3 focused component tests passed and ESLint passed for the component and tests.

Next scope: keyboard and focus behavior of the task detail panel.

## 2026-08-19: Task detail panel

Scope: the non-modal task detail panel and its details/activity tabs.

Verified with Testing Library:

- The panel is exposed as a complementary region named `任务详情`.
- The tablist exposes a valid tab and tabpanel relationship through `aria-controls` and `aria-labelledby`.
- Only the active tab is in the normal Tab order; the inactive tab uses `tabindex="-1"`.
- Arrow keys switch between tabs and move focus to the newly active tab.
- Home and End move focus to the first and last tab respectively.
- Tab from the active tab proceeds into the active panel's first interactive control.
- Switching tabs updates `aria-selected` and renders the matching panel content.

Status: passed for this scope. No component change was required.

Next scope: the task list row selection and keyboard activation path that opens this panel.

## 2026-08-19: Task list to detail panel

Verified with Testing Library:

- Task rows are focusable and expose `role="row"`.
- Enter and Space activate a focused task row.
- Activating a row updates the workbench selection and the task detail panel content.
- The inline completion button stops propagation and does not also select the row.
- The selected row exposes `aria-selected="true"`; other rows expose `aria-selected="false"`.
- Focus remains on the activated row while the detail panel updates, so keyboard users retain their place in the list.

The initial verification found that selection was represented only by a CSS class. Added `aria-selected` to the task row.

Verification: 6 focused component tests passed, ESLint passed, and TypeScript typecheck passed.

## 2026-08-19: Global navigation and skip link

Initial verification found these issues:

- Dashboard pages had no keyboard path to skip repeated sidebar navigation.
- The desktop navigation landmark did not have a distinct accessible name.

Implemented and verified:

- Added a first-in-order `跳到主要内容` skip link targeting `#main-content`.
- Made the main landmark programmatically focusable with `tabindex="-1"`.
- Added a keyboard-only visible style for the skip link.
- Named the desktop navigation `主导航`; the mobile navigation remains named `移动导航`.
- Verified that desktop and mobile links identify the active route with `aria-current="page"`.

Verification: 2 focused component tests passed, ESLint passed, and TypeScript typecheck passed.

## 2026-08-19: Form errors and async status

Initial verification found these issues in the task form:

- Validation messages had no IDs, so invalid controls were not associated with their errors.
- Save failures were rendered as ordinary text and were not exposed as an alert.
- The custom select had no way to expose its invalid state and error description.

Implemented and verified:

- Added stable per-field error IDs and `aria-describedby` for title, description, status, priority, tags, and due date.
- Kept `aria-invalid` synchronized with validation state for native and custom controls.
- Added an error association for the priority button group and custom select.
- Added `role="alert"` to field errors and asynchronous save failures.

Verification: 13 task-form component tests passed, ESLint passed, and TypeScript typecheck passed.

Next scope: keyboard operation of the mobile task list and its quick filters.

## 2026-08-19: Mobile task list

Verified with Testing Library:

- The search control is exposed as a `searchbox` with the accessible name `搜索任务`.
- Search input can be reached and edited with the keyboard.
- Quick filters are native buttons, can be activated with Enter, and expose their state through `aria-pressed`.
- The active quick filter is reported correctly to assistive technology.
- The task status button is independently keyboard-operable and retains a separate task detail link.
- Natural Tab order moves from quick filters to task status action and then to the task detail link.

Implemented:

- Added `type="search"` to the mobile search input.
- Added visible focus styles for the search field, quick filters, status controls, and task links.

Verification: 6 focused component tests passed, ESLint passed, and TypeScript typecheck passed.
