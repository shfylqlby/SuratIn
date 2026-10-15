import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import { appConfig } from "@/lib/config";
import "./globals.css";

const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(appConfig.appUrl),
  title: {
    default: `${appConfig.name}: urus surat kelurahan tanpa antre`,
    template: `%s · ${appConfig.name}`,
  },
  description:
    "Ajukan SKTM, domisili, keterangan penghasilan orang tua, pengantar SKCK, dan izin keramaian dari rumah. Diperiksa RT/RW lalu kelurahan, PDF bertanda tangan elektronik, dan keasliannya bisa dicek lewat QR.",
};

export const viewport: Viewport = {
  themeColor: "#123b45",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${montserrat.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
