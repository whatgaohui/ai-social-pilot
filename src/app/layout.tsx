import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ToastProvider } from "@/components/toast-provider";
import { ErrorBoundary } from "@/components/error-boundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "朋友圈AI运营助手 - 个人IP打造神器",
  description: "专为打造个人IP、高效运营朋友圈设计的AI助手。全自动规划、生成、优化30天朋友圈内容。",
  keywords: ["朋友圈", "AI运营", "个人IP", "内容规划", "文案生成"],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {/* Skip navigation link — WCAG 2.1 AA */}
        <a href="#main-content" className="skip-nav">
          跳到主要内容
        </a>
        <ToastProvider>
          <ErrorBoundary sectionName="应用根节点">
            {children}
          </ErrorBoundary>
        </ToastProvider>
        <Toaster />
        <SonnerToaster
          position="top-right"
          richColors
          closeButton
          duration={3000}
          toastOptions={{
            classNames: {
              toast: "sonner-toast",
              success: "sonner-toast-success",
              error: "sonner-toast-error",
              warning: "sonner-toast-warning",
              info: "sonner-toast-info",
            },
          }}
        />
      </body>
    </html>
  );
}
