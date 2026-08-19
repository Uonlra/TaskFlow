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
