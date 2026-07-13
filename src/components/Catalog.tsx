"use client";
import { useState } from "react";
import Link from "next/link";
import type { CatalogL1, CatalogL2, CatalogBug } from "@/lib/data";

const LIMIT = 12;

export default function Catalog({ data }: { data: CatalogL1[] }) {
 if (!data || data.length === 0) {
 return (
 <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center text-sm text-gray-400">题库还没有内容。</div>
 );
 }
 return <div className="space-y-6">{data.map((c1) => (<Sec key={c1.id} c1={c1} />))}</div>;
}

function Sec({ c1 }: { c1: CatalogL1 }) {
 const [o, setO] = useState(false);
 return (
 <div>
 <button onClick={() => setO((v) => !v)} className="flex w-full items-center gap-2 text-left">
 <Chev o={o} />
 <span className="text-[15px] font-bold text-gray-900">{c1.name}</span>
 <span className="ml-1 font-mono text-xs text-gray-500">{c1.count}</span>
 </button>
 {o ? (<div className="ml-[7px] mt-2 space-y-3 border-l border-gray-300 pl-5">{c1.directBugs.length > 0 ? <Rows bugs={c1.directBugs} /> : null}{c1.children.map((c2) => (<Sub key={c2.id} c2={c2} />))}</div>) : null}
 </div>
 );
}

function Sub({ c2 }: { c2: CatalogL2 }) {
 const [o, setO] = useState(false);
 return (
 <div>
 <button onClick={() => setO((v) => !v)} className="flex w-full items-center gap-1.5 text-left">
 <Chev o={o} small />
 <span className="text-sm font-semibold text-gray-800">{c2.name}</span>
 <span className="ml-1 font-mono text-xs text-gray-500">{c2.bugs.length}</span>
 </button>
 {o ? (<div className="mt-1 pl-5"><Rows bugs={c2.bugs} /></div>) : null}
 </div>
 );
}

function Rows({ bugs }: { bugs: CatalogBug[] }) {
 const [showAll, setShowAll] = useState(false);
 const numWidth = `${String(bugs.length).length + 1}ch`;
 const visible = showAll ? bugs : bugs.slice(0, LIMIT);
 const rest = bugs.length - LIMIT;
 return (
 <ul className="space-y-0.5">
 {visible.map((b, i) => (
 <li key={b.slug}>
 <Link href={`/bug/${b.slug}`} className="group flex items-center gap-3 py-1">
 <span className="shrink-0 text-right font-mono text-xs tabular-nums text-gray-400" style={{ width: numWidth }}>{i + 1}.</span>
 <span className="flex-1 truncate text-[15px] text-gray-800 group-hover:text-brand">{b.title}</span>
 </Link>
 </li>
 ))}
 {rest > 0 ? (
 <li>
 <button onClick={() => setShowAll((v) => !v)} className="mt-1 py-1 text-xs font-medium text-brand hover:underline" style={{ paddingLeft: `calc(${numWidth} + 0.75rem)` }}>
 {showAll ? "收起" : `展开剩余 ${rest} 个 →`}
 </button>
 </li>
 ) : null}
 </ul>
 );
}

function Chev({ o, small }: { o: boolean; small?: boolean }) {
 return (<svg className={(small ? "h-3 w-3 " : "h-3.5 w-3.5 ") + "shrink-0 text-gray-500 transition-transform " + (o ? "rotate-90" : "")} viewBox="0 0 20 20" fill="currentColor"><path d="M7 4l7 6-7 6z" /></svg>);
}
