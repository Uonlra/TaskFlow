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
