import type { Metadata } from "next";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
 title: "BugHub",
 description: "收集、分类、复盘每一个踩过的 bug，慢慢积累成自己的经验库。",
 metadataBase: new URL("https://bughub.vip"),
 openGraph: {
 title: "BugHub",
 description: "收集、分类、复盘每一个踩过的 bug。",
 url: "https://bughub.vip",
 siteName: "BugHub",
 type: "website",
 },
};

export default function RootLayout({
 children,
}: {
 children: React.ReactNode;
}) {
 return (
 <html lang="zh-CN">
 <body className="flex min-h-screen flex-col">
 <SiteHeader />
 <main className="flex-1">{children}</main>
 <SiteFooter />
 </body>
 </html>
 );
}
