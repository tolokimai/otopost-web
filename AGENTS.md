# AGENTS.md

<aside>
🤖

Isi final file `AGENTS.md` di root repository. Versi 1.0 — berlaku sejak September 28, 2026. Dokumen ini adalah turunan operasional dari Konstitusi Engineering SaaS: hanya aturan yang wajib dipatuhi AI saat menulis kode. Prinsip fundamental ada di `ENGINEERING_CONSTITUTION.md`, detail domain ada di `docs/`.

</aside>

## AUTHORITY

- File ini mengatur perilaku AI saat menulis kode. Baca sampai habis sebelum mengubah apa pun.
- Aturan fundamental project didefinisikan di `ENGINEERING_CONSTITUTION.md`. AI wajib mengikuti konstitusi. Jika file ini bertentangan dengan konstitusi, **konstitusi menang**, kecuali ada keputusan project eksplisit (ADR) yang menimpanya.
- Urutan otoritas: `ENGINEERING_CONSTITUTION.md` → `AGENTS.md` → `docs/` → instruksi ad-hoc di chat.
- Aturan di sini adalah default, bukan dogma. Pengecualian diperbolehkan bila tercatat di PR description atau `docs/adr/`: apa yang dikecualikan, mengapa, sampai kapan, dan siapa yang menyetujui. Pengecualian yang tidak terdokumentasi dianggap pelanggaran.
- Jika instruksi user bertentangan dengan aturan di sini, berhenti dan konfirmasi dulu. Jangan diam-diam melanggar.
- Jika ragu soal arsitektur, API, schema database, atau security: tanya, jangan tebak.

## REPOSITORY MAP

```
project/
├── ENGINEERING_CONSTITUTION.md   ← prinsip fundamental engineering
├── AGENTS.md                     ← aturan kerja AI (file ini)
├── README.md
├── .env.example
├── app/                          ← feature/domain modules (awe, auth, billing, user, admin, core)
├── db/                           ← connection, models, repositories, migrations/
├── frontend/                     ← components, css, js, themes
├── templates/
├── i18n/
├── prompt/                       ← prompt AI sebagai source code
├── config/
├── tests/
└── docs/
    ├── architecture.md
    ├── database.md
    ├── security.md
    ├── api.md
    ├── deployment.md
    ├── ai.md
    ├── conventions.md
    └── adr/
```

- Kode dilarang ditulis langsung di root. Root hanya untuk file project-level.
- Struktur berbasis fitur/domain, bukan tumpukan global `controllers/`, `models/`, `services/` tanpa boundary.
- Dokumentasi detail module diletakkan dekat kode (misalnya `app/awe/README.md`); `docs/` menjelaskan arsitektur global.

## MANDATORY WORKFLOW

Sebelum mengubah kode, jalankan urutan ini dan jangan melompati langkah:

```
SEARCH → READ → UNDERSTAND → PLAN → IMPLEMENT → TEST → REVIEW
```

### SEARCH

- Cari implementasi yang sudah ada: function, component, route, service, repository, test, dan configuration terkait.
- Jangan membuat implementasi baru sebelum memastikan belum ada yang serupa.
- Urutan keputusan: reuse → extend → refactor → baru create.

### READ

- Baca file terkait cukup lengkap untuk memahami tanggung jawabnya, bukan sekadar potongan yang akan diedit.
- Baca test dan dokumentasi yang terkait.
- Identifikasi owner module dan arah dependency.

### UNDERSTAND

Tentukan dengan jelas: arsitektur yang berlaku, ownership, dependency, alur data, authorization, side effect, dan test yang terdampak.

### PLAN

- Rancang perubahan sekecil mungkin yang memenuhi requirement.
- Jangan mengubah arsitektur atau public API tanpa approval eksplisit.
- Jangan menyelipkan refactoring yang tidak diminta.
- Tentukan level code perubahan (Level 1 prototype / Level 2 production / Level 3 critical) karena menentukan kedalaman test, logging, dan review.

### IMPLEMENT

- Ikuti `ENGINEERING_CONSTITUTION.md`.
- Reuse kode yang ada sebelum membuat yang baru; dilarang implementasi duplikat.
- Dilarang membuat file `_new`, `_old`, `_final`, `_v2`, `_backup`, atau file temporary.
- Dilarang hardcode secret dan path machine-specific.
- Perubahan database wajib lewat migration.
- Pertahankan kontrak API yang ada kecuali ada approval eksplisit.

### TEST

- Jalankan test yang paling relevan, plus lint/format/type check bila berlaku.
- Jalankan migration check, contract test, dan security/secret scan bila relevan.
- Dilarang menghapus, melemahkan, men-skip, atau membypass test hanya agar CI hijau.

### REVIEW

Sebelum melapor selesai: periksa diff, cari perubahan tak disengaja, cek security dan authorization, cek dampak database, cek duplikasi implementasi, cek dampak dokumentasi, dan pastikan test benar-benar dijalankan serta lulus.

## ARCHITECTURE

- Alur dependency: `Frontend → Route/Controller → Service/Application → Domain → Repository → Database`. Arah dependency tidak boleh dibalik.
- Layer yang tidak diperlukan boleh dilewati. Jangan membuat service/repository/schema kosong hanya agar polanya lengkap.
- Route tipis: parse request → validasi bentuk → authorization → panggil service → return response. Tidak ada business logic di route atau frontend.
- Core tidak boleh import feature. Tidak boleh ada circular dependency.
- Satu fitur = satu logical boundary dengan satu owner, meskipun filenya tersebar di beberapa layer.
- Side effect harus eksplisit. Function `get`/`read`/`list` dilarang melakukan write, kirim email, dispatch queue, atau mengubah state.
- Semua external service (AI provider, payment, email, storage, third-party API) diakses lewat adapter/provider boundary. Dilarang import SDK provider langsung di service/route feature.
- Kegagalan dependency eksternal tidak boleh menjatuhkan seluruh aplikasi. Tentukan timeout, retry/backoff, fallback, atau degraded state.
- Dilarang memperkenalkan Kubernetes, Kafka, Redis Cluster, microservices, event sourcing, CQRS, atau database tambahan tanpa ADR.

## FILE AND CODE RULES

- Ikuti file ownership, naming, layering, arah dependency, dan batas 400 baris untuk production source file seperti didefinisikan di `ENGINEERING_CONSTITUTION.md`.
- File melebihi 400 baris wajib dipecah berdasarkan responsibility/domain, bukan dipotong asal.
- Satu function = satu responsibility. Pisahkan validasi, authorization, query, transformasi, AI call, penyimpanan, notifikasi, logging, dan response.
- HTML, CSS, dan JS terpisah. HTML hanya presentation, JS hanya interaction.
- Jangan membuat file atau layer hanya untuk memenuhi pola penamaan.

## NAMING

- Nama frontend, backend, dan test untuk satu fitur harus konsisten, contoh: `awe_kelola.py` / `awe_kelola.html` / `awe_kelola.js` / `awe_kelola.css` / `test_awe_kelola.py`.
- Dilarang nama file: `*_new`, `*_old`, `*_final`, `*_final2`, `*_v2`, `*_backup`, `*_copy`, `*_temp`, `temporary`, `utils2`, `helper_final`, `fix_*`.
- Dilarang membuang kode ke `utils/`, `helpers/`, atau `misc/` tanpa alasan terdokumentasi.
- Translation key kontekstual dan stabil (`awe.manage_data.title`), bukan `text_1` atau teks asli.
- Commit: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`. Dilarang `update`, `fix2`, `final`, `done`.

## CHANGE SCOPE

- Setiap perubahan punya satu tujuan yang jelas. Satu PR = satu logical change.
- Utamakan `perubahan kecil → test → review`, bukan `rewrite besar → semoga jalan`.
- Jangan mencampur implementasi fitur dengan refactoring besar yang tidak berkaitan.
- Jangan menyentuh file yang tidak relevan dengan tugas saat ini.

## MUST

- Cek authentication dan authorization di setiap endpoint, resource, dan action. Identitas, role, dan tenant ditentukan backend, bukan dari payload frontend.
- Pakai format response standar: `{ "success": true, "data": {}, "message": "..." }` dan `{ "success": false, "error": { "code": "...", "message": "..." } }`.
- Pakai error code dari katalog: `AUTH_REQUIRED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `CONFLICT`, `RATE_LIMITED`, `INTERNAL_ERROR`. Exception internal tidak boleh bocor ke user.
- Validasi input di backend dengan schema yang bisa dicek otomatis. Schema boleh inline untuk endpoint sederhana.
- Pagination, search, filter, dan sort dilakukan server-side untuk dataset besar; format query distandarkan lintas module (`?page=1&amp;limit=25&amp;sort=created_at&amp;order=desc&amp;search=...`).
- Setiap halaman/komponen data menangani `LOADING`, `SUCCESS`, `EMPTY`, `ERROR`, dan `FORBIDDEN`, plus feedback async dan confirmation untuk aksi destruktif.
- Pakai DataTable, Toast, dan Confirm standar yang sudah ada (opsi pagination 10/25/50/100/Semua dengan batas aman). Jangan bikin komponen tabel/notifikasi baru per halaman.
- Semua teks yang dibaca end user lewat i18n, dengan key baru ditambahkan minimal ke `id` dan `en`, punya fallback, dan mendukung pluralization bila perlu.
- Pakai design token (`var(--color-*)`), bukan hex atau kelas warna langsung. Pertimbangkan light/dark, contrast, RTL, dan accessibility (semantic HTML, keyboard, focus state, ARIA bila perlu).
- Semua konstanta (retry, timeout, limit, threshold, ukuran file, parameter AI) didefinisikan terpusat, bukan magic number inline.
- Operasi yang bisa terkena retry duplikat (payment, order, email, invoice, provisioning, AI job) wajib idempotent atau punya dedup/idempotency key.
- Logging terstruktur (INFO/WARNING/ERROR) dan audit log untuk aktivitas penting.
- Jalankan lint, format, type check, dan test yang relevan sebelum melapor selesai, lalu laporkan sesuai bagian COMPLETION REPORT.

## MUST NOT

AI dilarang:

- menulis kode di root repository;
- mengubah arsitektur, struktur folder, atau schema database tanpa approval eksplisit;
- membuat file production melebihi 400 baris tanpa pengecualian terdokumentasi;
- membuat implementasi duplikat atau file `_new`/`_old`/`_final`/`_v2`/`backup`/temporary;
- mengubah kontrak API lama secara breaking tanpa approval atau versioning;
- mengakses database di luar repository/data layer;
- mengubah schema tanpa migration, atau mengubah database production secara manual;
- menulis `except: pass`, `catch {}`, atau silent failure lain;
- hardcode secret, API key, token, atau path mesin (`C:\Users\...`, `/content/...`);
- log password, token, API key, session, atau object user/PII utuh;
- bypass authentication atau authorization;
- menghapus test, melemahkan assertion, menambah `skip`, atau mengubah expected value hanya agar CI hijau;
- menambah dependency baru tanpa alasan tertulis dan approval;
- menyentuh atau menulis ulang file yang tidak relevan dengan tugas;
- force-push, menghapus history, atau merge ke production branch tanpa review;
- menjalankan operasi produksi destruktif (drop, truncate, delete massal, reset migration) tanpa approval manusia;
- mengklaim test lulus padahal tidak dijalankan.

## DATABASE RULES

Sebelum mengubah perilaku database:

1. periksa schema yang ada;
2. periksa repository/data access layer;
3. periksa migration yang ada;
4. buat/ubah migration bila perlu;
5. test migration;
6. test perilaku yang terdampak.
- Akses database hanya lewat repository/data layer. Dilarang menyebar SQL atau `db.execute(...)` di route, service, atau frontend.
- Semua perubahan schema lewat migration di `db/migrations/` yang dapat direplikasi development → staging → production. Dilarang mengubah production secara manual.
- Migration harus backward-compatible saat rolling deploy. Untuk rename/remove: add column → dual write → migrate data → switch reads → verify → remove.
- Migration destructive butuh approval eksplisit dan catatan strategi rollback atau forward-fix.
- Multi-tenant: setiap query data bisnis wajib menyertakan konteks tenant. Data global dinyatakan eksplisit.
- Operasi yang butuh atomicity dibungkus satu transaction boundary yang jelas.
- Hindari N+1 query. Untuk tabel besar, pertimbangkan index, `EXPLAIN`, dan pagination.
- Hindari pola `read()` → `modify()` → `save()` pada data concurrent tanpa locking atau optimistic concurrency.
- Cache wajib punya TTL/invalidation dan source of truth; cache bukan satu-satunya penyimpanan data penting.
- Timestamp disimpan UTC; strategi ID (UUID/ULID/integer) mengikuti keputusan project, bukan pilihan per file.

## SECURITY

Perlakukan semua input eksternal sebagai untrusted. Verifikasi setiap perubahan terhadap: authentication, authorization, tenant isolation, input validation, SQL injection, XSS, CSRF, SSRF, file upload, rate limit, secret exposure, data leakage, prompt injection, data exfiltration, dan tool abuse.

- Authorization dicek per resource dan per action, bukan sekadar "sudah login"; ikuti role matrix (role × resource × action) dan least privilege.
- `.env` tidak pernah masuk Git. Hanya `.env.example` tanpa nilai rahasia.
- File upload divalidasi extension, MIME, ukuran, nama file, dan isinya; disimpan terisolasi dari source directory.
- Endpoint sensitif/public (login, chat, upload, generate, export) wajib rate limit.
- Data sensitif dienkripsi in transit, dan at rest bila relevan. Tidak ada credential plaintext di database.
- Ikuti klasifikasi data (`PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `SENSITIVE`) untuk storage, logging, masking, export, dan deletion.
- Aktivitas penting masuk audit log: WHO, WHAT, WHEN, WHERE/resource, RESULT.

## AI FEATURE RULES

- Output model adalah untrusted data: jangan dieksekusi langsung, escape sebelum render, validasi struktur sebelum dipakai, dan batasi tool yang boleh dipanggil.
- Aksi AI dengan side effect kritis (hapus data, email massal, perubahan billing) wajib human approval atau policy gate.
- Prompt production disimpan di `prompt/` sebagai file terversion, bukan string panjang di dalam kode atau hanya di chat.
- Provider dan parameter model lewat config (`AI_PROVIDER`, `AI_MODEL`, `AI_TEMPERATURE`, `AI_MAX_TOKENS`), bukan hardcode tersebar.
- Redaksi/mask PII sebelum dikirim ke model eksternal bila memungkinkan; utamakan provider zero-retention.
- Catat prompt version, model, dan parameter pada AI response penting agar hasil dapat ditelusuri.
- Perubahan prompt atau model wajib menjalankan `golden_cases/` sebagai regression test sebelum merge, sesuai requirement evaluasi AI/RAG di konstitusi.
- Terapkan cost cap dan rate limit per user dan per tenant, serta perilaku jelas saat limit tercapai. Monitor tokens, cost, request, failure, dan cache hit rate.
- Job AI berat diproses async lewat queue dan mengembalikan `job_id` + status.

## TESTING

- Feature tanpa test dianggap belum selesai. Kedalaman test mengikuti criticality (Level 1 prototype / Level 2 production / Level 3 critical).
- Wajib unit + integration test untuk auth, permission, billing, database, tenant isolation, AI/RAG, dan data processing.
- Testing pyramid: banyak unit test, integration secukupnya, E2E hanya untuk alur kritis.
- Test harus isolated dan reproducible; tidak bergantung pada urutan eksekusi atau sisa data test lain.
- Gunakan synthetic data. Dilarang memakai production data atau PII sebagai fixture.
- Jika test gagal, perbaiki kodenya. Jika requirement memang berubah, ubah test secara sengaja dan jelaskan alasannya di PR.

## DEFINITION OF DONE

- [ ]  Owner module jelas; implementasi lama sudah dicari dan direuse bila ada.
- [ ]  Backend, frontend, validasi, dan authorization lengkap.
- [ ]  State `LOADING`/`SUCCESS`/`EMPTY`/`ERROR`/`FORBIDDEN`, pagination, dan destructive confirmation tersedia.
- [ ]  Migration, API contract, error code, tenant isolation, audit log, dan security review tersedia bila relevan.
- [ ]  Tidak ada secret, silent exception, hardcoded path, magic number, atau dependency tidak tercatat.
- [ ]  Test (termasuk golden case bila menyentuh AI) ditambahkan dan lulus.
- [ ]  i18n, design token, accessibility, dan dokumentasi terdampak sudah diperbarui.
- [ ]  Perubahan kecil, satu tujuan, dapat direview, dan punya rencana rollback/forward-fix bila relevan.

## ENFORCEMENT

Aturan berikut dicek otomatis. Jangan mencoba melewatinya secara manual.

```
400 lines           → CI check / pre-commit
forbidden filename  → CI check / pre-commit
format              → formatter
lint                → linter
types               → type checker
tests               → CI
contract/schema     → contract test
secrets             → secret scanner
dependencies        → vulnerability scanner
architecture/layer  → architecture test
migration           → migration checker
```

CI gate minimum sebelum merge: lint → format check → type check → unit test → integration test → contract test → security/dependency scan → secret scan → build.

Alur delivery: PR → CI → review → merge → staging → smoke test → production.

## COMPLETION REPORT

Setiap selesai tugas, laporkan dengan format ini:

```
1. Tujuan perubahan
2. File yang dibaca sebelum menulis kode
3. File yang dibuat/diubah/dihapus + alasannya
4. Keputusan arsitektur (jika ada) + alasan
5. Migration / perubahan API (jika ada)
6. Test & check yang dijalankan
7. Hasil test (apa adanya)
8. Keterbatasan yang diketahui
9. Dampak security/rollback dan pengecualian aturan
10. Yang sengaja TIDAK dikerjakan
```

Jika ada aturan di file ini yang tidak bisa dipenuhi, tulis di laporan alih-alih mendiamkannya.

## DOCUMENT GOVERNANCE

- Versi 1.0, berlaku September 28, 2026. Owner: engineering lead project.
- Perubahan besar pada file ini lewat ADR di `docs/adr/`; review terjadwal untuk menghapus aturan yang tidak pernah ditegakkan.
- Perubahan yang memengaruhi user, API, database, security, atau production behavior wajib tercatat di changelog/release notes.