"use client";

import { create } from "zustand";

// SPA view management (env constraint: user hanya bisa lihat route `/`).
// Setiap "halaman" di PRD dirender sebagai view dalam AppShell.

export type MemberView =
  | "beranda"
  | "struk"
  | "kas"
  | "daftar"
  | "barcode"
  | "profil";

export type AdminView =
  | "dashboard"
  | "anggota"
  | "struk-review"
  | "struk-generator"
  | "kas"
  | "import"
  | "audit-log"
  | "settings"
  | "laporan";

export type DaftarJenis = "anggota" | "struk";

type NavState = {
  memberView: MemberView;
  adminView: AdminView;
  daftarJenis: DaftarJenis;
  setMemberView: (v: MemberView) => void;
  setAdminView: (v: AdminView) => void;
  setDaftarJenis: (j: DaftarJenis) => void;
};

export const useNav = create<NavState>((set) => ({
  memberView: "beranda",
  adminView: "dashboard",
  daftarJenis: "anggota",
  setMemberView: (v) => set({ memberView: v }),
  setAdminView: (v) => set({ adminView: v }),
  setDaftarJenis: (j) => set({ daftarJenis: j }),
}));
