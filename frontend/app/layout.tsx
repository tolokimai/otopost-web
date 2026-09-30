import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "AutoPost Studio — AI Social Media Auto-Pilot & Creator OS",
  description:
    "Replikasi lengkap AutoPost Studio: AI Auto-Pilot, Carousel Studio, Podcast Clip Extractor & Wav2Lip Remake Studio.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen antialiased bg-[#0b0e14] text-[#e7ecf3]">
        <AuthProvider>
          <div className="flex min-h-screen flex-col lg:flex-row">
            <Sidebar />
            <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
              {children}
            </div>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
