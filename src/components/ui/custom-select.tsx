"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export type CustomSelectOption = {
  value: string;
  label: string;
};

type CustomSelectProps = {
  value: string;
  options: CustomSelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  id?: string;
  ariaDescribedBy?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

export function CustomSelect({
  value,
  options,
  onChange,
  ariaLabel,
  id,
  ariaDescribedBy,
  placeholder = "Pilih opsi",
  disabled = false,
  className = "",
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  useEffect(() => {
    function closeOnOutside(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutside);
    return () => document.removeEventListener("mousedown", closeOnOutside);
  }, []);

  function toggle() {
    if (disabled) return;
    setHighlighted(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen((current) => !current);
  }

  function selectOption(option: CustomSelectOption) {
    onChange(option.value);
    setOpen(false);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!open) toggle();
      else if (options[highlighted]) selectOption(options[highlighted]);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      const direction = event.key === "ArrowDown" ? 1 : -1;
      setHighlighted((index) =>
        (index + direction + options.length) % options.length
      );
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setHighlighted(event.key === "Home" ? 0 : Math.max(options.length - 1, 0));
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        id={id}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-describedby={ariaDescribedBy}
        disabled={disabled}
        onClick={toggle}
        onKeyDown={handleKeyDown}
        className="input-editorial flex h-11 w-full items-center justify-between gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={selected ? "text-[var(--ink)]" : "text-[var(--ink-muted)]"}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 text-[var(--ink-muted)] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && options.length > 0 && (
        <div
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          className="absolute z-30 mt-2 max-h-64 w-full overflow-y-auto rounded-lg border border-[var(--border-default)] bg-[var(--surface)] p-1 shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
        >
          {options.map((option, index) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={active}
                onMouseEnter={() => setHighlighted(index)}
                onClick={() => selectOption(option)}
                className={`flex min-h-11 w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] ${
                  highlighted === index
                    ? "bg-[var(--surface-alt)] text-[var(--ink)]"
                    : "text-[var(--ink-soft)]"
                }`}
              >
                <span>{option.label}</span>
                {active && <Check aria-hidden="true" className="h-4 w-4 text-[var(--accent-primary)]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
