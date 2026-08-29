# Appwrite Task Indexes

The calendar range endpoint sends Appwrite `queries[]` directly to the Tasks table. Create these indexes in the Appwrite TablesDB console or deployment configuration before enabling the range endpoint in production.

| Index key                   | Type     | Attributes    | Order | Used by                                    |
| --------------------------- | -------- | ------------- | ----- | ------------------------------------------ |
| `task_due_date_key`         | Key      | `dueDate`     | ASC   | Calendar ranges, ordering, and risk counts |
| `task_status_key`           | Key      | `status`      | ASC   | Task filters and calendar risk counts      |
| `task_priority_key`         | Key      | `priority`    | ASC   | Task list priority filters                 |
| `task_created_at_key`       | Key      | `$createdAt`  | DESC  | Task list created-time sorting             |
| `task_updated_at_key`       | Key      | `$updatedAt`  | DESC  | Task list updated-time sorting             |
| `task_title_fulltext`       | Fulltext | `title`       | -     | Task search                                |
| `task_description_fulltext` | Fulltext | `description` | -     | Task search                                |
| `task_search_fulltext`      | Fulltext | `searchText`  | -     | Unified task and tag search                |

The range query uses Appwrite query objects for `isNotNull`, `greaterThanEqual`, `lessThan`, `orderAsc`, and `limit`. The date values are stored as UTC midnight DateTime values, so the index must be created on the DateTime column rather than on a derived string field.

Appwrite does not allow a Fulltext index on the `tags` array attribute. The application now mirrors searchable tag values into `searchText` so task and tag search can use the scalar Fulltext index without changing the existing `tags` array contract.

The unified search path uses a scalar `searchText` column. Add it to the Tasks table as an optional String column (recommended size: 10,000), create `task_search_fulltext` on that column, and backfill existing rows with `title`, `description`, and the space-joined `tags` values before enabling search for existing data. New and edited tasks populate this field automatically.

After the column and index are ready, run `pnpm appwrite:backfill-task-search`. Use `pnpm appwrite:backfill-task-search -- --dry-run` to inspect the number of rows first, or add `--force` to recompute every row. The script requires the server-only Appwrite variables from `.env.local` and only patches `searchText`.

Keep the index set small enough for the expected write volume. If Appwrite reports that a query can use only one ordering index, keep `task_due_date_key` as the first priority for calendar traffic and add task-list sorting indexes only when those sort options are enabled in production.
