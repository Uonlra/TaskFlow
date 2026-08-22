# Appwrite Task Indexes

The calendar range endpoint sends Appwrite `queries[]` directly to the Tasks table. Create these indexes in the Appwrite TablesDB console or deployment configuration before enabling the range endpoint in production.

| Index key | Type | Attributes | Order | Used by |
| --- | --- | --- | --- | --- |
| `task_due_date_key` | Key | `dueDate` | ASC | Calendar bounded ranges and all-range ordering |
| `task_status_key` | Key | `status` | ASC | Task list status filters |
| `task_priority_key` | Key | `priority` | ASC | Task list priority filters |
| `task_created_at_key` | Key | `$createdAt` | DESC | Task list created-time sorting |
| `task_updated_at_key` | Key | `$updatedAt` | DESC | Task list updated-time sorting |
| `task_title_fulltext` | Fulltext | `title` | - | Task search |
| `task_description_fulltext` | Fulltext | `description` | - | Task search |

The range query uses Appwrite query objects for `isNotNull`, `greaterThanEqual`, `lessThan`, `orderAsc`, and `limit`. The date values are stored as UTC midnight DateTime values, so the index must be created on the DateTime column rather than on a derived string field.

Appwrite does not allow a Fulltext index on the `tags` array attribute. Tag filtering therefore remains an application-level operation for now, or can be moved to a separate scalar/search attribute if tag search needs to be pushed down to Appwrite later.

Keep the index set small enough for the expected write volume. If Appwrite reports that a query can use only one ordering index, keep `task_due_date_key` as the first priority for calendar traffic and add task-list sorting indexes only when those sort options are enabled in production.
