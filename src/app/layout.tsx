import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nonprofit CRM Admin",
  description: "Admin-only donor and gift management"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
