import Link from "next/link";

const FEATURES = [
  {
    icon: "🎯",
    title: "Deteksi Momen Viral",
    desc: "AI membaca transkrip asli & menandai semua bagian paling berpotensi viral sepanjang video.",
  },
  {
    icon: "✂️",
    title: "Auto Potong & Reframe",
    desc: "Potong otomatis + reframe 9:16 mengikuti wajah pembicara. Siap Reels, TikTok, Shorts.",
  },
  {
    icon: "💬",
    title: "Subtitle + Caption AI",
    desc: "10 gaya subtitle burn-in, plus hook, caption & hashtag dibuat otomatis tiap klip.",
  },
];

const PLANS = [
  { name: "Free", price: "Rp0", items: ["3 video / bulan", "Export 720p", "Watermark"], highlight: false },
  {
    name: "Creator",
    price: "Rp99rb",
    items: ["30 video / bulan", "Export 1080p", "Tanpa watermark", "Semua gaya subtitle"],
    highlight: true,
  },
  {
    name: "Pro",
    price: "Rp249rb",
    items: ["Video unlimited", "Render prioritas", "Caption AI penuh", "Dukungan cepat"],
    highlight: false,
  },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-4">
      <header className="flex items-center justify-between py-6">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand to-brand-accent text-sm">
            🎬
          </span>
          <span className="font-extrabold tracking-tight">
            OtoPost <span className="text-brand-accent">Studio</span>
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/login" className="text-slate-300 hover:text-white">
            Masuk
          </Link>
          <Link href="/studio" className="rounded-xl bg-brand px-4 py-2 font-semibold text-white">
            Buka Studio
          </Link>
        </div>
      </header>

      <section className="py-16 text-center">
        <div className="mx-auto mb-4 w-fit rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs text-slate-300">
          Ubah 1 podcast → puluhan klip viral
        </div>
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl">
          Mesin{" "}
          <span className="bg-gradient-to-r from-brand to-brand-accent bg-clip-text text-transparent">
            klip viral
          </span>{" "}
          otomatis untuk kreator
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-slate-400">
          Tempel link YouTube, AI temukan momen terbaik, potong & reframe 9:16 lengkap subtitle +
          caption. Semua dikerjakan di server.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/register"
            className="rounded-xl bg-gradient-to-r from-brand to-brand-accent px-6 py-3 text-sm font-semibold text-white"
          >
            Mulai Gratis →
          </Link>
          <a href="#harga" className="rounded-xl border border-white/15 px-6 py-3 text-sm font-semibold">
            Lihat Harga
          </a>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-2 text-2xl">{f.icon}</div>
            <div className="mb-1 font-bold">{f.title}</div>
            <div className="text-sm text-slate-400">{f.desc}</div>
          </div>
        ))}
      </section>

      <section id="harga" className="py-16">
        <h2 className="mb-8 text-center text-2xl font-extrabold">Harga sederhana, siap langganan</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`rounded-2xl border p-6 ${
                p.highlight ? "border-brand bg-brand/10" : "border-white/10 bg-white/[0.03]"
              }`}
            >
              <div className="text-sm text-slate-400">{p.name}</div>
              <div className="mt-1 text-3xl font-extrabold">
                {p.price}
                <span className="text-sm font-normal text-slate-500">/bln</span>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-slate-300">
                {p.items.map((it) => (
                  <li key={it}>✓ {it}</li>
                ))}
              </ul>
              <Link
                href="/register"
                className={`mt-6 block rounded-xl px-4 py-2 text-center text-sm font-semibold ${
                  p.highlight ? "bg-brand text-white" : "border border-white/15"
                }`}
              >
                Pilih {p.name}
              </Link>
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-slate-500">
          Login & simpan API key Gemini sendiri sudah aktif. Pembayaran (Midtrans/Xendit) menyusul.
        </p>
      </section>

      <footer className="border-t border-white/10 py-8 text-center text-xs text-slate-500">
        OtoPost Studio · Dibangun untuk kreator Indonesia
      </footer>
    </main>
  );
}
