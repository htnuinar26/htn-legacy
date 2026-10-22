"use client";

import { useEffect, useRef } from "react";

/**
 * Trap fokus, tombol Escape, dan kunci scroll untuk drawer serta dialog.
 *
 * Tanpa ini, drawer yang memakai `aria-modal="true"` masih bisa
 * difokuskan dari luar lewat tombol Tab, dan tidak bisa ditutup dengan
 * tombol Escape. DESIGN.md bagian Accessibility mensyaratkan tidak ada
 * jebakan fokus di luar modal yang sedang terbuka.
 *
 * @param active apakah modal atau drawer sedang terbuka
 * @param onClose callback yang dipanggil saat Escape ditekan
 */
export function useModalFocus<T extends HTMLElement>(
  active: boolean,
  onClose: () => void
) {
  const containerRef = useRef<T | null>(null);
  // Simpan callback di ref supaya effect tidak berjalan ulang setiap kali
  // pemanggil membuat fungsi baru. Diperbarui di effect, bukan saat render,
  // karena akses ref saat render dilarang oleh aturan React.
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!active) return;

    const container = containerRef.current;
    const previousFocus = document.activeElement as HTMLElement | null;

    function focusableItems(): HTMLElement[] {
      if (!container) return [];
      return Array.from(
        container.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null);
    }

    // Pindahkan fokus ke elemen pertama di dalam drawer atau dialog.
    focusableItems()[0]?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const items = focusableItems();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement;

      if (event.shiftKey && current === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);

    // Kunci scroll halaman supaya drawer tidak membuat latar ikut bergeser.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, [active]);

  return containerRef;
}
