import type { Metadata } from "next";
import { Geist, Geist_Mono, Quantico } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const quantico = Quantico({
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-quantico",
});

export const metadata: Metadata = {
  title: "Bracket Central",
  description: "Bracket Central is your go-to platform for creating and managing tournament brackets.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${quantico.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
