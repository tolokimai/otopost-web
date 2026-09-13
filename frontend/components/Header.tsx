import Link from "next/link";

export default function Header() {
  return (
    <header className="flex items-center justify-between py-5">
      <Link href="/" className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand to-brand-accent text-sm">
          🎬
        </span>
        <span className="font-extrabold tracking-tight">
          OtoPost <span className="text-brand-accent">Studio</span>
        </span>
      </Link>
      <Link href="/" className="text-xs text-slate-400 hover:text-white">
        ← Beranda
      </Link>
    </header>
  );
}
