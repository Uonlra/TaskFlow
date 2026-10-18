# Task data flow

- `components/task-list-client.tsx` owns navigation, immediate filter input, action feedback, and responsive views.
- `hooks/use-task-page.ts` selects guest or account data, reuses matching SSR data, and exposes page loading, errors, and refresh.
- `utils/task-list-query.ts` owns filter parsing, request parameters, and guest filtering/pagination.
- `repositories/task-repository.ts` defines persistence operations; `remote-task-repository.ts` implements the web API.
- `store/task-store.ts` owns task mutations and the guest task collection. Account list pages come from the paginated API, not the Store's full collection.

The shared `useKeyedQuery` keeps one result keyed by account and request parameters. Superseded requests are aborted and late results ignored. SSR data seeds the Hook once; later props cannot overwrite a refreshed result. Guest pages derive directly from Store data.

After a mutation, refresh the current page. A refresh resolves to `false` on failure or when its original query is no longer active; a failed mutation still throws. This lets the UI report a saved operation separately from a query failure and offer a retry without repeating the save.

Display the response's page number: deleting the last item on a page can cause pagination to clamp to the previous page. Both desktop and mobile pagination use the same navigation handler.

## Task transfer

`utils/task-transfer.ts` defines the portable JSON format for both guest and account exports. The importer also accepts the earlier `source: "U's Task"` backup shape and validates its task fields before creating anything. Imports append tasks sequentially. If a later save fails, the list refreshes once and reports how many tasks were saved, which item failed, and that retrying the whole file would duplicate completed items.
