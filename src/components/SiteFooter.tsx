export default function SiteFooter() {
 return (
 <footer className="border-t border-gray-200 bg-white">
 <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-1 px-5 py-5 text-xs text-gray-400 sm:flex-row">
 <span>bughub.vip · BUG 库</span>
 <span>收集与复盘每一个踩过的 bug · {new Date().getFullYear()}</span>
 </div>
 </footer>
 );
}
