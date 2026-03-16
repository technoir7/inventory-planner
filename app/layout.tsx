import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AppShell } from "@/components/nav";

export const metadata: Metadata = {
  title: "Inventory Planner",
  description: "Dependent-demand inventory planning for skincare manufacturing"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
