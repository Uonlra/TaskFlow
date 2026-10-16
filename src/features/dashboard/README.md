# Dashboard data flow

- `components/dashboard-client.tsx` owns URL navigation, priority filter controls, preview dialogs, and task actions.
- `hooks/use-dashboard-summary.ts` owns guest summary calculation and account summary loading/refresh.
- `types/dashboard-query.ts` defines query/result types and parameter serialization independently of UI components.
- `repositories/dashboard-repository.ts` implements the summary API using the shared JSON client.

Account summaries are keyed by account, range, and priority filters. Switching that scope hides the previous result and cancels its request. A delayed action cannot refresh a scope the user has left. Refresh failures retain data for the same scope and expose an error for retry.

Guest summaries derive from the task Store. Priority filters affect the focus list only, matching the account API; summary metrics continue to describe the selected range. Account orbit tasks are used only after the Store has loaded the current account, and preview dialogs are scoped to their opening account.
