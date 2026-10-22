"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // next-themes requires mounted check to avoid hydration mismatch.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    // Placeholder untuk hindari hydration mismatch.
    return (
      <div className="flex items-center gap-1 rounded-lg border border-[var(--border-default)] p-1">
        <div className="h-11 w-11" />
      </div>
    );
  }

  const options: Array<{ value: string; label: string; icon: typeof Sun }> = [
    { value: "light", label: "Terang", icon: Sun },
    { value: "dark", label: "Gelap", icon: Moon },
    { value: "system", label: "Sistem", icon: Monitor },
  ];

  return (
    <div
      className="flex items-center gap-1 rounded-lg border border-[var(--border-default)] bg-[var(--surface)] p-1"
      role="radiogroup"
      aria-label="Pilih tema"
    >
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          aria-label={label}
          title={label}
          onClick={() => setTheme(value)}
          className={cn(
            // Target sentuh minimal 44x44 px sesuai DESIGN.md bagian Button.
            "flex h-11 w-11 items-center justify-center rounded-md transition-colors",
            theme === value
              ? "bg-[var(--accent-primary)] text-white"
              : "text-[var(--ink-muted)] hover:bg-[var(--surface-alt)]"
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={2} />
        </button>
      ))}
    </div>
  );
}
