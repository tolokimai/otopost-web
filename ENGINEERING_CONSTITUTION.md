# Konstitusi Engineering SaaS 🔥

<aside>
⚖️

Konstitusi engineering untuk produk SaaS. Dokumen ini adalah sumber aturan fundamental; aturan khusus AI ada di `AGENTS.md`, detail domain ada di `docs/`.

</aside>

## Prinsip utama

AI boleh cepat menulis kode, tetapi tidak boleh bebas menentukan arsitektur. Optimalkan codebase untuk manusia yang akan merawatnya bertahun-tahun kemudian. **Rule 0: jangan menambah kompleksitas tanpa alasan bisnis atau teknis yang jelas.** Konstitusi ini memprioritaskan aturan yang dapat dijalankan dan diverifikasi, bukan menambah aturan demi terlihat enterprise. Gunakan modular monolith yang disiplin sebelum microservices; scale with evidence.

**Aturan adalah default, bukan dogma.** Setiap aturan di dokumen ini berlaku sebagai default yang harus diikuti. Pengecualian diperbolehkan bila memang tidak cocok untuk kasus tertentu, dengan syarat tercatat: apa yang dikecualikan, mengapa, sampai kapan (bila relevan), dan siapa yang menyetujui. Pengecualian yang tidak terdokumentasi dianggap pelanggaran.

## 1. Struktur project dan ownership

- Kode dilarang ditulis langsung di root. Root hanya untuk file project-level seperti `README.md`, `AGENTS.md`, `.env.example`, lockfile, dan konfigurasi utama.
- Struktur wajib berbasis fitur/domain, bukan tumpukan global `controllers/`, `models/`, `services/`, `templates/`, dan `static/` tanpa boundary.
- Setiap fitur/domain mempunyai satu owner module dan home yang jelas. Kode AWE tidak boleh tersebar di `utils/`, `helpers/`, atau `misc/` tanpa alasan terdokumentasi.
- Setiap critical system, database, external integration, dan critical workflow memiliki human owner serta backup owner. Module biasa cukup memiliki satu owner yang jelas; backup owner ditambahkan bila operational risk membutuhkannya. AI bukan owner dan tidak menggantikan tanggung jawab eskalasi.
- Satu fitur = satu logical/domain boundary dan satu ownership yang jelas, meskipun implementasinya melintasi beberapa technical layer. Menu AWE seperti Kelola Data, Knowledge Base, Pengguna, Analytics, dan Pengaturan tidak digabung dalam satu file ribuan baris.
- Contoh struktur:

```
project/
├── app/
│   ├── awe/
│   ├── auth/
│   ├── billing/
│   ├── user/
│   ├── admin/
│   └── core/
├── db/
│   ├── migrations/
│   ├── models/
│   └── repositories/
├── frontend/
│   ├── components/
│   ├── css/
│   ├── js/
│   └── themes/
├── templates/
├── i18n/
├── prompt/
├── config/
├── docs/adr/
├── tests/
├── .env.example
├── .gitignore
├── AGENTS.md
└── README.md
```

- HTML, CSS, dan JavaScript harus terpisah.
- Setiap feature memiliki ownership dan boundary yang jelas; komponen yang digunakan memiliki naming dan hubungan yang konsisten. Jangan membuat layer/file hanya untuk memenuhi pola penamaan. Jika ada `templates/awe_kelola.html`, komponen terkait dapat berupa `app/awe/awe_kelola.py`, `awe_kelola.js`, `awe_kelola.css`, dan `tests/test_awe_kelola.py` sesuai kebutuhan.
- Layer standar bila digunakan: route `awe_kelola.py`, template `awe_kelola.html`, JS `awe_kelola.js`, CSS `awe_kelola.css`, service `awe_service.py`, repository `awe_repository.py`, schema `awe_schema.py`, test `test_awe_kelola.py`.
- Dilarang membuat file duplikat seperti `utils2.py`, `helper_final.py`, `new_service.py`, `temporary.py`, `fix_awe.py`, `awe_new.py`, `awe_v2.py`, `awe_final.py`, atau `awe_backup.py`.
- Sebelum membuat file, function, atau component baru: cari implementasi lama → reuse → extend → refactor → baru create.
- Production source file tidak boleh melebihi 400 baris. Jika melebihi, file wajib dipecah berdasarkan responsibility/domain, bukan dipotong secara asal. Exception hanya boleh dilakukan dengan alasan yang terdokumentasi.
- Satu function = satu responsibility. Pecah validasi, autentikasi, otorisasi, query, transformasi, AI call, penyimpanan, notifikasi, logging, dan response.

## 2. Layer dan dependency direction

- Route/controller harus tipis: menerima request, validasi bentuk dasar, authorization, memanggil service, lalu mengembalikan response.
- Business logic tidak boleh berada di frontend atau route.
- Alur standar: `Frontend → Route/Controller → Service/Application → Domain → Repository → Database`. Layer yang tidak diperlukan boleh dilewati jika tidak menambah nilai, tetapi dependency direction dan boundary tetap harus dipertahankan.
- Core tidak boleh bergantung pada feature. Dependency harus mengalir satu arah: Presentation → Application → Domain → Infrastructure.
- Tidak boleh ada circular dependency. Jika A → B → C → A, hentikan dan refactor.
- HTML hanya presentation, JS hanya interaction, route hanya HTTP, service/domain business logic, repository data access, database persistence.
- Side effect harus eksplisit. Function bernama `get`, `read`, `list`, atau sejenisnya tidak boleh diam-diam melakukan mutation. Database write, external API call, queue dispatch, email, file modification, dan perubahan state harus mudah ditelusuri dari code dan contract function.
- External service seperti AI provider, payment gateway, email provider, object storage, dan third-party API harus diakses melalui integration/provider boundary yang jelas. Business logic tidak boleh tersebar dengan ketergantungan langsung pada SDK provider tanpa alasan yang terdokumentasi.
- Satu perubahan besar atau satu PR harus memiliki satu tujuan/logical change. Pisahkan feature fix dari refactoring besar.

## 3. Database dan data safety

- Database infrastructure dan migration berada di `db/`: connection, engine/session, dan `db/migrations/`. Repository dan model boleh berada terpusat di `db/` atau dekat feature/domain (misalnya `app/billing/repository.py`) jika itu meningkatkan ownership dan cohesion. Pilih satu pola dan konsisten di seluruh project; akses database tetap harus melalui boundary data-access yang jelas.
- Database hanya boleh diakses melalui database layer/repository. Jangan menyebarkan `db.execute(...)` atau SQL ke seluruh project.
- Semua perubahan schema wajib melalui migration yang dapat direplikasi dari development → staging → production. Dilarang mengubah production secara manual.
- Migration destructive tidak boleh menjadi default. Untuk rename/remove: add new column → dual write → migrate data → switch reads → verify → remove old column.
- Query besar wajib mempertimbangkan pagination, index, `EXPLAIN`, join/eager loading, query profiling, dan cache bila relevan. Hindari N+1 query.
- Pagination, search, filter, dan sort harus server-side untuk dataset besar. Jangan mengunduh ratusan ribu record lalu memfilter di browser.
- Jika multi-tenant, setiap data bisnis memiliki `tenant_id`; repository selalu memakai konteks tenant. Data global harus dinyatakan eksplisit.
- Jangan percaya ID/role dari frontend. Backend menentukan current user → current tenant → resource → authorization.
- Backup wajib otomatis, memiliki retention, restore test, disaster recovery procedure, dan rollback plan. Backup yang belum pernah direstore belum terbukti.
- Operasi yang membutuhkan atomicity harus memiliki transaction boundary yang jelas. Contoh order, payment record, dan inventory update harus sukses atau gagal sebagai satu unit.
- Operasi yang memodifikasi shared state wajib mempertimbangkan concurrency, race condition, transaction isolation, locking, atau optimistic concurrency. Jangan memakai pola `read()` → `modify()` → `save()` tanpa analisis pada data concurrent.
- Setiap cache wajib memiliki TTL/invalidation strategy, source of truth, dan perilaku saat cache mati. Cache tidak boleh menjadi satu-satunya penyimpanan data penting.
- Query yang sering digunakan pada tabel besar harus memiliki execution plan yang dievaluasi dan index yang sesuai. Hindari index berlebihan karena menambah write dan storage cost.
- Migration production harus sebisa mungkin backward-compatible selama rolling deployment. Setiap migration kritis memiliki strategi rollback atau forward-fix yang terdokumentasi; rollback database tidak selalu cukup dengan `down()`.
- Setiap kategori data penting memiliki kebijakan retention, archival, dan deletion sesuai kebutuhan bisnis, legal, dan security. Tentukan pula apakah domain memakai hard delete, soft delete, atau archival.
- Strategi timestamp/timezone dan identifier (misalnya UUID, ULID, atau integer) ditentukan terpusat dan konsisten. Timestamp internal memakai strategi timezone yang jelas, biasanya UTC sebagai canonical storage.

## 4. API, error, configuration, dan security

- Semua API memiliki contract request/response/error yang konsisten.
- API request dan response wajib memiliki schema yang dapat divalidasi otomatis. Perubahan schema yang breaking harus terdeteksi oleh contract test/CI sebelum merge. Schema boleh inline atau memakai schema bersama sesuai kompleksitas endpoint; jangan membuat lapisan abstraksi tambahan hanya untuk memenuhi aturan ini.
- Pagination API distandarkan lintas module, misalnya `?page=1&amp;limit=25&amp;sort=created_at&amp;order=desc&amp;search=...`. Jangan setiap module membuat format pagination sendiri.
- Format sukses contoh: `{ "success": true, "data": {}, "message": "..." }`.
- Format error contoh: `{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Data tidak valid." } }`.
- Katalog error minimal: `AUTH_REQUIRED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `CONFLICT`, `RATE_LIMITED`, `INTERNAL_ERROR`. UI message harus manusiawi; exception internal tidak boleh bocor.
- Authentication dan authorization wajib dicek pada setiap endpoint, resource, dan action. Login saja tidak berarti semua akses aman.
- Model otorisasi harus ditetapkan secara eksplisit, misalnya RBAC atau ABAC, beserta role matrix: role × resource × action. Akses production mengikuti least privilege, memakai akun individual, dan wajib MFA. Akses darurat memiliki prosedur, batas waktu, audit log, dan review setelahnya.
- Jangan mengubah API lama secara breaking tanpa approval. Gunakan versioning atau backward-compatible migration.
- API yang akan dihentikan harus memiliki status deprecated, dokumentasi, migration path, dan tanggal atau kriteria removal.
- Semua operasi yang berpotensi menerima duplicate request akibat retry atau network failure wajib mempertimbangkan idempotency, termasuk order, email, invoice, provisioning resource, dan AI job; bukan hanya payment.
- Configuration dibagi tiga: environment, application, dan business configuration.
    - Environment: `DATABASE_URL`, `SECRET_KEY`, `API_KEY`, `REDIS_URL`, environment, debug, dan credential di `.env`/secret manager.
    - Application: default pagination, timeout, threshold, feature behavior, dan system behavior di `config/`.
    - Business: menu, urutan menu, menu aktif, permission, feature flag, branding, theme, bahasa, dan tenant setting di Admin/database.
- `.env` wajib masuk `.gitignore`; hanya `.env.example` tanpa nilai rahasia yang boleh masuk repository.
- Jangan hardcode path machine-specific seperti `C:\Users\...` atau `/content/...`; gunakan configuration/path abstraction.
- File upload wajib divalidasi berdasarkan extension, MIME, ukuran, filename, content, malware scan bila relevan, dan storage isolation. Jangan simpan file user di source directory.
- Security review setiap fitur mencakup authentication, authorization, input validation, SQL injection, XSS, CSRF, SSRF, file upload, rate limit, secret exposure, data leakage, tenant isolation, prompt injection, data exfiltration, dan tool abuse.
- Data diklasifikasikan minimal sebagai `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, atau `SENSITIVE`. Aturan storage, logging, masking, encryption, export, dan deletion mengikuti klasifikasi. Jangan pernah memasukkan seluruh object user/PII ke log.
- Data sensitif harus dienkripsi in transit dan, bila relevan, at rest. Secret dan credential tidak boleh disimpan plaintext di database.
- Web SaaS memiliki baseline browser security yang sesuai stack: HTTPS, HSTS, CSP, X-Content-Type-Options, frame protection, secure cookies, HttpOnly, dan SameSite.

## 5. Frontend, tabel, dan UX standard

- CSS global diminimalkan. Gunakan namespace seperti `.awe-kelola .button` atau component system; global CSS hanya untuk hal fundamental.
- JavaScript harus modular. Hindari `app.js` ribuan baris dan global variable seperti `window.data`.
- HTML tidak boleh berisi JavaScript panjang atau inline handler besar; event ditangani module JS.
- Semua tabel memakai satu standard DataTable component.
- Pagination wajib menyediakan pilihan **10, 25, 50, 100, Semua**. `Semua` hanya untuk dataset kecil/aman atau memiliki threshold; jangan mengambil jutaan record sekaligus.
- DataTable wajib mendukung search, sorting, filtering, loading state, empty state, error state, total records, pagination state, dan URL/query state bila relevan.
- Semua halaman menangani lima state: `LOADING`, `SUCCESS`, `EMPTY`, `ERROR`, dan `FORBIDDEN`.
- Operasi async harus memberi feedback seperti `Saving...` dan men-disable button selama request.
- Delete, Deactivate, Reset, Purge, dan Remove wajib meminta confirmation. Operasi kritis dapat meminta user mengetik `DELETE`.
- Notifikasi memakai component standar seperti `Toast.success()`, `Toast.error()`, `Toast.warning()`, `Toast.info()`, dan `Confirm.delete()`. Jangan membuat alert/toast/modal berbeda tiap halaman.
- Pesan error, pop-up, toast, dan notifikasi distandarkan dan dapat dipetakan ke error code serta locale.
- Accessibility wajib dipertimbangkan secara konkret: semantic HTML, keyboard navigation, visible focus state, ARIA bila diperlukan, dan screen-reader compatibility, terutama pada modal, dropdown, accordion, dan DataTable.
- Setiap UI production memiliki behavior yang terdokumentasi untuk desktop, tablet, dan mobile sesuai kebutuhan produk.
- Project menetapkan browser compatibility policy: supported browsers, minimum versions, dan mobile browser policy. Jangan memakai browser API terbaru tanpa memastikan policy mendukungnya.

## 6. Logging, audit, observability, operasional

- Logging harus terstruktur dengan level minimal INFO, WARNING, dan ERROR. Jangan memakai log informal di production.
- Dilarang `except: pass` atau silent failure. Exception harus dicatat, ditangani eksplisit, diteruskan, atau diubah menjadi error standar.
- Jangan pernah log password, token, API key, session, atau data sensitif.
- Aktivitas penting memiliki audit log WHO, WHAT, WHEN, WHERE/resource, RESULT; minimal CREATE, UPDATE, DELETE, LOGIN, LOGOUT, EXPORT, IMPORT, permission change, dan setting change.
- Observability mencakup Logs, Metrics, dan Traces. Sistem harus bisa menjawab penyebab request lambat, login gagal, endpoint error, error rate, latency, dan AI cost.
- Endpoint sensitif/public seperti login, chat, upload, dan generate wajib rate-limited.
- External API wajib memiliki timeout, retry, backoff, dan error handling. Retry operasi non-idempotent harus hati-hati.
- Kegagalan dependency eksternal tidak boleh menyebabkan seluruh aplikasi gagal jika fitur tersebut dapat didegradasi secara aman. Tentukan timeout, fallback, degraded state, atau fail-fast behavior sesuai criticality.
- Jika project menggunakan queue atau webhook, queue/webhook wajib memiliki max retry, backoff, dead-letter atau prosedur poison message, idempotency/deduplication, replay yang aman, verifikasi signature, dan proteksi replay sesuai jenis integrasinya.
- Job berat seperti upload → OCR → embedding → AI → PDF → email diproses asynchronous melalui queue/worker dan mengembalikan `job_id` serta status.
- Operasi penting seperti payment memakai `idempotency_key`.
- Perubahan besar dapat memakai feature flag dan staged rollout sesuai risk dan ukuran user base, misalnya internal → 5% → 25% → 50% → 100%. Persentase adalah contoh, bukan kewajiban.
- Setiap feature flag memiliki human owner dan tanggal atau condition untuk removal. Feature flag tidak boleh menjadi sampah permanen.
- Production service menyediakan health check dan readiness check dengan interface yang konsisten sesuai deployment platform. Health berarti aplikasi hidup; readiness berarti aplikasi siap menerima traffic. Nama dan bentuk endpoint ditentukan di `docs/deployment.md`.
- Service menangani graceful shutdown agar request/job yang sedang berjalan tidak diputus sembarangan, terutama queue, worker, WebSocket, streaming, dan AI processing.
- Production incident mengikuti alur detect → contain → resolve → document → postmortem → prevent recurrence. Postmortem fokus pada sistem dan pencegahan, bukan mencari kambing hitam.
- Critical infrastructure dan external service memiliki cost visibility serta budget/alert untuk database, storage, bandwidth, compute, AI, email, dan third-party API.
- Sistem kritis menetapkan RPO (maksimal data yang boleh hilang) dan RTO (maksimal waktu downtime) sebagai keputusan bisnis yang terdokumentasi.
- Monitor AI: tokens/user, cost/request, cost/tenant, requests/day, failed requests, dan cache hit rate.
- Setiap critical path memiliki performance budget yang ditentukan berdasarkan jenis workload dan business requirement, lalu diuji secara otomatis bila memungkinkan; pertimbangkan pagination, index, cache, dan async processing.
- Jangan gunakan magic number. Definisikan `MAX_RETRIES`, pagination limits, timeouts, thresholds, AI parameters, file size, dan rate limits secara terpusat.

## 7. Dependency, testing, dan Git

- Dependency harus dikontrol, tercatat, dan terpusat dalam manifest + lockfile. Dilarang install/upgrade ad-hoc atau `pip install -U everything`.
- Dependency baru harus menjawab: mengapa perlu, mengapa tidak memakai yang sudah ada, apakah maintained, lisensi, security impact, ukuran, dan deployment impact.
- Setiap feature wajib memiliki implementation dan test yang sesuai criticality. Feature tanpa test dianggap belum selesai. Documentation wajib bila feature memperkenalkan atau mengubah behavior, API, database, security, architecture, operational procedure, atau business rule yang perlu diketahui developer lain; perubahan kecil tidak perlu dokumentasi seremonial.
- Minimal unit test dan integration test untuk auth, permission, billing, database, tenant isolation, AI/RAG, dan data processing.
- Gunakan testing pyramid: banyak unit test, integration test secukupnya, dan E2E untuk alur kritis. Jangan menjadikan semua test E2E karena lambat/rapuh atau hanya unit test untuk sistem yang integrasinya kompleks.
- Test harus isolated dan reproducible; test tidak boleh bergantung pada urutan atau hasil test lain.
- Production data/PII tidak boleh dipakai sembarangan sebagai fixture test. Gunakan synthetic data atau masking yang aman.
- AI dilarang menghapus test, menurunkan assertion, skip, atau bypass hanya agar test hijau. Jika requirement berubah, perubahan harus disengaja dan terdokumentasi.
- Fitur AI/RAG kritis memiliki `golden_cases/` berisi question, expected behavior, expected source, dan expected answer characteristics.
- Branch strategy ditentukan project. Minimal production branch harus protected, dan branch `feature/*`, `fix/*`, serta `hotfix/*` digunakan sesuai kebutuhan. Branch tambahan seperti `develop` opsional.
- AI tidak boleh menghapus history, force-push branch penting, atau merge/push production tanpa review/approval.
- Commit menjelaskan intent: `feat:`, `fix:`, `refactor:`, `test:`. Hindari `update`, `fix2`, `final`, `final2`, dan `done`.
- Definition of Done minimal: backend, frontend, validation, authorization, loading/empty/error/forbidden state, pagination, audit log, test, migration, documentation, security review, dan rollback bila relevan.
- Setiap pull request wajib melewati automated CI sebelum merge. Minimum gate: lint → format check → type check → unit test → integration test → contract/schema test → security/dependency scan → secret scan → build.
- Alur delivery standar: PR → CI → review → merge → staging → smoke test → production. Jangan mengandalkan ingatan manusia untuk gate berulang.
- Kode production menggunakan type hints dan static type checking sesuai strictness project. Untuk frontend, gunakan TypeScript bila stack memungkinkan; type diperlakukan sebagai kontrak.
- Formatting dan linting ditentukan tooling resmi project, bukan selera developer atau AI. Contoh: Python formatter/linter/type checker; JS/TS formatter/ESLint/type checker.
- Development, staging, dan production menggunakan konfigurasi serta dependency yang kompatibel. Semua perbedaan environment harus eksplisit dan terdokumentasi.
- Deployment harus reproducible dari Git commit, dependency lockfile, migration, environment configuration, dan secret yang diperlukan.
- Dependency dipindai berkala untuk vulnerability dan license issue. Repository dan CI wajib melakukan secret scanning agar credential/API key tidak masuk Git history.

## 8. AI coding governance

- Prompt AI diperlakukan sebagai source code dan disimpan/versioning di `prompt/`, misalnya `prompt/awe/awe_chat_system.md`, `summarization.md`, `classification.md`, dan `extraction.md`. Prompt production tidak boleh hanya tersimpan di chat.
- Model AI configurable lewat `AI_PROVIDER`, `AI_MODEL`, `AI_TEMPERATURE`, dan `AI_MAX_TOKENS`, bukan hardcode di banyak file.
- Workflow wajib: **SEARCH → READ → UNDERSTAND → PLAN → IMPLEMENT → TEST → REVIEW**.
- Output AI diperlakukan sebagai untrusted input: jangan dieksekusi langsung, escape sebelum render, validasi hasil, dan batasi tool yang boleh dipanggil.
- Aksi AI yang memiliki side effect kritis, seperti menghapus data, mengirim email massal, atau mengubah billing, wajib melalui human approval atau policy gate yang sesuai.
- PII harus direduksi atau dimasking sebelum dikirim ke model eksternal bila memungkinkan; tetapkan kebijakan data retention provider dan utamakan zero-retention bila tersedia.
- Setiap AI response penting mencatat prompt version, model, parameter, dan metadata yang diperlukan agar hasil dapat ditelusuri. Perubahan prompt/model wajib menjalankan golden cases sebagai regression test sebelum merge.
- Tetapkan cost cap dan rate limit AI per user dan per tenant, serta perilaku saat limit tercapai.
- Sebelum mengubah kode, AI wajib mencari existing implementation, mengidentifikasi owner module, membaca file terkait, memeriksa pattern, menghindari duplicate, tidak mengubah arsitektur/API tanpa approval, membuat perubahan sekecil mungkin, mempertahankan API, menjalankan test relevan, lalu melaporkan perubahan dan hasil test.
- AI dilarang membuat duplicate service, suffix `_new.py`/`_old.py`/`_final.py`, mengubah database tanpa migration, menghapus test, hardcode secret, bypass authorization, swallow exception, menambah dependency tanpa alasan, rewrite file tidak relevan, atau refactor unrelated code.
- Dokumentasi wajib: `docs/architecture.md`, `database.md`, `api.md`, `authentication.md`/`security.md`, `deployment.md`, `ai.md`, dan `conventions.md`.
- Pisahkan sumber aturan berdasarkan fungsi: `ENGINEERING_CONSTITUTION.md` berisi prinsip fundamental; `AGENTS.md` berisi aturan AI yang wajib diikuti; `docs/` berisi detail domain seperti architecture, database, security, API, frontend, i18n, theming, testing, dan deployment.
- Dokumentasi detail module diletakkan dekat dengan code, misalnya `app/awe/README.md`. Root docs menjelaskan architecture global; module docs menjelaskan detail module.
- Perubahan yang memengaruhi user, API, database, security, atau production behavior wajib tercatat di changelog/release notes.
- `AGENTS.md` menjadi konstitusi khusus AI dengan bagian PROJECT RULES, ARCHITECTURE, NAMING, MUST, DO NOT, TESTING, DATABASE RULES, dan SECURITY.
- Keputusan besar dicatat di `docs/adr/`, misalnya alasan PostgreSQL, Redis, modular monolith, atau queue-based AI.
- Jangan langsung memakai Kubernetes, Kafka, Redis Cluster, banyak database, event sourcing, CQRS, service mesh, atau microservices tanpa bukti kebutuhan.

## 9. Internationalization dan localization

- Semua user-facing text wajib i18n; dilarang hardcode teks di HTML, JS, atau Python. User-facing text berarti teks yang dibaca end user: label, judul, tombol, pesan error/sukses, empty state, email, dan notifikasi. Log internal, debug message, nama teknis, dan konstanta sistem bukan user-facing.
- Siapkan locale `id`, `en`, dan kemungkinan `ja`, `ko`, `zh`, `fr`, `de`, `ar`, serta `he`.
- Pisahkan translation per domain: `i18n/id/common.json`, `awe.json`, `auth.json`, `billing.json`, dan padanan `en/`. Jangan membuat satu `language.json` raksasa.
- Translation key stabil dan kontekstual seperti `awe.manage_data.title`, `.save`, `.delete`, `.empty`, dan `.error`; jangan memakai `text_1`, `foo`, atau teks asli sebagai key.
- Setiap bahasa memiliki fallback, minimal English lalu default. Jangan menampilkan `undefined`, `null`, atau key mentah.
- I18n mendukung pluralization (`one`, `other`, dan aturan locale).
- Format tanggal, angka, dan mata uang harus locale-aware; jangan hardcode format Indonesia/US.
- Layout harus tahan teks terjemahan lebih panjang. Jangan concatenate kalimat; gunakan translation key dengan parameter `count`, `name`, dan sejenisnya.
- RTL harus dipertimbangkan sejak awal. Gunakan `margin-inline-start`, `padding-inline-end`, dan `text-align: start`, bukan hanya left/right.

## 10. Theming dan design system

- Dilarang hardcode warna pada component. Gunakan semantic design tokens seperti `var(--color-primary)`, bukan `#2563eb` atau `-blue-500` langsung.
- Gunakan alur raw palette → semantic tokens → components. Token mencakup primary, background, surface, text, muted, border, success, warning, danger, spacing, typography, radius, shadows, breakpoints, dan z-index.
- Light dan dark adalah theme, bukan dua codebase. Sediakan `tokens.css`, `light.css`, `dark.css`, lalu theme tambahan seperti ocean, emerald, purple, atau high-contrast tanpa mengubah component.
- Component tidak boleh mengetahui nama theme. Jangan membuat `light_button.css`, `dark_button.css`, atau selector `.dark .button` di setiap component.
- Language dan theme adalah user preference: system default → user preference → tenant preference → application default.
- Preference harus persistent; theme switching idealnya tidak perlu reload.
- Semua theme diuji contrast. Warna tidak boleh menjadi satu-satunya indikator; gunakan icon, text, dan status. Dark mode bukan `filter: invert(1)`.

## 11. Level code dan configuration Admin

- Level 1 Prototype boleh cepat/sederhana.
- Level 2 Production wajib test, security, logging, migration, dan documentation.
- Level 3 Critical wajib audit, backup, monitoring, redundancy, performance review, security review, dan rollback.
- Jangan memperlakukan halaman settings sederhana sama seperti payment engine.
- Bedakan environment configuration, application configuration, dan business configuration. Jangan memasukkan semua hal ke database Admin; secret tetap di `.env`/secret manager.

## 12. Prioritas enforceability

Konstitusi ini tidak dimaksudkan menjadi daftar aturan enterprise yang tidak bisa dijalankan. Setelah gap penting ditutup, fokus berpindah dari menambah aturan ke membuat aturan enforceable melalui CI/CD, pre-commit hooks, formatter, linter, type checker, contract test, automated test, dependency scanner, secret scanner, migration checker, architecture checks, smoke test, dan review manusia.

- Aturan inti harus memiliki mekanisme enforcement yang sesuai: batas 400 baris dan forbidden files melalui CI check; format melalui formatter; lint melalui linter; types melalui type checker; tests melalui CI; secrets melalui secret scanner; dependencies melalui vulnerability scanner; architecture melalui architecture test; dan perubahan migration melalui migration check.

## Sepuluh hukum utama

1. One feature, one clear owner.
2. Setiap feature memiliki ownership dan boundary yang jelas; komponen yang digunakan memiliki naming dan hubungan yang konsisten.
3. One file/function = limited responsibility.
4. Business logic tidak berada di UI/route.
5. Database hanya melalui repository/data layer.
6. Semua perubahan DB melalui migration.
7. Tidak boleh duplicate implementation.
8. Arsitektur/API tidak berubah tanpa keputusan eksplisit.
9. Setiap perubahan harus dapat diuji dan memiliki strategi recovery, rollback, atau forward-fix yang sesuai dengan jenis perubahan.
10. AI wajib membaca dan memahami existing code sebelum menulis kode.

## Checklist sebelum menerima perubahan

- [ ]  Owner module jelas dan implementasi lama sudah dicari.
- [ ]  Ownership dan boundary feature jelas; naming komponen konsisten; root bersih.
- [ ]  HTML, CSS, dan JS terpisah; file/function masih dalam responsibility wajar dan maksimal 400 baris.
- [ ]  Route tipis, service/domain jelas, repository menjadi satu-satunya boundary database.
- [ ]  Migration, API contract, error code, authorization, tenant isolation, dan security review tersedia.
- [ ]  DataTable memakai 10/25/50/100/Semua dengan batas aman dan server-side untuk data besar.
- [ ]  LOADING, SUCCESS, EMPTY, ERROR, FORBIDDEN, loading feedback, destructive confirmation, dan notification standard tersedia.
- [ ]  Tidak ada secret, silent exception, hardcoded path, magic number, atau dependency tidak tercatat.
- [ ]  Test, golden case, audit log, observability, documentation, dan rollback relevan tersedia.
- [ ]  i18n, fallback, pluralization, locale formatting, RTL, theme tokens, light/dark, extensible themes, contrast, dan accessibility dipertimbangkan.
- [ ]  Perubahan kecil, satu tujuan, dapat direview, dites, dan dilaporkan.

## 13. Usulan tambahan (draft, belum wajib)

<aside>
🧪

Bagian ini adalah rekomendasi pelengkap untuk menutup gap yang belum tercakup di bagian 1–12. Adopsi bertahap; naikkan menjadi aturan wajib hanya jika sudah bisa ditegakkan (CI, tooling, atau review).

</aside>

### 13.1 Developer experience dan onboarding

- Project harus bisa dijalankan dengan satu perintah standar (misalnya `make setup` dan `make dev`), termasuk seed data demo yang aman.
- Sediakan `CONTRIBUTING.md`: cara setup, menjalankan test, konvensi branch/commit, dan cara mengajukan PR.
- Target waktu onboarding developer baru sampai bisa menjalankan aplikasi secara lokal ditetapkan (misalnya < 1 hari).
- Definition of Ready untuk task: masalah jelas, acceptance criteria, dampak data/API, dan level code (1/2/3) sudah ditentukan sebelum coding.

### 13.2 Access control dan akses production

Aturan minimum access control dan akses production sudah ditetapkan sebagai aturan wajib di Section 4. Bagian ini hanya menjadi tempat untuk detail implementasi atau keputusan project-specific.

- Secret memiliki kebijakan rotasi berkala dan prosedur rotasi darurat saat dicurigai bocor.

### 13.3 SLO, on-call, dan severity

- Tetapkan SLO utama (ketersediaan, latency p95/p99, error rate) beserta error budget.
- Tetapkan klasifikasi severity insiden (SEV1–SEV3) dengan definisi, waktu respons, dan jalur eskalasi.
- Tentukan siapa on-call dan bagaimana alert sampai ke manusia; alert yang tidak actionable harus dihapus.

### 13.4 Queue, job, dan webhook

Aturan queue dan webhook berlaku secara kondisional dan sudah ditetapkan di Section 6. Bagian ini hanya menjadi tempat untuk detail implementasi atau keputusan project-specific.

### 13.5 Privacy dan compliance

- Tetapkan kepatuhan yang berlaku (misalnya UU PDP Indonesia dan GDPR bila ada user EU): dasar pemrosesan, consent, dan privacy notice.
- Sediakan alur data subject request: export data, koreksi, dan penghapusan akun beserta SLA-nya.
- Catat daftar subprocessor/vendor yang memproses data user, termasuk lokasi penyimpanan data.
- Tentukan kebijakan notifikasi pelanggaran data (siapa, kapan, dan bagaimana memberi tahu).

### 13.6 Billing dan langganan

- Aturan trial, upgrade/downgrade, proration, pembatalan, refund, dan dunning didefinisikan sebagai business rule, bukan improvisasi kode.
- Webhook payment provider adalah source of truth status langganan; verifikasi signature dan proses idempoten.
- Entitlement/limit per plan dicek di backend pada setiap aksi, bukan hanya disembunyikan di UI.
- Perubahan harga dan plan memiliki versioning agar pelanggan lama tidak rusak tagihannya.

### 13.7 AI safety dan kualitas

Aturan minimum AI safety sudah ditetapkan sebagai aturan wajib di Section 8. Bagian ini hanya menjadi tempat untuk detail implementasi, evaluasi, atau keputusan project-specific.

### 13.8 Enforcement teknis yang konkret

Aturan inti dan mekanisme enforcement minimum sudah ditetapkan di Section 12. Bagian ini hanya menjadi tempat untuk detail tooling, threshold, dan konfigurasi CI per project.

Target accessibility dan performance budget ditentukan berdasarkan criticality, jenis workload, dan business requirement; angka spesifik diletakkan di dokumentasi teknis seperti `docs/performance.md`.

### 13.9 Tata kelola dokumen ini

- Dokumen memiliki versi, tanggal berlaku, dan owner; perubahan besar melalui ADR.
- Review terjadwal (misalnya per kuartal) untuk menghapus aturan yang tidak pernah ditegakkan.
- Mekanisme pengecualian sudah menjadi prinsip fundamental di bagian Prinsip utama. Bagian ini hanya mengatur di mana pengecualian dicatat (misalnya `docs/adr/` atau exception log) dan siapa yang berwenang menyetujui.

---

Dokumen ini mencatat seluruh aturan, tambahan, contoh, workflow, dan prinsip yang diberikan: struktur SaaS, naming, modular boundary, batas 400 baris, database/migration, API, error, authorization, multi-tenant, frontend, DataTable, state, logging, audit, secret, config Admin, dependency, testing, golden test, prompt, model AI, async job, idempotency, Git, ADR, i18n, theming, preferences, accessibility, operasional, dan guardrail Vibe Coding.

[[AGENTS.md](http://AGENTS.md)](https://app.notion.com/p/AGENTS-md-22c5b759d4ae82e98a89017b08216e8c?pvs=21)