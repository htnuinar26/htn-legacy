"use client";

// HTN Legacy — RupiahInput
// Komponen bersama WAJIB untuk SEMUA field nominal uang di aplikasi.
// Lihat ARCHITECTURE.md bagian "Standar Input Nominal (Wajib)".
//
// Aturan teknis (non-negotiable):
// - Elemen dasar <input type="text" inputMode="numeric">
// - DILARANG type="number" (sumber bug native step validation).
// - DILARANG pattern="[0-9]*" — nilai tampilan terformat mengandung pemisah
//   ribuan (titik), sehingga pattern native menolak nilai wajar seperti
//   "10.000" dengan pesan "Please match the requested format." Ini adalah
//   kelas bug yang sama dengan bug step lama: native validation menolak
//   input yang sebenarnya valid. Filter onChange sudah membuang non-digit,
//   validasi final di server via Zod.
// - State menyimpan integer polos (15000), tampilan terformat (15.000).
// - Tidak ada min/max/step/pattern HTML native.
// - Validasi final di server via Zod (z.number().int().positive()).

import { useId } from "react";
import { cn } from "@/lib/utils";

export type RupiahInputProps = {
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  id?: string;
  label: string;
  className?: string;
  /** Teks bantuan tambahan di bawah preview. */
  hint?: string;
};

const formatter = new Intl.NumberFormat("id-ID");

function formatRupiah(value: number | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  return formatter.format(value);
}

export function RupiahInput({
  value,
  onChange,
  placeholder = "0",
  disabled,
  error,
  id,
  label,
  className,
  hint,
}: RupiahInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const helpId = `${inputId}-help`;
  const errorId = `${inputId}-error`;

  const displayValue = formatRupiah(value);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Buang semua karakter non-digit.
    const raw = e.target.value.replace(/[^0-9]/g, "");
    if (raw === "") {
      onChange(null);
      return;
    }
    const parsed = parseInt(raw, 10);
    if (Number.isFinite(parsed)) {
      onChange(parsed);
    }
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-[var(--ink)]"
      >
        {label}
      </label>
      <div className="relative">
        {/* Prefiks Rp statis di dalam field, bukan bagian dari value */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--ink-muted)]"
        >
          Rp
        </span>
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          className="rupiah-input"
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : helpId}
        />
      </div>
      {/* Baris bantuan preview format penuh */}
      <p id={helpId} className="text-xs text-[var(--ink-muted)]">
        {value !== null && value > 0
          ? `Preview: Rp ${formatRupiah(value)}`
          : hint ?? "Masukkan nominal dalam Rupiah (contoh: 15000)."}
      </p>
      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-[var(--status-tertunggak)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
