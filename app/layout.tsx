import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "MM-Kisa",
  description: "EM-kisa veikkaus app",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fi">
      <body>
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
