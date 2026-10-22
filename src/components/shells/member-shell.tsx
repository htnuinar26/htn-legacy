"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Home,
  ReceiptText,
  Wallet,
  Users,
  QrCode,
  UserCircle,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useModalFocus } from "@/hooks/use-modal-focus";
import { useNav, type MemberView } from "@/lib/nav-store";
import { cn } from "@/lib/utils";
import { BerandaView } from "@/components/views/member/beranda-view";
import { StrukView } from "@/components/views/member/struk-view";
import { KasView } from "@/components/views/member/kas-view";
import { DaftarView } from "@/components/views/member/daftar-view";
import { BarcodeView } from "@/components/views/member/barcode-view";
import { ProfilView } from "@/components/views/member/profil-view";

const NAV_ITEMS: Array<{
  view: MemberView;
  label: string;
  icon: typeof Home;
}> = [
  { view: "beranda", label: "Beranda", icon: Home },
  { view: "struk", label: "Struk Iuran", icon: ReceiptText },
  { view: "kas", label: "Kas Organisasi", icon: Wallet },
  { view: "daftar", label: "Daftar Anggota", icon: Users },
  { view: "barcode", label: "Barcode", icon: QrCode },
  { view: "profil", label: "Profil", icon: UserCircle },
];

const TITLES: Record<MemberView, string> = {
  beranda: "Beranda",
  struk: "Struk Iuran",
  kas: "Kas Organisasi",
  daftar: "Daftar Anggota",
  barcode: "Barcode Pembayaran",
  profil: "Profil Saya",
};

export function MemberShell({
  member,
}: {
  member: { anggotaId: string; nama: string };
}) {
  const { memberView, setMemberView } = useNav();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const drawerRef = useModalFocus<HTMLElement>(drawerOpen, () =>
    setDrawerOpen(false)
  );

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) {
        // Sesi belum benar-benar berakhir, jadi jangan tampilkan shell
        // sebagai sudah keluar.
        return;
      }
      window.dispatchEvent(new Event("htn-session-changed"));
    } catch {
      // Jaringan gagal, sesi di server masih aktif.
    } finally {
      setLoggingOut(false);
    }
  }

  function navigate(view: MemberView) {
    setMemberView(view);
    setDrawerOpen(false);
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-base)]">
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[var(--border-default)] bg-[var(--surface)] px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Buka navigasi"
            onClick={() => setDrawerOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--ink-soft)] hover:bg-[var(--surface-alt)] lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Image src="/logo.svg" alt="HTN Legacy" width={32} height={32} className="hidden sm:block" />
          <div>
            <p className="text-sm font-bold leading-tight text-[var(--ink)]">
              {process.env.NEXT_PUBLIC_INSTANCE_NAME ?? "HTN Legacy"}
            </p>
            <p className="text-xs text-[var(--ink-muted)]">
              {TITLES[memberView]}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            type="button"
            onClick={logout}
            disabled={loggingOut}
            aria-label="Keluar dari akun"
            className="flex h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium text-[var(--ink-muted)] hover:bg-[var(--surface-alt)] disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar desktop */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-[var(--border-default)] bg-[var(--surface)] lg:flex">
          <nav className="flex flex-col gap-1 p-4">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.view}
                type="button"
                onClick={() => navigate(item.view)}
                className={cn(
                  "sidebar-item",
                  memberView === item.view && "sidebar-item--active"
                )}
              >
                <item.icon className="h-5 w-5" strokeWidth={2} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="mt-auto p-4">
            <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-alt)] p-3">
              <p className="text-xs font-medium text-[var(--ink-muted)]">
                Masuk sebagai
              </p>
              <p className="truncate text-sm font-semibold text-[var(--ink)]">
                {member.nama}
              </p>
            </div>
          </div>
        </aside>

        {/* Drawer mobile */}
        {drawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setDrawerOpen(false)}
              aria-hidden="true"
            />
            <aside
              ref={drawerRef}
              role="dialog"
              aria-modal="true"
              aria-label="Navigasi"
              className="absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col bg-[var(--surface)] shadow-xl"
            >
              <div className="flex h-16 items-center justify-between border-b border-[var(--border-default)] px-4">
                <div className="flex items-center gap-2">
                  <Image src="/logo.svg" alt="HTN Legacy" width={28} height={28} />
                  <span className="text-sm font-bold text-[var(--ink)]">
                    HTN Legacy
                  </span>
                </div>
                <button
                  type="button"
                  aria-label="Tutup navigasi"
                  onClick={() => setDrawerOpen(false)}
                  className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--ink-soft)] hover:bg-[var(--surface-alt)]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex flex-1 flex-col gap-1 p-4">
                {NAV_ITEMS.map((item) => (
                  <button
                    key={item.view}
                    type="button"
                    onClick={() => navigate(item.view)}
                    className={cn(
                      "sidebar-item",
                      memberView === item.view && "sidebar-item--active"
                    )}
                  >
                    <item.icon className="h-5 w-5" strokeWidth={2} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>
              <div className="border-t border-[var(--border-default)] p-4">
                <p className="truncate text-sm font-semibold text-[var(--ink)]">
                  {member.nama}
                </p>
                <button
                  type="button"
                  onClick={logout}
                  className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[var(--ink-muted)] hover:bg-[var(--surface-alt)]"
                >
                  <LogOut className="h-4 w-4" />
                  Keluar
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* Konten utama */}
        <main className="min-w-0 flex-1 p-4 lg:p-8">
          <div className="mx-auto max-w-6xl">
            {memberView === "beranda" && <BerandaView member={member} />}
            {memberView === "struk" && <StrukView member={member} />}
            {memberView === "kas" && <KasView />}
            {memberView === "daftar" && <DaftarView />}
            {memberView === "barcode" && <BarcodeView />}
            {memberView === "profil" && <ProfilView member={member} />}
          </div>
        </main>
      </div>
    </div>
  );
}
