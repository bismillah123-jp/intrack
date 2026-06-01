# DompetRapi

DompetRapi adalah MVP SaaS pengelolaan keuangan pribadi berbasis Vite + React. App memakai Supabase untuk auth/database, Chart.js untuk grafik, dan Lucide React untuk ikon.

## Menjalankan Demo Lokal

Install dependency, lalu jalankan dev server:

```powershell
npm install
npm run dev
```

Lalu buka `http://127.0.0.1:8787/index.html`. Jika `config.js` belum ada, app otomatis masuk demo mode read-only dengan data contoh.

## Menghubungkan Supabase

1. Buat project Supabase.
2. Jalankan SQL di `supabase/schema.sql` lewat Supabase SQL editor.
3. Copy `config.example.js` menjadi `config.js`.
4. Isi `SUPABASE_URL` dan `SUPABASE_ANON_KEY`.
5. Jalankan build, lalu deploy folder `dist` ke static hosting:

```powershell
npm run build
```

Untuk Google OAuth, aktifkan provider Google di Supabase Auth dan masukkan redirect URL domain tempat app di-host.
Untuk development lokal, tambahkan `http://127.0.0.1:8787/**` ke Supabase Auth URL Configuration. Di Google Cloud OAuth, Authorized JavaScript origin memakai `http://127.0.0.1:8787`, sedangkan Authorized redirect URI memakai callback URL dari halaman Google provider Supabase.

Alternatif build-time: copy `.env.example` ke `.env` dan isi:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
FREETHEAI_API_KEY=your-freetheai-api-key
VITE_TURNSTILE_SITE_KEY=
```

## FreeTheAI

Fitur AI Pro memakai Vercel Serverless Function di `api/openrouter.js`, model `fee/kimi-k2.6`, dan endpoint FreeTheAI `/v1/chat/completions`.

Untuk production di Vercel, tambahkan environment variable server:

```env
FREETHEAI_API_KEY=your-freetheai-api-key
```

Jangan menaruh FreeTheAI key di `VITE_` env karena nilai `VITE_` ikut masuk ke bundle browser.

Cloudflare Turnstile dipakai untuk form email/password. Jika Supabase Auth kamu mengaktifkan CAPTCHA protection, isi `VITE_TURNSTILE_SITE_KEY` dengan sitekey Turnstile dan masukkan secret key-nya di Supabase Auth > Bot and Abuse Protection. Untuk development lokal, tambahkan `localhost` dan `127.0.0.1` ke domain allowlist Cloudflare Turnstile.

## Routes

- `/` landing page
- `#/login` auth
- `#/app/dashboard`
- `#/app/wallets`
- `#/app/transactions`
- `#/app/budgets`
- `#/app/goals`
- `#/app/pro`

## Catatan MVP

- Tidak ada sync rekening bank otomatis.
- AI advisor, receipt scanner, dan report analyzer memakai FreeTheAI lewat `/api/openrouter`.
- Produk sekarang Pro-only; tabel `subscriptions` tetap dipakai untuk status akun Pro.
- Tema gelap/terang dan warna aksen custom disimpan di browser lewat `localStorage`.
