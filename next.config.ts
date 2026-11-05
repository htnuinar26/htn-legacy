import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: {
    "/api/admin/struk-generator": [
      "./assets/fontconfig/*",
      "./assets/fonts/plus-jakarta-sans/*.ttf",
    ],
  },
  // Pengecekan tipe error TIDAK boleh dilewati. `bunx tsc --noEmit` dan
  // `bun run build` adalah gate wajib sesuai SPEC.md bagian "Validasi Lokal",
  // jadi build harus gagal kalau ada error tipe.
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: true,
};

export default nextConfig;
