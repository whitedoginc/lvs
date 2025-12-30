import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Transcript Vault",
  description: "A personal knowledge base for storing, processing, and searching conversation transcripts",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
