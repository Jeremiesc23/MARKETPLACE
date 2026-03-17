//app/sites/[vertical]/components/vertical-theme-provider.tsx
"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function VerticalThemeProvider({
  vertical,
  children,
}: {
  vertical: string;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div
      data-theme={vertical}
      className={cn(
        "theme-wrapper min-h-screen bg-background text-foreground font-sans transition-colors duration-300",
        mounted ? "opacity-100" : "opacity-0"
      )}
    >
      {children}
    </div>
  );
}
