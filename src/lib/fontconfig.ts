import path from "node:path";

// Sharp memakai Fontconfig untuk mencari font ketika merasterisasi teks SVG.
// Function Linux Vercel tidak menyediakan config default, jadi gunakan config
// dan font project yang ikut dipaketkan khusus untuk endpoint generator struk.
if (process.platform === "linux" && !process.env.FONTCONFIG_PATH) {
  process.env.FONTCONFIG_PATH = path.join(
    process.cwd(),
    "assets",
    "fontconfig"
  );
}
