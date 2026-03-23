import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Aussie AI Agency Portal",
  description:
    "AI-powered receptionist platform for Australian businesses. Handle bookings, FAQs, and lead capture 24/7.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} font-sans antialiased bg-navy-500 text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
