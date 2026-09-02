import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GuestFollow | 宿泊施設向け 予約・ゲスト管理クラウド",
  description: "Beds24・Airhostから予約を自動同期。宿泊者名簿・セルフチェックイン・アンケート・ゲストメッセージに加え、売上レポート・宿泊実績報告（民泊法第14条）・宿泊税計算まで一元化する宿泊施設向けクラウドサービス。旅館業法改正に標準対応。",
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
