import Link from "next/link";
import PricingPreview from "@/components/PricingPreview";

const FEATURES = [
  { icon: "✂️", title: "Podcast Clip", desc: "Transkrip asli, rekomendasi momen AI, auto potong, reframe, subtitle, caption, dan hashtag." },
  { icon: "🖼️", title: "Carousel Studio", desc: "AI menyusun alur, editor visual live, render PNG resolusi penuh, dan export ZIP." },
  { icon: "👄", title: "Remake + MuseTalk", desc: "Remake foto/video dengan audio baru atau true lipsync MuseTalk 1.5 melalui GPU worker." },
];

export default function Home() {
  return <main className="mx-auto max-w-5xl px-4">
    <header className="flex flex-wrap items-center justify-between gap-3 py-6"><Link href="/" className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand to-brand-accent">🎬</span><span className="font-extrabold">OtoPost <span className="text-brand-accent">Studio</span></span></Link><nav className="flex items-center gap-3 text-sm"><Link href="/pricing" className="text-slate-300">Harga</Link><Link href="/login" className="text-slate-300">Masuk</Link><Link href="/studio" className="rounded-xl bg-brand px-4 py-2 font-semibold">Buka Studio</Link></nav></header>
    <section className="py-16 text-center"><div className="mx-auto mb-4 w-fit rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs text-slate-300">Dari ide → aset konten siap publikasi</div><h1 className="mx-auto max-w-4xl text-4xl font-extrabold leading-tight sm:text-6xl">Satu studio untuk <span className="bg-gradient-to-r from-brand to-brand-accent bg-clip-text text-transparent">memproduksi konten</span> lebih cepat</h1><p className="mx-auto mt-5 max-w-2xl text-slate-400">Potong podcast, desain carousel, dan remake video dengan AI. Paket, kuota, serta menu dikelola dinamis dari admin panel.</p><div className="mt-8 flex justify-center gap-3"><Link href="/register" className="rounded-xl bg-gradient-to-r from-brand to-brand-accent px-6 py-3 text-sm font-semibold">Mulai Gratis →</Link><Link href="/studio" className="rounded-xl border border-white/15 px-6 py-3 text-sm font-semibold">Lihat Studio</Link></div></section>
    <section className="grid gap-4 sm:grid-cols-3">{FEATURES.map((feature) => <div key={feature.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"><div className="mb-3 text-3xl">{feature.icon}</div><h2 className="font-bold">{feature.title}</h2><p className="mt-2 text-sm leading-relaxed text-slate-400">{feature.desc}</p></div>)}</section>
    <section id="harga" className="py-16"><h2 className="mb-2 text-center text-2xl font-extrabold">Paket yang dapat diubah dari admin</h2><p className="mb-8 text-center text-sm text-slate-500">Harga, kredit, masa aktif, dan fitur berikut dibaca langsung dari database.</p><PricingPreview /></section>
    <footer className="border-t border-white/10 py-8 text-center text-xs text-slate-500">OtoPost Studio · Dibangun untuk kreator Indonesia</footer>
  </main>;
}
