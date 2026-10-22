"use client";

import { useState } from "react";
import Image from "next/image";
import {
  LayoutDashboard,
  Users,
  ReceiptText,
  FilePlus2,
  Wallet,
  Upload,
  ScrollText,
  Settings,
  FileBarChart,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useModalFocus } from "@/hooks/use-modal-focus";
import { useNav, type AdminView } from "@/lib/nav-store";
import { cn } from "@/lib/utils";
import { DashboardView } from "@/components/views/admin/dashboard-view";
import { AnggotaView } from "@/components/views/admin/anggota-view";
import { StrukReviewView } from "@/components/views/admin/struk-review-view";
import { StrukGeneratorView } from "@/components/views/admin/struk-generator-view";
import { AdminKasView } from "@/components/views/admin/kas-view";
import { ImportView } from "@/components/views/admin/import-view";
import { AuditLogView } from "@/components/views/admin/audit-log-view";
import { SettingsView } from "@/components/views/admin/settings-view";
import { LaporanView } from "@/components/views/admin/laporan-view";

const NAV_ITEMS: Array<{
  view: AdminView;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { view: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { view: "anggota", label: "Anggota", icon: Users },
  { view: "struk-review", label: "Review Struk", icon: ReceiptText },
  { view: "struk-generator", label: "Generator Struk", icon: FilePlus2 },
  { view: "kas", label: "Kas", icon: Wallet },
  { view: "import", label: "Import Data", icon: Upload },
  { view: "audit-log", label: "Audit Log", icon: ScrollText },
  { view: "laporan", label: "Laporan", icon: FileBarChart },
  { view: "settings", label: "Settings", icon: Settings },
];

const TITLES: Record<AdminView, string> = {
  dashboard: "Dashboard Admin",
  anggota: "Manajemen Anggota",
  "struk-review": "Review Struk",
  "struk-generator": "Generator Struk Manual",
  kas: "Kas Organisasi",
  import: "Import Data Anggota",
  "audit-log": "Audit Log",
  settings: "Settings",
  laporan: "Laporan",
};

export function AdminShell() {
  const { adminView, setAdminView } = useNav();
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

  function navigate(view: AdminView) {
    setAdminView(view);
    setDrawerOpen(false);
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-base)]">
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-2 border-b border-[var(--border-default)] bg-[var(--surface)] px-3 sm:px-4 lg:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <button
            type="button"
            aria-label="Buka navigasi"
            onClick={() => setDrawerOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--ink-soft)] hover:bg-[var(--surface-alt)] lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Image src="/icon.svg" alt="HTN Legacy" width={32} height={32} className="hidden sm:block" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-tight text-[var(--ink)]">
              {process.env.NEXT_PUBLIC_INSTANCE_NAME ?? "HTN Legacy"}{" "}
              <span className="text-[var(--accent-secondary)]">· Admin</span>
            </p>
            <p className="truncate text-xs text-[var(--ink-muted)]">{TITLES[adminView]}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-3">
          <ThemeToggle />
          <button
            type="button"
            onClick={logout}
            disabled={loggingOut}
            aria-label="Keluar dari panel Admin"
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
                  adminView === item.view && "sidebar-item--active"
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
                Sesi Admin
              </p>
              <p className="text-sm font-semibold text-[var(--ink)]">
                Bendahara
              </p>
            </div>
          </div>
        </aside>

        {/* Drawer mobile */}
        {drawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/40 animate-in fade-in-0 duration-200"
              onClick={() => setDrawerOpen(false)}
              aria-hidden="true"
            />
            <aside
              ref={drawerRef}
              role="dialog"
              aria-modal="true"
              aria-label="Navigasi Admin"
              className="absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col bg-[var(--surface)] shadow-xl animate-in slide-in-from-left duration-300"
            >
              <div className="flex h-16 items-center justify-between border-b border-[var(--border-default)] px-4">
                <div className="flex items-center gap-2">
                  <Image src="/icon.svg" alt="HTN Legacy" width={28} height={28} />
                  <span className="text-sm font-bold text-[var(--ink)]">
                    HTN Legacy · Admin
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
              <nav className="scroll-area-custom flex-1 overflow-y-auto p-4">
                <div className="flex flex-col gap-1">
                  {NAV_ITEMS.map((item) => (
                    <button
                      key={item.view}
                      type="button"
                      onClick={() => navigate(item.view)}
                      className={cn(
                        "sidebar-item",
                        adminView === item.view && "sidebar-item--active"
                      )}
                    >
                      <item.icon className="h-5 w-5" strokeWidth={2} />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </nav>
              <div className="border-t border-[var(--border-default)] p-4">
                <button
                  type="button"
                  onClick={logout}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[var(--ink-muted)] hover:bg-[var(--surface-alt)]"
                >
                  <LogOut className="h-4 w-4" />
                  Keluar
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* Konten utama */}
        <main className="min-w-0 flex-1 overflow-x-clip p-3 sm:p-4 lg:p-8">
          <div className="mx-auto max-w-6xl">
            {adminView === "dashboard" && <DashboardView />}
            {adminView === "anggota" && <AnggotaView />}
            {adminView === "struk-review" && <StrukReviewView />}
            {adminView === "struk-generator" && <StrukGeneratorView />}
            {adminView === "kas" && <AdminKasView />}
            {adminView === "import" && <ImportView />}
            {adminView === "audit-log" && <AuditLogView />}
            {adminView === "settings" && <SettingsView />}
            {adminView === "laporan" && <LaporanView />}
          </div>
        </main>
      </div>
    </div>
  );
}
