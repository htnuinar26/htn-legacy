"use client";

// HTN Legacy — Splash Screen
// Sesuai ARCHITECTURE.md "Splash Screen" dan DESIGN.md "Splash Screen".
// Ditampilkan sekali saat aplikasi pertama dimuat, sebelum shell utama siap.
// Logo + garis progres emas (0→100%), fade out 250ms begitu sesi siap.

import { useEffect, useState } from "react";
import Image from "next/image";
import { getMemberSession, getAdminSession } from "@/lib/auth-client";

export function SplashProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        // Paralel: cek sesi anggota & admin, tema sudah di-handle next-themes.
        await Promise.all([getMemberSession(), getAdminSession()]);
      } catch {
        // abaikan error sesi di splash; shell akan menangani
      }
      if (!mounted) return;
      setFading(true);
      // Tunggu animasi fade out 250ms lalu sembunyikan splash.
      window.setTimeout(() => {
        if (mounted) setReady(true);
      }, 250);
    }
    init();
    return () => {
      mounted = false;
    };
  }, []);

  if (ready) return <>{children}</>;

  return (
    <>
      <div
        className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[var(--bg-base)] ${
          fading ? "splash-fade-out" : ""
        }`}
        aria-hidden="true"
        role="status"
        aria-live="polite"
      >
        <div className="flex flex-col items-center gap-6">
          <Image
            src="/logo.svg"
            alt="HTN Legacy"
            width={96}
            height={96}
            priority
            className="h-24 w-24"
          />
          <div className="text-center">
            <h1 className="text-lg font-extrabold tracking-tight text-[var(--ink)]">
              HTN Legacy
            </h1>
            <p className="text-xs font-medium text-[var(--ink-muted)]">
              Constitutio et Iustitia
            </p>
          </div>
          {/* Garis progres emas 0→100% */}
          <div
            className="h-0.5 w-40 overflow-hidden rounded-full bg-[var(--border-default)]"
            aria-hidden="true"
          >
            <div className="splash-progress-bar h-full bg-[var(--accent-secondary)]" />
          </div>
        </div>
      </div>
      {children}
    </>
  );
}
