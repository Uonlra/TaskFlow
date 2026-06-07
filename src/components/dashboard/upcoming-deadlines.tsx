import type { Task } from "@/features/tasks/types/task.types";

export function UpcomingDeadlines({ tasks }: { tasks: Task[] }) {
  return (
    <section className="card-surface" style={{ borderRadius: 28, padding: 24 }}>
      <p className="section-eyebrow" style={{ margin: 0, color: "var(--warning)", fontWeight: 700, fontSize: "0.82rem" }}>
        截止
      </p>
      <h2 style={{ margin: "10px 0 0", fontSize: "1.18rem" }}>快到点了</h2>
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
              <p className="ui-sans" style={{ margin: "10px 0 0", color: "var(--muted)", fontSize: "0.92rem" }}>{task.dueDate}</p>
            </article>
          ))
        ) : (
          <p style={{ margin: 0, color: "var(--muted-strong)", lineHeight: 1.7 }}>暂时没有快到期的任务，可以先松一口气。</p>
        )}
      </div>
    </section>
  );
}
