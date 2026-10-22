"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { fetchSession, clearSessionCache, type ClientSession } from "@/lib/auth-client";
import { LoginView } from "@/components/views/login-view";
import { MemberShell } from "@/components/shells/member-shell";
import { AdminShell } from "@/components/shells/admin-shell";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<ClientSession | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const isAuthRoute = ["/login", "/signup", "/admin/login"].includes(pathname);

  useEffect(() => {
    let mounted = true;
    fetchSession()
      .then((s) => {
        if (mounted) {
          setSession(s);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setSession({ member: null, admin: null, isAdmin: false });
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (session && isAuthRoute && (session.member || session.isAdmin)) {
      router.replace("/");
    }
  }, [isAuthRoute, router, session]);

  // Refresh session setelah login/logout.
  useEffect(() => {
    function handler() {
      clearSessionCache();
      fetchSession().then(setSession);
    }
    window.addEventListener("htn-session-changed", handler);
    return () => window.removeEventListener("htn-session-changed", handler);
  }, []);

  // children = halaman utama (page.tsx), tidak dipakai langsung karena
  // AppShell menentukan shell berdasar sesi.
  void children;

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-base)]">
        <div className="h-1 w-32 overflow-hidden rounded-full bg-[var(--border-default)]">
          <div className="splash-progress-bar h-full bg-[var(--accent-secondary)]" />
        </div>
      </div>
    );
  }

  if (isAuthRoute) return <>{children}</>;

  // Admin session punya prioritas: bisa akses admin panel.
  if (session.isAdmin) {
    return <AdminShell adminName={session.admin?.nama ?? "Bendahara"} />;
  }

  if (session.member) {
    return <MemberShell member={session.member} />;
  }

  return <LoginView />;
}
