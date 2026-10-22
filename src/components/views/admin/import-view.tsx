"use client";

import { useState } from "react";
import { Upload, Loader2, FileSpreadsheet, CheckCircle2 } from "lucide-react";
import {
  PageHeader,
  Card,
  CardHeader,
  ErrorBanner,
} from "@/components/blocks/ui";

type Row = {
  nama: string;
  nim?: string;
  email?: string;
  telepon?: string;
  password: string;
  statusBayar?: "LUNAS" | "BELUM_LUNAS" | "TERTUNGGAK";
};

/**
 * Parser CSV yang menangani tanda kutip.
 *
 * `split(",")` saja merusak data yang wajar. Baris seperti
 * `"Budi, Santoso",pass123,...` akan terpecah menjadi beberapa kolom,
 * sehingga nama dan password ikut terpotong dan anggota tersimpan dengan
 * data yang salah, tanpa error apa pun.
 */
function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      // Tanda kutip ganda di dalam sel berarti karakter kutip literal.
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

export function ImportView() {
  const [text, setText] = useState("");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<{
    message: string;
    requestId?: string;
  } | null>(null);
  const [result, setResult] = useState<{
    created: number;
    skipped: number;
    failures: string[];
  } | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result ?? ""));
    reader.readAsText(f);
  }

  async function handleImport() {
    setImporting(true);
    setError(null);
    setResult(null);

    // Parse CSV dengan dukungan tanda kutip.
    // Urutan kolom: nama,password,nim,email,telepon,statusBayar
    const lines = text.trim().split("\n");
    const rows: Row[] = [];
    const errors: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith("#")) continue;
      const cols = parseCsvLine(line);
      if (cols.length < 2) {
        errors.push(`Baris ${i + 1}: format tidak valid (minimal nama,password)`);
        continue;
      }
      const [nama, password, nim, email, telepon, statusBayar] = cols;
      if (!nama || !password) {
        errors.push(`Baris ${i + 1}: nama dan password wajib`);
        continue;
      }
      rows.push({
        nama,
        password,
        nim: nim || undefined,
        email: email || undefined,
        telepon: telepon || undefined,
        statusBayar: (statusBayar as Row["statusBayar"]) || "BELUM_LUNAS",
      });
    }

    if (errors.length > 0) {
      setError({
        message: `Ditemukan ${errors.length} baris tidak valid:\n${errors.slice(0, 5).join("\n")}`,
      });
      setImporting(false);
      return;
    }

    let created = 0;
    let skipped = 0;
    const failures: string[] = [];
    for (const row of rows) {
      try {
        const res = await fetch("/api/anggota", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(row),
        });
        const json = await res.json();
        if (json.success) {
          created++;
        } else {
          skipped++;
          // Simpan alasan kegagalan per baris. Tanpa ini, Admin hanya
          // melihat jumlah "N dilewati" tanpa tahu baris mana dan kenapa.
          failures.push(
            `${row.nama}: ${json.error?.message ?? "Gagal disimpan."}`
          );
        }
      } catch {
        skipped++;
        failures.push(`${row.nama}: tidak dapat menghubungi server.`);
      }
    }

    setResult({ created, skipped, failures });
    setText("");
    setImporting(false);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import Data Anggota"
        description="Import anggota secara massal dari file CSV."
      />

      <Card>
        <CardHeader
          title="Upload File CSV"
          description="Format: nama,password,nim,email,telepon,statusBayar"
        />
        <div className="space-y-4 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--surface-alt)] px-4 py-2.5 text-sm font-medium text-[var(--ink-soft)] hover:bg-[var(--surface)]">
              <Upload className="h-4 w-4" />
              Pilih File CSV
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFile}
                className="hidden"
              />
            </label>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="import-text" className="block text-sm font-medium text-[var(--ink)]">
              Atau tempel data CSV
            </label>
            <textarea
              id="import-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              placeholder={"# nama,password,nim,email,telepon,statusBayar\nBudi,pass123,12345,budi@mail.com,628111,BELUM_LUNAS\nSiti,pass456,12346,siti@mail.com,628222,LUNAS"}
              className="input-editorial font-mono text-xs"
            />
          </div>

          {error && <ErrorBanner message={error.message} requestId={error.requestId} />}

          {result && (
            <div className="flex items-start gap-3 rounded-lg border border-[var(--status-lunas)]/30 bg-[var(--status-lunas-bg)] px-4 py-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--status-lunas)]" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--status-lunas)]">
                  Import selesai
                </p>
                <p className="text-sm text-[var(--status-lunas)]/90">
                  {result.created} anggota dibuat, {result.skipped} dilewati (duplikat/error).
                </p>
                {result.failures.length > 0 && (
                  <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-[var(--status-lunas)]/80">
                    {result.failures.slice(0, 10).map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                    {result.failures.length > 10 && (
                      <li>dan {result.failures.length - 10} baris lain.</li>
                    )}
                  </ul>
                )}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleImport}
            disabled={importing || !text.trim()}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--button-primary-bg)] px-6 font-semibold text-white hover:bg-[var(--button-primary-hover)] disabled:opacity-50 sm:w-auto"
          >
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
            {importing ? "Mengimport..." : "Import Sekarang"}
          </button>
        </div>
      </Card>

      <Card>
        <CardHeader title="Format CSV" description="Panduan format import" />
        <div className="p-5">
          <pre className="overflow-x-auto rounded-lg bg-[var(--surface-alt)] p-4 text-xs text-[var(--ink-soft)]">
{`nama,password,nim,email,telepon,statusBayar
Budi Santoso,pass123,12345,budi@mail.com,628111222333,BELUM_LUNAS
Siti Rahayu,pass456,12346,siti@mail.com,628222333444,LUNAS
Ahmad Yani,pass789,,ahmad@mail.com,,TERTUNGGAK`}
          </pre>
          <ul className="mt-3 space-y-1 text-sm text-[var(--ink-muted)]">
            <li>• Baris diawali <code className="rounded bg-[var(--surface-alt)] px-1">#</code> diabaikan (komentar).</li>
            <li>• <strong className="text-[var(--ink)]">nama</strong> dan <strong className="text-[var(--ink)]">password</strong> wajib; kolom lain opsional.</li>
            <li>• <strong className="text-[var(--ink)]">statusBayar</strong>: LUNAS, BELUM_LUNAS, atau TERTUNGGAK.</li>
            <li>• Nama atau nilai yang mengandung koma ditulis di dalam tanda kutip, misalnya <code className="rounded bg-[var(--surface-alt)] px-1">"Budi, Santoso"</code>.</li>
            <li>• Baris dengan nama/nim/email duplikat akan dilewati, dan alasannya ditampilkan setelah import.</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
