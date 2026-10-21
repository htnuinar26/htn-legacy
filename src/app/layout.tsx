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
  title: "HTN Legacy — Sistem Iuran & Kas Organisasi",
  description:
    "Sistem internal pencatatan iuran, receipt pembayaran, kas organisasi, laporan, dan audit log.",
  icons: {
    icon: "/logo.svg",
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
