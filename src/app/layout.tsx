import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { SplashProvider } from "@/components/splash-provider";
import { AppShell } from "@/components/app-shell";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "HTN Legacy - Sistem Iuran & Kas Organisasi",
  description:
    "Sistem internal pencatatan iuran, receipt pembayaran, kas organisasi, laporan, dan audit log.",
  icons: {
    // Ikon tab browser: pakai favicon.ico yang sudah disiapkan. Tidak boleh
    // memakai logo.svg (3 MB) karena browser menolak atau gagal memuatnya
    // dalam waktu wajar, sehingga platform deployment menampilkan ikon bawaan.
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/assets/logo.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      { url: "/assets/logo.png", sizes: "512x512", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${jakarta.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SplashProvider>
            <AppShell>{children}</AppShell>
          </SplashProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
