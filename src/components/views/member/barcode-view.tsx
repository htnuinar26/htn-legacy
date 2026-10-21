"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { QrCode, Download } from "lucide-react";
import {
  PageHeader,
  Card,
  CardHeader,
  LoadingState,
  ErrorBanner,
} from "@/components/blocks/ui";

type Settings = {
  nominalIuran: number;
  periodeBerjalan: string;
  deadlineTanggal: number;
  waPengurus: string | null;
  barcodePath: string | null;
  namaOrganisasi: string;
};

export function BarcodeView() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setSettings(json.data);
        else setError(json.error?.message ?? "Gagal memuat settings.");
      })
      .catch(() => setError("Gagal terhubung ke server."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Barcode Pembayaran"
        description="Gunakan barcode ini untuk pembayaran iuran."
      />

      <Card>
        <CardHeader
          title="Barcode Iuran"
          description={`Nominal iuran: Rp ${(settings?.nominalIuran ?? 0).toLocaleString("id-ID")} · Deadline tanggal ${settings?.deadlineTanggal ?? "-"}`}
        />
        <div className="flex flex-col items-center gap-4 p-8">
          {loading ? (
            <LoadingState label="Memuat barcode..." />
          ) : error ? (
            <ErrorBanner message={error} />
          ) : settings?.barcodePath ? (
            <>
              <div className="rounded-xl border border-[var(--border-default)] bg-white p-4">
                <Image
                  src={settings.barcodePath}
                  alt="Barcode pembayaran iuran"
                  width={240}
                  height={240}
                  className="h-60 w-60"
                />
              </div>
              <a
                href={settings.barcodePath}
                download
                className="flex items-center gap-2 rounded-lg border border-[var(--border-default)] px-4 py-2 text-sm font-medium text-[var(--ink-soft)] hover:bg-[var(--surface-alt)]"
              >
                <Download className="h-4 w-4" />
                Unduh Barcode
              </a>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--surface-alt)]">
                <QrCode className="h-8 w-8 text-[var(--ink-muted)]" />
              </div>
              <p className="text-sm font-semibold text-[var(--ink)]">
                Barcode belum tersedia
              </p>
              <p className="max-w-sm text-sm text-[var(--ink-muted)]">
                Admin/Bendahara belum mengunggah barcode pembayaran. Hubungi
                pengurus untuk informasi pembayaran iuran.
              </p>
            </div>
          )}
        </div>
      </Card>

      {settings?.waPengurus && (
        <Card>
          <CardHeader title="Hubungi Pengurus" description="Untuk pertanyaan seputar pembayaran" />
          <div className="p-5">
            <a
              href={`https://wa.me/${settings.waPengurus.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                "Halo, saya ingin bertanya tentang pembayaran iuran."
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white hover:brightness-95"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 2.1.55 4.15 1.6 5.96L2 22l4.25-1.66a9.9 9.9 0 0 0 5.79 1.83h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.15h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-2.52.99.99-2.46-.2-.31a8.18 8.18 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.69 8.23-8.23 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43-.14-.01-.31-.01-.48-.01-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28z"/>
              </svg>
              Chat WhatsApp Pengurus
            </a>
          </div>
        </Card>
      )}
    </div>
  );
}
