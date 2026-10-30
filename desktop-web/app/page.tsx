"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DesktopHomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return <p>正在打开工作台...</p>;
}
