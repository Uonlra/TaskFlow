type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <section
      className="card-surface page-header"
      style={{
        minWidth: 0,
      }}
    >
      <p
        className="section-eyebrow"
        style={{
          margin: 0,
          color: "var(--primary)",
          fontWeight: 700,
          fontSize: "0.88rem",
        }}
      >
        {eyebrow}
      </p>
      <h1 style={{ margin: "14px 0 0", fontSize: "clamp(2rem, 4.4vw, 3rem)", lineHeight: 1.2 }}>{title}</h1>
      <p style={{ margin: "16px 0 0", maxWidth: 720, color: "var(--muted-strong)", lineHeight: 1.85 }}>{description}</p>
    </section>
  );
}
