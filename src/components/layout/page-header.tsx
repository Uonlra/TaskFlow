type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <section
      className="card-surface"
      style={{
        borderRadius: 34,
        padding: "32px 32px 34px",
        background:
          "radial-gradient(circle at top right, rgba(199,91,57,0.18), transparent 28%), rgba(255,255,255,0.76)",
      }}
    >
      <p
        style={{
          margin: 0,
          color: "var(--primary)",
          letterSpacing: "0.12em",
          fontWeight: 700,
          fontSize: "0.88rem",
        }}
      >
        {eyebrow}
      </p>
      <h1 style={{ margin: "14px 0 0", fontSize: "clamp(2rem, 5vw, 3rem)", lineHeight: 1.2 }}>{title}</h1>
      <p style={{ margin: "16px 0 0", maxWidth: 720, color: "var(--muted)", lineHeight: 1.85 }}>{description}</p>
    </section>
  );
}
