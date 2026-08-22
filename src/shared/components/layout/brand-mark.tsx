type BrandMarkProps = {
  className?: string;
};

export function BrandMark({ className = "" }: BrandMarkProps) {
  return (
    <span className={`brand-mark${className ? ` ${className}` : ""}`} aria-hidden="true">
      <span />
    </span>
  );
}
