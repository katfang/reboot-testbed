import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import RebootContext from "./RebootContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cheaoss",
  description: "Chess with more Chaos added",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <RebootContext>{children}</RebootContext>
      </body>
    </html>
  );
}
