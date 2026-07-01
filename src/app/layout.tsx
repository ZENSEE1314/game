import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Idle War — Forge, Recruit, Conquer",
  description:
    "A dark-fantasy idle-strategy game. Gather resources, refine at the forge, recruit troops, and raid rival warlords in the Arena.",
  keywords: [
    "Idle War",
    "idle game",
    "strategy game",
    "PvP",
    "Next.js",
    "TypeScript",
    "Tailwind CSS",
    "shadcn/ui",
  ],
  authors: [{ name: "Idle War" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Idle War",
    description: "Forge, recruit, and conquer in this dark-fantasy idle strategy game.",
    siteName: "Idle War",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Idle War",
    description: "Forge, recruit, and conquer in this dark-fantasy idle strategy game.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-stone-950 text-stone-100`}
        suppressHydrationWarning
      >
        {children}
        <Toaster />
        <Sonner richColors position="top-center" theme="dark" />
      </body>
    </html>
  );
}
