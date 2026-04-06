import type { Task } from "@/features/tasks/types/task.types";

export function UpcomingDeadlines({ tasks }: { tasks: Task[] }) {
  return (
    <section className="card-surface" style={{ borderRadius: 28, padding: 24 }}>
      <h2 style={{ margin: 0, fontSize: "1.1rem" }}>即将到期</h2>
      <div style={{ marginTop: 18, display: "grid", gap: 16 }}>
        {tasks.length ? (
          tasks.map((task) => (
            <article
              key={task.id}
              style={{
                padding: 16,
                borderRadius: 20,
                background: "rgba(255,255,255,0.72)",
                border: "1px solid var(--border)",
              }}
            >
              <p style={{ margin: 0, fontWeight: 700 }}>{task.title}</p>
              <p style={{ margin: "10px 0 0", color: "var(--muted)", fontSize: "0.95rem" }}>{task.dueDate}</p>
            </article>
          ))
        ) : (
          <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7 }}>当前范围内还没有临近截止的任务。</p>
        )}
      </div>
    </section>
  );
}
