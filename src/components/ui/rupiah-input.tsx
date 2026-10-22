"use client";

// HTN Legacy - RupiahInput
// Komponen bersama WAJIB untuk SEMUA field nominal uang di aplikasi.
// Lihat ARCHITECTURE.md bagian "Standar Input Nominal (Wajib)".
//
// Aturan teknis (non-negotiable):
// - Elemen dasar <input type="text" inputMode="numeric">
// - DILARANG type="number" (sumber bug native step validation).
// - DILARANG pattern="[0-9]*" - nilai tampilan terformat mengandung pemisah
//   ribuan (titik), sehingga pattern native menolak nilai wajar seperti
//   "10.000" dengan pesan "Please match the requested format." Ini adalah
//   kelas bug yang sama dengan bug step lama: native validation menolak
//   input yang sebenarnya valid. Filter onChange sudah membuang non-digit,
//   validasi final di server via Zod.
// - State menyimpan integer polos (15000), tampilan terformat (15.000).
// - Tidak ada min/max/step/pattern HTML native.
// - Validasi final di server via Zod (z.number().int().positive()).

import { useId, useLayoutEffect, useRef } from "react";
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

/**
 * Batas maksimum nominal.
 *
 * Kolom `nominal` di Prisma bertipe Int, yaitu integer 32 bit pada
 * PostgreSQL. Nilai di atas 2.147.483.647 akan lolos validasi Zod
 * `z.number().int().positive()` lalu gagal saat disimpan dengan error
 * database yang membingungkan. Nilai di sini dijaga tetap di bawah batas
 * kolom, dan server tetap memvalidasi ulang.
 */
export const MAX_NOMINAL = 2_000_000_000;

function formatRupiah(value: number | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  return formatter.format(value);
}

/** Hitung jumlah karakter digit pada potongan teks. */
function countDigits(text: string): number {
  let total = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 48 && code <= 57) total++;
  }
  return total;
}

/**
 * Posisi caret di dalam string terformat, tepat setelah digit ke-`digitIndex`.
 *
 * Pemisah ribuan membuat posisi karakter tidak sama dengan posisi digit.
 * Dipakai untuk mengembalikan caret ke digit yang sama seperti sebelum
 * pengeditan, bukan ke karakter dengan offset yang sama.
 */
function caretPositionForDigits(formatted: string, digitIndex: number): number {
  if (digitIndex <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i++) {
    const code = formatted.charCodeAt(i);
    if (code >= 48 && code <= 57) {
      seen++;
      if (seen === digitIndex) return i + 1;
    }
  }
  return formatted.length;
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

  const inputRef = useRef<HTMLInputElement | null>(null);
  // Indeks digit caret yang harus dipulihkan setelah nilai terformat
  // berubah. Null berarti tidak ada pemulihan caret yang perlu dilakukan.
  const pendingCaret = useRef<number | null>(null);

  const displayValue = formatRupiah(value);

  // Pulihkan posisi caret setelah render.
  //
  // Tanpa ini, setiap ketikan membuat React menulis ulang nilai input dan
  // caret otomatis lompat ke akhir. Akibatnya angka tidak bisa diedit di
  // tengah: dari "10.000" tidak bisa mengubah digit ketiga menjadi "5"
  // karena caret selalu berada di akhir setelah satu ketikan.
  useLayoutEffect(() => {
    const el = inputRef.current;
    const digitIndex = pendingCaret.current;
    if (!el || digitIndex === null) return;
    pendingCaret.current = null;
    const position = caretPositionForDigits(el.value, digitIndex);
    try {
      el.setSelectionRange(position, position);
    } catch {
      // Sebagian browser menolak setSelectionRange pada input tertentu.
      // Abaikan saja, nilainya sudah benar.
    }
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const el = e.target;
    const newText = el.value;
    const caret = el.selectionStart ?? newText.length;
    // Berapa digit yang ada sebelum caret pada teks baru.
    const caretDigits = countDigits(newText.slice(0, caret));

    // Buang semua karakter non-digit.
    const raw = newText.replace(/[^0-9]/g, "");
    if (raw === "") {
      pendingCaret.current = 0;
      onChange(null);
      return;
    }

    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed)) return;

    if (parsed > MAX_NOMINAL) {
      // Nilai di luar batas kolom database. Dikembalikan ke batas maksimum
      // supaya server tidak menerima angka yang pasti gagal disimpan.
      pendingCaret.current = countDigits(String(MAX_NOMINAL));
      onChange(MAX_NOMINAL);
      return;
    }

    pendingCaret.current = caretDigits;
    onChange(parsed);
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
          ref={inputRef}
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
