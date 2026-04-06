import type { ReactNode } from "react";

type PageContainerProps = {
  children: ReactNode;
};

export function PageContainer({ children }: PageContainerProps) {
  return <div style={{ display: "grid", gap: 28, paddingBottom: 36 }}>{children}</div>;
}
