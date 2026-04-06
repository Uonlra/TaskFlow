type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <section
      className="card-surface"
      style={{
        borderRadius: 28,
        padding: 28,
        textAlign: "center",
      }}
    >
      <h3 style={{ margin: 0, fontSize: "1.2rem" }}>{title}</h3>
      <p style={{ margin: "12px auto 0", maxWidth: 520, color: "var(--muted)", lineHeight: 1.7 }}>{description}</p>
    </section>
  );
}
