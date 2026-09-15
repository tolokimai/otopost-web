# OtoPost Content Engine

Content Engine menghubungkan **Persona → Content Plan → Content Library → Studio**. Release ini menyediakan fondasi yang tersimpan per pengguna, bukan sekadar form frontend.

## Alur pengguna

1. Buat Brand Persona manual atau generate draft AI.
2. Pilih Persona dan generate kalender 7/30 hari.
3. Review setiap ide di Content Library.
4. Ubah status `draft` → `review` → `approved`.
5. Kirim konten approved ke Carousel, Podcast Clip, atau Remake Studio.
6. Setelah handoff, status menjadi `in_production`.

Status tersedia: `draft`, `review`, `approved`, `in_production`, `scheduled`, `published`, `failed`.

## Data dan isolasi tenant

Tabel baru: `personas`, `content_plans`, `content_items`, dan `system_meta` untuk marker seed internal. Semua query Persona, Plan, dan Content Item dibatasi dengan `user_id`; ID milik akun lain menghasilkan 404. Saat Persona atau Plan dihapus, Content Library tidak ikut hilang—referensinya dilepas agar ide tetap dapat dipakai.

## AI dan kredit

- Persona generator memakai Gemini dan memotong 1 kredit hanya setelah output valid.
- Content Plan generator memakai Gemini dan memotong 1 kredit hanya setelah strategy + minimal item valid.
- Kegagalan parsing AI tidak memotong kredit; admin tidak dipotong kredit.
- Output dibatasi panjang/jumlah, workflow divalidasi, dan tanggal dipaksa berada di rentang plan.

## Feature gate admin

Startup menambahkan menu `persona`, `content-plan`, dan `content-library` satu kali. Marker disimpan di `system_meta`, sehingga menu yang kemudian diubah/dihapus admin tidak di-reset atau dimunculkan kembali. Admin tetap dapat mengubah enablement, readiness, paket minimum, route, label, dan urutan lewat CRUD menu.

Default akses: Brand Persona = Free, Content Planner = Creator, Content Library = Free. Handoff memeriksa ulang workflow Studio di server: enabled, ready, dan paket pengguna. Konten selain `approved` ditolak dengan HTTP 409.

## Batas release

Release ini belum melakukan posting otomatis ke TikTok/Meta/YouTube dan belum mengumpulkan analytics. `scheduled` saat ini adalah status editorial; scheduler, OAuth sosial, retry, audit log, dan revenue attribution berada di milestone berikutnya.
