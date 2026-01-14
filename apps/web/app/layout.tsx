import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EmailOps",
  description: "Self-hosted email platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50">
          <nav className="bg-white border-b px-6 py-4">
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-indigo-600">
                EmailOps
              </span>
              <div className="space-x-4 text-sm text-gray-600">
                <a href="/single-sends">Single sends</a>
                <a href="/journeys">Journeys</a>
                <a href="/segments">Segments</a>
                <a href="/templates">Templates</a>
                <a href="/data-connectors">Data connectors</a>
                <a href="/email-connectors">Email connectors</a>
                <a href="/sender-profiles">Sender profiles</a>
              </div>
            </div>
          </nav>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
