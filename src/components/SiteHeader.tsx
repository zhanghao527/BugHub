"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/Logo";

const NAV = [{ href: "/", label: "首页" }];

export default function SiteHeader() {
 const pathname = usePathname();
 return (
 <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur">
 <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-5">
 <Link href="/" className="flex items-center gap-2.5">
 <Logo size={30} />
 <span className="text-[17px] font-semibold tracking-tight text-gray-900">BugHub</span>
 </Link>
 <nav className="flex items-center gap-1 text-sm">
 {NAV.map((item) => {
 const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
 return (
 <Link key={item.href} href={item.href} className={"rounded-md px-3 py-1.5 font-medium transition-colors " + (active ? "bg-brand-light text-brand" : "text-gray-600 hover:bg-gray-100")}>
 {item.label}
 </Link>
 );
 })}
 </nav>
 </div>
 </header>
 );
}
