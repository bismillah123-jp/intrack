# DompetRapi

DompetRapi adalah MVP SaaS pengelolaan keuangan pribadi berbasis Vite + React. App memakai Supabase untuk auth/database, Chart.js untuk grafik, dan Lucide React untuk ikon.

## Menjalankan Demo Lokal

Install dependency, lalu jalankan dev server:

```powershell
npm install
npm run dev
```

Lalu buka `http://127.0.0.1:8787/#/login`. Jika `config.js` belum ada, app otomatis masuk demo mode read-only dengan data contoh.

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
Untuk development lokal, tambahkan `http://127.0.0.1:8787/` dan `http://127.0.0.1:8787/**` ke Supabase Auth URL Configuration. Di Google Cloud OAuth, Authorized JavaScript origin memakai `http://127.0.0.1:8787`, sedangkan Authorized redirect URI memakai callback URL dari halaman Google provider Supabase.

Alternatif build-time: copy `.env.example` ke `.env` dan isi:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
BIGMODEL_API_KEY=your-bigmodel-api-key
```

## BigModel GLM

Fitur AI Pro memakai Vercel Serverless Function di `api/openrouter.js` dan endpoint BigModel `https://open.bigmodel.cn/api/paas/v4/chat/completions`.

- Chat advisor dan report memakai model `glm-4.7-flash`.
- Scan struk/gambar memakai model `glm-4.6v-flash`.

Untuk production di Vercel, tambahkan environment variable server:

```env
BIGMODEL_API_KEY=your-bigmodel-api-key
```

Jangan menaruh BigModel key di `VITE_` env karena nilai `VITE_` ikut masuk ke bundle browser. Endpoint juga menerima `ZHIPU_API_KEY` sebagai alias server-only jika kamu lebih suka nama itu.

## Routes

- `/` auth/login
- `#/login` auth
- `#/app/dashboard`
- `#/app/wallets`
- `#/app/transactions`
- `#/app/budgets`
- `#/app/goals`
- `#/app/pro`

## Catatan MVP

- Tidak ada sync rekening bank otomatis.
- AI advisor dan report analyzer memakai BigModel `glm-4.7-flash`; receipt scanner memakai `glm-4.6v-flash` lewat `/api/openrouter`.
- Produk sekarang Pro-only; tabel `subscriptions` tetap dipakai untuk status akun Pro.
- Tema gelap/terang dan warna aksen custom disimpan di browser lewat `localStorage`.
