import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiSuccess, apiError, apiUnexpected } from "@/lib/api-response";
import { isAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { getSignedUrl } from "@/lib/storage";
import { isTertunggak } from "@/lib/format";

// GET /api/laporan - data laporan per periode (Admin).
// Query: ?bulan=YYYY-MM (default: periode berjalan)
export async function GET(req: NextRequest) {
  try {
    const admin = await isAdmin();
    if (!admin) {
      return apiError(
        "AUTH_ERROR",
        "Akses ditolak. Hanya Admin yang dapat melihat laporan.",
        { status: 403 }
      );
    }

    const settings = await getSettings();
    const { searchParams } = new URL(req.url);
    const bulan = searchParams.get("bulan") ?? settings.periodeBerjalan;

    const [transaksi, strukApproved, anggota] = await Promise.all([
      db.transaksi.findMany({
        where: { periodeBulan: bulan },
        include: { anggota: true, struk: true },
        orderBy: { createdAt: "desc" },
      }),
      db.struk.findMany({
        where: { periodeBulan: bulan, status: "APPROVED" },
        include: { anggota: true },
        orderBy: { createdAt: "desc" },
      }),
      db.anggota.findMany({ orderBy: { nama: "asc" } }),
    ]);

    const masuk = transaksi
      .filter((t) => t.tipe === "MASUK")
      .reduce((s, t) => s + t.nominal, 0);
    const keluar = transaksi
      .filter((t) => t.tipe === "KELUAR")
      .reduce((s, t) => s + t.nominal, 0);

    // Status pembayaran anggota bersifat siklus bulanan dan `statusBayar`
    // hanya menyimpan status periode berjalan. Untuk laporan periode
    // berjalan, pakai `statusBayar` plus deadline. Untuk periode lampau,
    // status dihitung dari receipt APPROVED pada periode tersebut, supaya
    // laporan bulan lalu tidak menampilkan status bulan ini.
    const periodeBerjalan = settings.periodeBerjalan;
    let lunas: number;
    let belumLunas: number;
    let tertunggak: number;

    if (bulan === periodeBerjalan) {
      lunas = anggota.filter((a) => a.statusBayar === "LUNAS").length;
      belumLunas = anggota.filter(
        (a) => a.statusBayar === "BELUM_LUNAS" && !isTertunggak(a.statusBayar, settings.deadlineTanggal)
      ).length;
      tertunggak = anggota.filter((a) =>
        isTertunggak(a.statusBayar, settings.deadlineTanggal)
      ).length;
    } else {
      const anggotaLunas = new Set(strukApproved.map((s) => s.anggotaId));
      lunas = anggotaLunas.size;
      belumLunas = Math.max(anggota.length - lunas, 0);
      // Riwayat tenggat deadline tidak disimpan per periode, jadi untuk
      // periode lampau hanya ada dua status: lunas dan belum lunas.
      tertunggak = 0;
    }

    return apiSuccess({
      periodeBulan: bulan,
      ringkasan: {
        masuk,
        keluar,
        saldo: masuk - keluar,
        totalTransaksi: transaksi.length,
        strukApproved: strukApproved.length,
        lunas,
        belumLunas,
        tertunggak,
        totalAnggota: anggota.length,
      },
      transaksi: transaksi.map((t) => ({
        id: t.id,
        tipe: t.tipe,
        nominal: t.nominal,
        keterangan: t.keterangan,
        anggotaNama: t.anggota?.nama ?? null,
        strukId: t.strukId,
        createdAt: t.createdAt,
      })),
      strukApproved: await Promise.all(strukApproved.map(async (s) => ({
        id: s.id,
        anggotaNama: s.anggota.nama,
        nominal: s.nominal,
        url: await getSignedUrl(s.filePath),
        createdAt: s.createdAt,
      }))),
    });
  } catch (err) {
    return apiUnexpected(err, "/api/laporan");
  }
}
