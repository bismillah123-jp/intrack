# DompetRapi

DompetRapi adalah MVP SaaS pengelolaan keuangan pribadi berbasis Vite + React. App memakai Supabase untuk auth/database, Chart.js untuk grafik, dan Lucide React untuk ikon.

## Dompet Emas

- Jenis dompet `Emas` menyimpan jumlah aset dalam gram melalui kolom `wallets.gold_grams`.
- Nilai rupiah dihitung dari harga `perGram` pada `https://api-harga.vercel.app/api/harga/emas`.
- Harga diperiksa setiap 5 detik dan harga terakhir disimpan di browser sebagai fallback saat koneksi terputus.
- Nilai emas ikut dihitung dalam aset, net worth, dan konteks AI Advisor.
- Jalankan ulang `supabase/schema.sql` pada project lama agar tipe `gold` dan kolom `gold_grams` tersedia.

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
VITE_AI_EXECUTE_URL=/api/v1/ai-execute
GROQ_API_KEY=your-groq-api-key
GEMINI_API_KEY=your-gemini-api-key
BIGMODEL_API_KEY=your-bigmodel-api-key
```

## Multi-provider AI

Fitur AI Pro memakai Vercel Serverless Function di `api/openrouter.js`. Nama endpoint `/api/openrouter` tetap dipertahankan agar frontend lama tetap kompatibel.

- AI Advisor dan laporan memakai Groq `qwen/qwen3-32b`.
- Request teks ringan memakai Groq `llama-3.1-8b-instant`.
- Scan struk/gambar memakai Gemini `gemini-2.5-flash-lite`.
- Jika provider utama gagal, terkena rate limit, atau key belum tersedia, sistem otomatis fallback ke BigModel `glm-4.7-flash` atau `glm-4.6v-flash`.
- AI Chat/Advisor memakai streaming response. Jika koneksi terputus, teks parsial terakhir tetap ditampilkan di chat.
- Fallback streaming hanya dilakukan sebelum teks pertama diterima agar jawaban dari dua model tidak tercampur.

Untuk production di Vercel, tambahkan environment variable server:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GROQ_API_KEY=your-groq-api-key
GEMINI_API_KEY=your-gemini-api-key
BIGMODEL_API_KEY=your-bigmodel-api-key
```

Jangan menaruh API key AI di `VITE_` env karena nilai `VITE_` ikut masuk ke bundle browser. Endpoint juga menerima `GOOGLE_AI_API_KEY` dan `ZHIPU_API_KEY` sebagai alias server-only.

## AI Executor Server

AI Chat dan Scan Struk memakai executor backend di `api/v1/ai-execute.js` agar AI bisa membaca konteks finance user dan mengeksekusi aksi ke database dengan aman.

- Endpoint production: `/v1/ai-execute`
- Endpoint Vercel function langsung: `/api/v1/ai-execute`
- Frontend bisa diarahkan ke endpoint aktif lewat `VITE_AI_EXECUTE_URL` atau `AI_EXECUTE_URL` di `config.js`.
- Payload app: `{ "message": "catat kopi 25rb dari gopay", "image_base64": "data:image/jpeg;base64,..." }`
- Header app wajib: `Authorization: Bearer <supabase_access_token>`
- Aksi yang didukung: catat transaksi, hapus transaksi dengan restore saldo, transfer antar dompet, buat dompet, buat kategori, buat budget, ringkasan saldo, harga emas, insight finance, dan scan struk otomatis.
- Frontend otomatis refresh data setelah response `changed: true`.
- Semua LLM, OCR struk, intent finance, dan operasi Supabase terjadi di backend DompetRapi.

Environment variable server DompetRapi yang wajib untuk executor:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GROQ_API_KEY=your-groq-api-key
GEMINI_API_KEY=your-gemini-api-key
BIGMODEL_API_KEY=your-bigmodel-api-key
```

Channel eksternal seperti bot WhatsApp bisa dibuat nanti di folder/project terpisah sebagai proxy tipis ke endpoint yang sama. Untuk mode itu, endpoint juga mendukung token `WHATSAPP_BOT_TOKEN` dan mapping `whatsapp_user_links`.

## WhatsApp Bot

Folder `BOT/` berisi bot WhatsApp berbasis Baileys dari base `bismillah123-jp/whatsapp-bot-builder` yang sudah disederhanakan menjadi proxy DompetRapi.

```powershell
cd BOT
npm install
copy .env.example .env
npm start
```

Isi `BACKEND_API_TOKEN` di `BOT/.env` dengan nilai yang sama seperti `WHATSAPP_BOT_TOKEN` di env aplikasi finance.

Bot memakai mode konfirmasi untuk semua aksi yang mengubah data. Contoh: transaksi, dompet, kategori, budget, scan struk, dan hapus transaksi akan diminta persetujuan dulu; balas `ya` untuk eksekusi atau `batal` untuk membatalkan. Jika saldo dompet tidak cukup, transaksi pengeluaran ditolak sebelum masuk tahap konfirmasi.

Saat transaksi dihapus, saldo dompet dibalik otomatis: hapus pengeluaran menambah saldo, hapus pemasukan mengurangi saldo.

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
- AI memakai routing Groq + Gemini dengan BigModel sebagai fallback lewat `/api/openrouter`.
- Produk sekarang Pro-only; tabel `subscriptions` tetap dipakai untuk status akun Pro.
- Tema gelap/terang dan warna aksen custom disimpan di browser lewat `localStorage`.
