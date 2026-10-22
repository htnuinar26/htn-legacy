import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiSuccess, apiError, apiUnexpected } from "@/lib/api-response";
import { getMemberSession, isAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { currentPeriod, formatRupiah } from "@/lib/format";

// GET /api/dashboard - statistik ringkasan.
// Anggota: stats pribadi. Admin: stats organisasi.
export async function GET(_req: NextRequest) {
  try {
    const [member, admin] = await Promise.all([getMemberSession(), isAdmin()]);
    const settings = await getSettings();
    const periode = settings.periodeBerjalan;

    if (admin) {
      // Dashboard admin.
      const [totalAnggota, lunas, belumLunas, tertunggak, pendingStruk, approvedStruk, transaksiPeriode] =
        await Promise.all([
          db.anggota.count(),
          db.anggota.count({ where: { statusBayar: "LUNAS" } }),
          db.anggota.count({ where: { statusBayar: "BELUM_LUNAS" } }),
          db.anggota.count({ where: { statusBayar: "TERTUNGGAK" } }),
          db.struk.count({ where: { status: "PENDING" } }),
          db.struk.count({ where: { status: "APPROVED", periodeBulan: periode } }),
          db.transaksi.findMany({ where: { periodeBulan: periode } }),
        ]);

      const masukPeriode = transaksiPeriode
        .filter((t) => t.tipe === "MASUK")
        .reduce((sum, t) => sum + t.nominal, 0);
      const keluarPeriode = transaksiPeriode
        .filter((t) => t.tipe === "KELUAR")
        .reduce((sum, t) => sum + t.nominal, 0);

      // Saldo total.
      const allTransaksi = await db.transaksi.findMany();
      const saldoTotal =
        allTransaksi
          .filter((t) => t.tipe === "MASUK")
          .reduce((s, t) => s + t.nominal, 0) -
        allTransaksi
          .filter((t) => t.tipe === "KELUAR")
          .reduce((s, t) => s + t.nominal, 0);

      return apiSuccess({
        role: "admin",
        periodeBerjalan: periode,
        nominalIuran: settings.nominalIuran,
        stats: {
          totalAnggota,
          lunas,
          belumLunas,
          tertunggak,
          pendingStruk,
          approvedStruk,
          masukPeriode,
          keluarPeriode,
          saldoPeriode: masukPeriode - keluarPeriode,
          saldoTotal,
        },
      });
    }

    if (member) {
      // Dashboard anggota.
      const anggota = await db.anggota.findUnique({
        where: { id: member.anggotaId },
      });
      if (!anggota) {
        return apiError("NOT_FOUND", "Data anggota tidak ditemukan.", {
          fields: { _: "Anggota tidak ada" },
        });
      }

      const strukList = await db.struk.findMany({
        where: { anggotaId: member.anggotaId },
        orderBy: { createdAt: "desc" },
        take: 5,
      });

      const myTransaksi = await db.transaksi.findMany({
        where: { anggotaId: member.anggotaId },
        orderBy: { createdAt: "desc" },
        take: 5,
      });

      return apiSuccess({
        role: "anggota",
        periodeBerjalan: periode,
        nominalIuran: settings.nominalIuran,
        deadlineTanggal: settings.deadlineTanggal,
        anggota: {
          id: anggota.id,
          nama: anggota.nama,
          statusBayar: anggota.statusBayar,
          periodeBerjalan: anggota.periodeBerjalan,
        },
        strukTerbaru: strukList.map((s) => ({
          id: s.id,
          periodeBulan: s.periodeBulan,
          status: s.status,
          nominal: s.nominal,
          createdAt: s.createdAt,
        })),
        transaksiTerbaru: myTransaksi.map((t) => ({
          id: t.id,
          tipe: t.tipe,
          nominal: t.nominal,
          keterangan: t.keterangan,
          periodeBulan: t.periodeBulan,
          createdAt: t.createdAt,
        })),
      });
    }

    return apiError("AUTH_ERROR", "Sesi tidak ditemukan. Silakan login kembali.", {
      status: 401,
    });
  } catch (err) {
    return apiUnexpected(err);
  }
}

// Hilangkan warning unused import.
void currentPeriod;
void formatRupiah;
