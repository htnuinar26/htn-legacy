"use client";

import { useState } from "react";
import Image from "next/image";
import { Loader2, LogIn, UserPlus, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";

type Mode = "login" | "signup" | "admin";

export function LoginView() {
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const router = useRouter();

  // form state
  const [nama, setNama] = useState("");
  const [nim, setNim] = useState("");
  const [email, setEmail] = useState("");
  const [telepon, setTelepon] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    let endpoint = "/api/auth/login";
    let payload: Record<string, unknown> = { nama, password };
    if (mode === "signup") {
      endpoint = "/api/auth/signup";
      payload = { nama, nim, email, telepon, password };
    } else if (mode === "admin") {
      endpoint = "/api/auth/admin-login";
      payload = { password };
    }

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "Gagal masuk. Periksa kembali data Anda.");
        if (json.error?.fields) setFieldErrors(json.error.fields);
        setLoading(false);
        return;
      }
      window.dispatchEvent(new Event("htn-session-changed"));
      router.refresh();
    } catch {
      setError(
        "Tidak dapat menghubungi server. Periksa koneksi Anda lalu coba lagi."
      );
      setLoading(false);
    }
  }

  // Ganti mode membersihkan error dari mode sebelumnya, supaya pesan gagal
  // login tidak tetap menempel di form pendaftaran.
  function switchMode(next: "login" | "signup" | "admin") {
    setMode(next);
    setError(null);
    setFieldErrors({});
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-base)] lg:flex-row">
      {/* Panel kiri - branding (desktop) */}
      <div className="relative hidden flex-col justify-between bg-[var(--accent-primary-strong)] p-12 text-white lg:flex lg:w-1/2">
        <div className="flex items-center gap-3">
          <Image src="/icon.svg" alt="HTN Legacy" width={48} height={48} />
          <div>
            <p className="text-lg font-extrabold leading-tight">HTN Legacy</p>
            <p className="text-xs text-white/70">Constitutio et Iustitia</p>
          </div>
        </div>
        <div className="max-w-md">
          <h1 className="text-3xl font-extrabold leading-tight">
            Sistem Iuran &amp; Kas Organisasi
          </h1>
          <p className="mt-3 text-sm text-white/80">
            Pencatatan iuran, verifikasi receipt manual, manajemen kas, dan
            audit log untuk pengurus dan anggota.
          </p>
        </div>
        <p className="text-xs text-white/50">
          © {new Date().getFullYear()} HTN Legacy. Untuk penggunaan internal.
        </p>
      </div>

      {/* Panel kanan - form */}
      <div className="relative flex flex-1 items-center justify-center p-6 sm:p-12">
        {/* Theme toggle di pojok kanan atas panel form */}
        <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-md">
          {/* Logo mobile */}
          <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
            <Image src="/icon.svg" alt="HTN Legacy" width={40} height={40} />
            <div>
              <p className="text-base font-extrabold leading-tight text-[var(--ink)]">
                HTN Legacy
              </p>
              <p className="text-[10px] text-[var(--ink-muted)]">
                Constitutio et Iustitia
              </p>
            </div>
          </div>

          {/* Tab mode */}
          <div className="mb-6 flex gap-1 rounded-lg border border-[var(--border-default)] bg-[var(--surface)] p-1">
            <ModeButton
              active={mode === "login"}
              onClick={() => switchMode("login")}
              icon={LogIn}
              label="Masuk"
            />
            <ModeButton
              active={mode === "signup"}
              onClick={() => switchMode("signup")}
              icon={UserPlus}
              label="Daftar"
            />
            <ModeButton
              active={mode === "admin"}
              onClick={() => switchMode("admin")}
              icon={ShieldCheck}
              label="Admin"
            />
          </div>

          <h2 className="mb-1 text-xl font-bold text-[var(--ink)]">
            {mode === "login" && "Masuk sebagai Anggota"}
            {mode === "signup" && "Daftar Anggota Baru"}
            {mode === "admin" && "Masuk Panel Admin"}
          </h2>
          <p className="mb-6 text-sm text-[var(--ink-muted)]">
            {mode === "login" && "Gunakan nama dan password per aksi Anda."}
            {mode === "signup" && "Lengkapi data untuk membuat akun anggota."}
            {mode === "admin" && "Masukkan password Admin/Bendahara bersama."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode !== "admin" && (
              <Field
                id="login-nama"
                label="Nama Lengkap"
                value={nama}
                onChange={setNama}
                error={fieldErrors.nama}
                placeholder="Nama sesuai identitas"
                autoComplete="name"
              />
            )}

            {mode === "signup" && (
              <>
                <Field
                  id="login-nim"
                  label="NIM (opsional)"
                  value={nim}
                  onChange={setNim}
                  error={fieldErrors.nim}
                  placeholder="Nomor induk mahasiswa"
                />
                <Field
                  id="login-email"
                  label="Email (opsional)"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  error={fieldErrors.email}
                  placeholder="email@contoh.com"
                  autoComplete="email"
                />
                <Field
                  id="login-telepon"
                  label="Nomor WhatsApp (opsional)"
                  value={telepon}
                  onChange={setTelepon}
                  error={fieldErrors.telepon}
                  placeholder="628xxxxxxxxxx"
                />
              </>
            )}

            <Field
              id="login-password"
              label={mode === "admin" ? "Password Admin" : "Password"}
              type="password"
              value={password}
              onChange={setPassword}
              error={fieldErrors.password}
              placeholder="••••••••"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />

            {error && (
              <div
                role="alert"
                className="rounded-lg border border-[var(--status-tertunggak)]/30 bg-[var(--status-tertunggak-bg)] px-4 py-3 text-sm font-medium text-[var(--status-tertunggak)]"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--button-primary-bg)] font-semibold text-white transition-all hover:bg-[var(--button-primary-hover)] active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {mode === "login" && <LogIn className="h-4 w-4" />}
                  {mode === "signup" && <UserPlus className="h-4 w-4" />}
                  {mode === "admin" && <ShieldCheck className="h-4 w-4" />}
                </>
              )}
              <span>
                {mode === "login" && "Masuk"}
                {mode === "signup" && "Daftar"}
                {mode === "admin" && "Masuk Admin"}
              </span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof LogIn;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-[var(--accent-primary)] text-white"
          : "text-[var(--ink-muted)] hover:bg-[var(--surface-alt)]"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  error,
  placeholder,
  type = "text",
  autoComplete,
  id,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
  id: string;
}) {
  const errorId = `${id}-error`;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-[var(--ink)]">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="input-editorial h-11"
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
      />
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-[var(--status-tertunggak)]">
          {error}
        </p>
      )}
    </div>
  );
}
