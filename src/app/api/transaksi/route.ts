import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  apiSuccess,
  apiError,
  apiUnexpected,
  classifyPrismaError,
} from "@/lib/api-response";
import { isAdmin, requireMemberOrAdmin } from "@/lib/auth";

const CreateSchema = z.object({
  tipe: z.enum(["MASUK", "KELUAR"], {
    message: "Tipe harus MASUK atau KELUAR",
  }),
  nominal: z
    .number()
    .int("Nominal harus bilangan bulat")
    .positive("Nominal harus lebih dari 0"),
  keterangan: z.string().optional(),
  periodeBulan: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Periode harus format YYYY-MM"),
  anggotaId: z.string().nullable().optional(),
});

// GET /api/transaksi?bulan=YYYY-MM - daftar transaksi + ringkasan + saldo.
// Route ini dapat diakses anggota (untuk melihat kas organisasi) dan Admin.
// Tanpa session, request DITOLAK: data kas tidak boleh bocor ke tamu.
export async function GET(req: NextRequest) {
  try {
    const guard = await requireMemberOrAdmin();
    if (!guard.ok) return guard.response;

    const { searchParams } = new URL(req.url);
    const bulan = searchParams.get("bulan");

    const where = bulan ? { periodeBulan: bulan } : {};
    const transaksi = await db.transaksi.findMany({
      where,
      include: { anggota: true, struk: true },
      orderBy: { createdAt: "desc" },
    });

    // Ringkasan semua periode.
    const allTransaksi = await db.transaksi.findMany();
    const ringkasanPerPeriode = new Map<
      string,
      { masuk: number; keluar: number }
    >();
    let totalMasuk = 0;
    let totalKeluar = 0;
    for (const t of allTransaksi) {
      const periode = t.periodeBulan;
      if (!ringkasanPerPeriode.has(periode)) {
        ringkasanPerPeriode.set(periode, { masuk: 0, keluar: 0 });
      }
      const r = ringkasanPerPeriode.get(periode)!;
      if (t.tipe === "MASUK") {
        r.masuk += t.nominal;
        totalMasuk += t.nominal;
      } else {
        r.keluar += t.nominal;
        totalKeluar += t.nominal;
      }
    }

    const periodeList = Array.from(ringkasanPerPeriode.entries())
      .map(([periode, r]) => ({ periode, ...r, saldo: r.masuk - r.keluar }))
      .sort((a, b) => b.periode.localeCompare(a.periode));

    const saldo = totalMasuk - totalKeluar;

    // Saldo per periode yang dipilih.
    let saldoPeriode: number | null = null;
    if (bulan) {
      const r = ringkasanPerPeriode.get(bulan);
      saldoPeriode = r ? r.masuk - r.keluar : 0;
    }

    return apiSuccess({
      transaksi: transaksi.map((t) => ({
        id: t.id,
        tipe: t.tipe,
        nominal: t.nominal,
        keterangan: t.keterangan,
        periodeBulan: t.periodeBulan,
        anggotaId: t.anggotaId,
        anggotaNama: t.anggota?.nama ?? null,
        strukId: t.strukId,
        createdAt: t.createdAt,
      })),
      ringkasanPerPeriode: periodeList,
      saldo,
      saldoPeriode,
    });
  } catch (err) {
    return apiUnexpected(err);
  }
}

// POST /api/transaksi - catat transaksi manual (Admin).
// nominal WAJIB integer positif, tanpa batasan step/kelipatan.
export async function POST(req: NextRequest) {
  try {
    const admin = await isAdmin();
    if (!admin) {
      return apiError(
        "AUTH_ERROR",
        "Akses ditolak. Hanya Admin yang dapat mencatat transaksi kas.",
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Data transaksi tidak valid.",
        {
          fields: Object.fromEntries(
            parsed.error.issues.map((i) => [String(i.path[0] ?? "_"), i.message])
          ),
        }
      );
    }

    const { tipe, nominal, keterangan, periodeBulan, anggotaId } = parsed.data;

    // Math.floor setelah validasi (per SPEC.md).
    const nominalFinal = Math.floor(nominal);

    try {
      const transaksi = await db.transaksi.create({
        data: {
          tipe,
          nominal: nominalFinal,
          keterangan: keterangan ?? null,
          periodeBulan,
          anggotaId: anggotaId ?? null,
        },
      });

      await db.auditLog.create({
        data: {
          aksi: "CREATE_TRANSAKSI",
          actorNama: "Bendahara",
          deskripsi: `Mencatat transaksi ${tipe} Rp ${nominalFinal.toLocaleString("id-ID")} periode ${periodeBulan}.`,
          refType: "Transaksi",
          refId: transaksi.id,
          detail: `tipe=${tipe}, nominal=${nominalFinal}`,
        },
      });

      return apiSuccess({
        id: transaksi.id,
        tipe: transaksi.tipe,
        nominal: transaksi.nominal,
      });
    } catch (dbErr) {
      const classified = classifyPrismaError(dbErr);
      return apiError(classified.category, classified.message, {
        cause: dbErr,
      });
    }
  } catch (err) {
    return apiUnexpected(err);
  }
}
