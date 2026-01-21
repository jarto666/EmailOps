import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Sidebar } from "./components/sidebar";
import { ToastProvider } from "@/components/toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EmailOps",
  description: "SQL-first email orchestration platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <ToastProvider>
          <Sidebar />
          <main className="main-content">
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}
