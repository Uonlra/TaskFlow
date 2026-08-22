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
| `task_tags_fulltext` | Fulltext | `tags` | - | Tag search |

The range query uses `isNotNull("dueDate")`, `greaterThanEqual("dueDate", ...)`, `lessThan("dueDate", ...)`, `orderAsc("dueDate")`, and `limit(5000)`. The date values are stored as UTC midnight DateTime values, so the index must be created on the DateTime column rather than on a derived string field.

Keep the index set small enough for the expected write volume. If Appwrite reports that a query can use only one ordering index, keep `task_due_date_key` as the first priority for calendar traffic and add task-list sorting indexes only when those sort options are enabled in production.
