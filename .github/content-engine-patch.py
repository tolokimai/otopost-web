#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace(path: str, old: str, new: str, count: int = 1) -> None:
    target = ROOT / path
    text = target.read_text(encoding="utf-8")
    found = text.count(old)
    if found != count:
        raise SystemExit(f"{path}: expected {count} occurrence(s), found {found}: {old[:100]!r}")
    target.write_text(text.replace(old, new, count), encoding="utf-8")


replace("backend/app/db/base.py", "    from . import models  # noqa: F401  pastikan model ter-register\n", "    from . import content_models, models  # noqa: F401  pastikan model ter-register\n")
replace("backend/app/db/base.py", "    with SessionLocal() as db:\n        seed_defaults(db)\n", "    with SessionLocal() as db:\n        seed_defaults(db)\n\n        from ..services.content_engine import seed_content_engine\n\n        seed_content_engine(db)\n")
replace("backend/app/main.py", "from .routers import admin, ai, auth, billing, carousel, clips, config, health, remake, transcript\n", "from .routers import (\n    admin,\n    ai,\n    auth,\n    billing,\n    carousel,\n    clips,\n    config,\n    content_library,\n    content_plans,\n    health,\n    personas,\n    remake,\n    transcript,\n)\n")
replace("backend/app/main.py", 'version="1.1.0"', 'version="1.2.0"')
replace("backend/app/main.py", "app.include_router(admin.router)\napp.include_router(carousel.router)\n", "app.include_router(admin.router)\napp.include_router(personas.router)\napp.include_router(content_plans.router)\napp.include_router(content_library.router)\napp.include_router(carousel.router)\n")

header_anchor = '''        <Link href="/pricing" className="text-slate-300 hover:text-white">
          Harga
        </Link>
'''
replace("frontend/components/Header.tsx", header_anchor, header_anchor + '''        {!loading && user ? (
          <>
            <Link href="/personas" className="text-slate-300 hover:text-white">Persona</Link>
            <Link href="/planner" className="text-slate-300 hover:text-white">Planner</Link>
            <Link href="/library" className="text-slate-300 hover:text-white">Library</Link>
          </>
        ) : null}
''')

fallback_anchor = "const FALLBACK: StudioMenu[] = [\n"
replace("frontend/app/studio/page.tsx", fallback_anchor, fallback_anchor + '''  { id: "persona", label: "Brand Persona", description: "Fondasi audiens, offer, tone, dan pilar konten.", icon: "🧬", href: "/personas", isEnabled: true, isReady: true, requiredPlan: "free", sortOrder: 1 },
  { id: "content-plan", label: "Content Planner", description: "Kalender konten AI 7/30 hari dari persona.", icon: "🗓️", href: "/planner", isEnabled: true, isReady: true, requiredPlan: "creator", sortOrder: 2 },
  { id: "content-library", label: "Content Library", description: "Review, approval, produksi, jadwal, dan hasil.", icon: "🗂️", href: "/library", isEnabled: true, isReady: true, requiredPlan: "free", sortOrder: 3 },
''')
replace("frontend/app/studio/page.tsx", "Produksi klip, carousel, dan remake dari satu tempat. Susunan serta akses menu dikendalikan admin tanpa redeploy.", "Mulai dari Persona, rencanakan konten, approve di Library, lalu produksi lewat workflow Studio. Susunan serta akses menu dikendalikan admin tanpa redeploy.")

carousel_anchor = '''  useEffect(() => {
    if (!user) return;
    api.carouselProjects().then((data) => setProjects(data.projects)).catch(() => undefined);
  }, [user]);
'''
replace("frontend/app/studio/carousel/page.tsx", carousel_anchor, '''  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const handoffTitle = params.get("title") || params.get("topic") || "";
    const hook = params.get("hook") || "";
    const brief = params.get("brief") || "";
    const cta = params.get("cta") || "";
    const targetAudience = params.get("audience") || "";
    if (handoffTitle) { setTitle(handoffTitle); setTopic(handoffTitle); }
    if (targetAudience) setAudience(targetAudience);
    if (handoffTitle || hook || brief || cta) {
      setSlides([
        { headline: hook || handoffTitle || "Hook utama", body: brief || "Jelaskan masalah utama audiens.", subtext: "HOOK" },
        { headline: handoffTitle || "Insight utama", body: brief || "Uraikan insight dan langkah praktis.", subtext: "INSIGHT" },
        { headline: cta || "Ajak audiens bertindak", body: "Sesuaikan penutup dan CTA sebelum render.", subtext: "CTA" },
      ]);
      setSlideCount(3);
    }
  }, []);

''' + carousel_anchor)

podcast_state = '  const [url, setUrl] = useState("");\n'
replace("frontend/app/studio/podcast/page.tsx", podcast_state, podcast_state + '  const [plannerBrief, setPlannerBrief] = useState("");\n')
podcast_effect = '''  useEffect(() => {
    if (requireAuth && !authLoading && !user) {
'''
replace("frontend/app/studio/podcast/page.tsx", podcast_effect, '''  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const topic = params.get("topic") || params.get("title") || "";
    const hook = params.get("hook") || "";
    const brief = params.get("brief") || "";
    if (topic || hook || brief) setPlannerBrief([topic, hook, brief].filter(Boolean).join(" · "));
  }, []);

''' + podcast_effect)
podcast_section = '''      <section className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="mb-1 text-lg font-bold">1 · Sumber Video</h2>
'''
replace("frontend/app/studio/podcast/page.tsx", podcast_section, '''      {plannerBrief ? (
        <div className="mb-4 rounded-xl border border-brand/30 bg-brand/10 p-4 text-sm">
          <div className="font-semibold text-brand-accent">Brief dari Content Library</div>
          <p className="mt-1 text-slate-300">{plannerBrief}</p>
        </div>
      ) : null}

''' + podcast_section)

remake_effect = '''  useEffect(() => {
    if (!loading && !user) router.replace("/login?next=/studio/remake");
'''
replace("frontend/app/studio/remake/page.tsx", remake_effect, '''  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const subtitle = [params.get("hook"), params.get("cta")].filter(Boolean).join("\\n\\n");
    if (subtitle) setSubtitleText(subtitle);
  }, []);

''' + remake_effect)

replace("docs/ROADMAP.md", "## Sistem Otomasi Konten — berikutnya\n- [ ] Persona CRUD + generator AI (brand, niche, audiens, tone, bahasa)\n- [ ] Content Plan 7/30 hari dan tombol kirim ke setiap Studio workflow\n- [ ] Content library + status draft/review/approved/scheduled/published/failed\n", "## Sistem Otomasi Konten — aktif\n- [x] Persona CRUD + generator AI (brand, niche, audiens, pain point, offer, tone, bahasa, pilar)\n- [x] Content Plan 7/30 hari dan handoff prefilled ke Studio workflow yang ready\n- [x] Content Library + status draft/review/approved/in_production/scheduled/published/failed\n- [x] Approval gate, ownership isolation, paket/feature gate, dan seed menu idempoten\n")

api_anchor = "## Podcast Clip\n"
replace("docs/API.md", api_anchor, '''## Content Engine
- `GET|POST /personas`
- `GET|PUT|DELETE /personas/{id}`
- `POST /personas/generate` — draft AI, 1 kredit setelah hasil valid
- `GET /content-plans`
- `POST /content-plans/generate` — kalender 7/30 hari, 1 kredit setelah hasil valid
- `GET|PUT|DELETE /content-plans/{id}`
- `GET|POST /content-library`
- `GET|PUT|DELETE /content-library/{id}`
- `POST /content-library/{id}/duplicate`
- `POST /content-library/{id}/handoff` — hanya status `approved`

Semua endpoint membutuhkan JWT dan dibatasi ke data milik pengguna. Handoff memeriksa ulang enablement, readiness, dan paket minimum workflow tujuan di server.

''' + api_anchor)

print("Content Engine integration patch applied")
