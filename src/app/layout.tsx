import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OilChanger",
  description: "Oil-change shop SaaS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="az">
      <body>{children}</body>
    </html>
  );
}
