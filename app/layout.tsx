import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { BookingModalHost } from "@/components/booking/BookingModalHost";
import { QueryProvider } from "@/components/providers/query-provider";

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
  title: "Ealho Therapy",
  description: "AI-powered therapy booking and sessions for Nigeria",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        className={`min-h-full flex flex-col bg-white ${geistSans.className} text-[var(--figma-text)]`}
      >
        <QueryProvider>
          <BookingModalHost />
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
