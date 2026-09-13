import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";

export const metadata: Metadata = {
  title: "OtoPost Studio — AI Podcast Clipper",
  description:
    "Ubah 1 video podcast jadi puluhan klip viral siap posting. Otomatis: transkrip, temukan momen viral, potong & reframe 9:16 + subtitle.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
