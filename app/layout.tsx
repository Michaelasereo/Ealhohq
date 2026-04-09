import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { BookingModalHost } from "@/components/booking/BookingModalHost";
import { BurnoutFreebieModalHost } from "@/components/burnout/BurnoutFreebieModalHost";
import { GlobalFetchProgress } from "@/components/providers/global-fetch-progress";
import { QueryProvider } from "@/components/providers/query-provider";
import { Toaster } from "sonner";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ??
  "https://ealho.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Ealho Therapy",
  description: "AI-powered therapy booking and sessions for Nigeria",
  icons: {
    icon: [
      { url: "/favicon-ealho.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-ealho.png", type: "image/png", sizes: "any" },
    ],
    apple: [{ url: "/favicon-ealho.png", type: "image/png" }],
    shortcut: "/favicon-ealho.png",
  },
  openGraph: {
    title: "Ealho Therapy",
    description: "AI-powered therapy booking and sessions for Nigeria",
    url: "/",
    siteName: "Ealho Therapy",
    locale: "en_NG",
    type: "website",
    images: [
      {
        url: "/favicon-ealho.png",
        alt: "Ealho Therapy",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Ealho Therapy",
    description: "AI-powered therapy booking and sessions for Nigeria",
    images: ["/favicon-ealho.png"],
  },
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
          <GlobalFetchProgress />
          <Toaster position="bottom-center" richColors />
          <BookingModalHost />
          <BurnoutFreebieModalHost />
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
