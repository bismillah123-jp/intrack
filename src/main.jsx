import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Bot,
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  Eye,
  EyeOff,
  FileSearch,
  Gauge,
  ImageUp,
  LayoutDashboard,
  LineChart,
  Loader2,
  LogIn,
  LogOut,
  Menu,
  Moon,
  Palette,
  Pencil,
  PiggyBank,
  Plus,
  ReceiptText,
  Ruler,
  ScanLine,
  SendHorizontal,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  Trash2,
  UserRound,
  WalletCards,
  X
} from "lucide-react";
import {
  Bar,
  Doughnut
} from "react-chartjs-2";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip
} from "chart.js";
import "./styles.css";

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const DEFAULT_CATEGORIES = [
  { name: "Gaji", type: "income", color: "#2f9e44", icon: "briefcase" },
  { name: "Bonus", type: "income", color: "#0f8b8d", icon: "sparkles" },
  { name: "Makanan", type: "expense", color: "#ff6b4a", icon: "utensils" },
  { name: "Transportasi", type: "expense", color: "#3867d6", icon: "car" },
  { name: "Tagihan", type: "expense", color: "#f2b705", icon: "receipt" },
  { name: "Belanja", type: "expense", color: "#8f5f3f", icon: "shopping-bag" },
  { name: "Hiburan", type: "expense", color: "#8b5cf6", icon: "music" },
  { name: "Kesehatan", type: "expense", color: "#d94841", icon: "heart-pulse" },
  { name: "Tabungan", type: "expense", color: "#2f9e44", icon: "piggy-bank" }
];

const WALLET_TYPES = [
  ["bank", "Bank"],
  ["ewallet", "E-wallet"],
  ["cash", "Cash"],
  ["credit_card", "Kartu kredit"],
  ["paylater", "PayLater"],
  ["investment", "Investasi"]
];

const NAV = [
  ["dashboard", LayoutDashboard, "Dashboard"],
  ["wallets", WalletCards, "Dompet"],
  ["transactions", ReceiptText, "Transaksi"],
  ["budgets", Ruler, "Budget"],
  ["goals", Target, "Goals"],
  ["pro", Sparkles, "Pro"]
];

const ACCENTS = [
  ["#0f766e", "Teal"],
  ["#2563eb", "Blue"],
  ["#7c3aed", "Violet"],
  ["#db2777", "Pink"],
  ["#ea580c", "Orange"],
  ["#16a34a", "Green"]
];

const DEFAULT_THEME = {
  mode: "light",
  accent: "#0f766e"
};

const initialUi = {
  route: getRoute(),
  navOpen: false,
  authMode: "login",
  walletEditId: null,
  budgetEditId: null,
  goalEditId: null,
  txType: "expense",
  toast: null,
  proTab: "chat",
  advisor: [
    {
      role: "assistant",
      text: "Halo, aku AI DompetRapi. Tanya apa saja soal cashflow, budget, utang, atau target tabunganmu."
    }
  ],
  receipt: [],
  report: []
};

const PRO_PLAN = {
  name: "Pro",
  price: "Rp149.000",
  suffix: "/tahun"
};

function App() {
  const [ui, setUi] = useState(initialUi);
  const [theme, setTheme] = useState(loadSavedTheme);
  const [boot, setBoot] = useState({ ready: false, demo: true, supabase: null, session: null, backend: "demo" });
  const [profile, setProfile] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [data, setData] = useState(emptyData());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    let alive = true;

    async function bootApp() {
      const config = await loadConfig();
      const hasConfig = Boolean(config?.SUPABASE_URL && config?.SUPABASE_ANON_KEY);
      const supabase = hasConfig ? createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY) : null;

      if (!supabase) {
        if (!alive) return;
        setProfile({ full_name: "Demo DompetRapi" });
        setSubscription({ plan: "pro", status: "demo" });
        setData(demoData());
        setBoot({ ready: true, demo: true, supabase: null, session: null, backend: "demo" });
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (!alive) return;
      setBoot({ ready: true, demo: false, supabase, session: sessionData.session, backend: "pending" });

      supabase.auth.onAuthStateChange((_event, session) => {
        setBoot((current) => ({ ...current, session, backend: session ? current.backend : "pending" }));
      });
    }

    bootApp();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const onHash = () => setUi((current) => ({ ...current, route: getRoute(), navOpen: false }));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [ui.route]);

  useEffect(() => {
    if (!boot.ready) return;
    if (boot.demo) return;
    if (!boot.session) {
      setProfile(null);
      setSubscription(null);
      setData(emptyData());
      return;
    }
    refreshData();
  }, [boot.ready, boot.demo, boot.session?.user?.id]);

  const metrics = useMemo(() => getMetrics(data), [data]);
  const budgets = useMemo(() => enrichBudgets(data), [data]);
  const isAppRoute = ui.route.startsWith("app/");
  const currentPage = isAppRoute ? ui.route.split("/")[1] || "dashboard" : "landing";
  const plan = "pro";
  const isPro = true;

  async function refreshData(message) {
    if (!boot.supabase || !boot.session) return;
    const supabase = boot.supabase;
    const userId = boot.session.user.id;

    try {
      const backend = await detectSupabaseBackend(supabase);
      if (backend === "fintrack") {
        await ensureFintrackSetup(supabase);
        const [walletRows, categoryRows, transactionRows, budgetRows] = await Promise.all([
          supabase.from("fintrack_wallets").select("*").order("created_at"),
          supabase.from("fintrack_categories").select("*").order("type", { ascending: false }).order("name"),
          supabase.from("fintrack_transactions").select("*").order("date", { ascending: false }).order("created_at", { ascending: false }),
          supabase.from("fintrack_budgets").select("*").order("created_at", { ascending: false })
        ]);

        const failed = [walletRows, categoryRows, transactionRows, budgetRows].find((result) => result.error);
        if (failed) throw failed.error;

        const mapped = mapFintrackData({
          wallets: walletRows.data || [],
          categories: categoryRows.data || [],
          transactions: transactionRows.data || [],
          budgets: budgetRows.data || []
        }, userId);
        setProfile({
          full_name: boot.session.user.user_metadata?.full_name || boot.session.user.email?.split("@")[0] || "Pengguna"
        });
        setSubscription({
          plan: "pro",
          status: "active"
        });
        setData(mapped);
        setBoot((current) => ({ ...current, backend }));
        if (message) notify(message);
        return;
      }

      await ensureUserSetup(supabase, boot.session.user);

      const [profileResult, subscriptionResult, wallets, categories, transactions, budgetRows, goals, aiEvents] =
        await Promise.all([
          supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
          supabase.from("subscriptions").select("*").eq("user_id", userId).maybeSingle(),
          supabase.from("wallets").select("*").eq("user_id", userId).order("created_at"),
          supabase.from("categories").select("*").eq("user_id", userId).order("type", { ascending: false }).order("name"),
          supabase.from("transactions").select("*").eq("user_id", userId).order("transaction_date", { ascending: false }).order("created_at", { ascending: false }),
          supabase.from("budgets").select("*").eq("user_id", userId).order("period_start", { ascending: false }),
          supabase.from("goals").select("*").eq("user_id", userId).order("deadline"),
          supabase.from("ai_events").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(12)
        ]);

      const failed = [profileResult, subscriptionResult, wallets, categories, transactions, budgetRows, goals, aiEvents].find((result) => result.error);
      if (failed) throw failed.error;

      setProfile(profileResult.data);
      setSubscription(subscriptionResult.data);
      setData({
        wallets: wallets.data || [],
        categories: categories.data || [],
        transactions: transactions.data || [],
        budgets: budgetRows.data || [],
        goals: goals.data || [],
        aiEvents: aiEvents.data || []
      });
      setBoot((current) => ({ ...current, backend }));
      if (message) notify(message);
    } catch (error) {
      console.error(error);
      notify("Gagal memuat data. Cek config dan schema Supabase.");
    }
  }

  function notify(message) {
    setUi((current) => ({ ...current, toast: message }));
    window.setTimeout(() => setUi((current) => ({ ...current, toast: null })), 3200);
  }

  function guardDemo() {
    if (!boot.demo) return false;
    notify("Demo mode read-only. Isi config.js untuk menyimpan data.");
    return true;
  }

  async function signIn(values) {
    if (!boot.supabase) {
      notify("Supabase belum dikonfigurasi. Isi config.js atau .env untuk mengaktifkan auth.");
      return;
    }
    const payload = {
      email: values.email,
      password: values.password
    };
    const { error } = ui.authMode === "login"
      ? await boot.supabase.auth.signInWithPassword(payload)
      : await boot.supabase.auth.signUp({
        ...payload,
        options: { data: { full_name: values.full_name || values.email?.split("@")[0] || "Pengguna" } }
      });
    if (error) return notify(error.message);
    notify(ui.authMode === "login" ? "Berhasil masuk." : "Akun dibuat. Cek email jika konfirmasi aktif.");
    go("app/dashboard");
  }

  async function signInGoogle() {
    if (!boot.supabase) {
      notify("Supabase belum dikonfigurasi. Isi config.js atau .env untuk mengaktifkan Google OAuth.");
      return;
    }
    const { error } = await boot.supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}${location.pathname}#/app/dashboard` }
    });
    if (error) notify(error.message);
  }

  async function signOut() {
    if (boot.supabase) await boot.supabase.auth.signOut();
    go("");
  }

  async function saveWallet(values) {
    if (guardDemo()) return;
    if (boot.backend === "fintrack") {
      const payload = {
        id: values.id || makeId("wallet"),
        name: values.name,
        kind: toFintrackWalletKind(values.type),
        balance: Math.max(0, number(values.balance)),
        color: values.color || theme.accent
      };
      const query = values.id
        ? boot.supabase.from("fintrack_wallets").update(payload).eq("id", values.id)
        : boot.supabase.from("fintrack_wallets").insert(payload);
      const { error } = await query;
      if (error) return notify(error.message);
      setUi((current) => ({ ...current, walletEditId: null }));
      refreshData("Dompet tersimpan ke Supabase.");
      return;
    }
    const payload = {
      user_id: boot.session.user.id,
      name: values.name,
      type: values.type,
      balance: number(values.balance),
      color: values.color || "#0f8b8d"
    };
    const query = values.id
      ? boot.supabase.from("wallets").update(payload).eq("id", values.id).eq("user_id", boot.session.user.id)
      : boot.supabase.from("wallets").insert(payload);
    const { error } = await query;
    if (error) return notify(error.message);
    setUi((current) => ({ ...current, walletEditId: null }));
    refreshData("Dompet disimpan.");
  }

  async function saveTransaction(values) {
    if (guardDemo()) return;
    const wallet = data.wallets.find((item) => item.id === values.wallet_id);
    const amount = number(values.amount);
    if (boot.backend === "fintrack") {
      const payload = {
        id: makeId("tx"),
        title: values.note || (values.type === "income" ? "Pemasukan" : "Pengeluaran"),
        wallet_id: values.wallet_id,
        category_id: values.category_id,
        type: values.type,
        amount,
        date: values.transaction_date,
        note: values.note || null
      };
      const { error } = await boot.supabase.from("fintrack_transactions").insert(payload);
      if (error) return notify(error.message);
      if (wallet) {
        const delta = values.type === "income" ? amount : -amount;
        const nextBalance = Math.max(0, number(wallet.balance) + delta);
        await boot.supabase.from("fintrack_wallets").update({ balance: nextBalance }).eq("id", wallet.id);
      }
      refreshData("Transaksi tersimpan ke Supabase.");
      return;
    }
    const payload = {
      user_id: boot.session.user.id,
      wallet_id: values.wallet_id,
      category_id: values.category_id,
      type: values.type,
      amount,
      transaction_date: values.transaction_date,
      note: values.note || null
    };
    const { error } = await boot.supabase.from("transactions").insert(payload);
    if (error) return notify(error.message);
    if (wallet) {
      const delta = values.type === "income" ? amount : -amount;
      await boot.supabase.from("wallets").update({ balance: number(wallet.balance) + delta }).eq("id", wallet.id).eq("user_id", boot.session.user.id);
    }
    refreshData("Transaksi ditambahkan.");
  }

  async function saveBudget(values) {
    if (guardDemo()) return;
    if (boot.backend === "fintrack") {
      const payload = {
        id: values.id || makeId("budget"),
        category_id: values.category_id,
        amount: number(values.amount),
        period: "monthly"
      };
      const query = values.id
        ? boot.supabase.from("fintrack_budgets").update(payload).eq("id", values.id)
        : boot.supabase.from("fintrack_budgets").insert(payload);
      const { error } = await query;
      if (error) return notify(error.message);
      setUi((current) => ({ ...current, budgetEditId: null }));
      refreshData("Budget tersimpan ke Supabase.");
      return;
    }
    const payload = {
      user_id: boot.session.user.id,
      category_id: values.category_id,
      period_start: periodStart(),
      method: values.method,
      amount: number(values.amount),
      percentage: values.percentage ? number(values.percentage) : null
    };
    const query = values.id
      ? boot.supabase.from("budgets").update(payload).eq("id", values.id).eq("user_id", boot.session.user.id)
      : boot.supabase.from("budgets").upsert(payload, { onConflict: "user_id,category_id,period_start" });
    const { error } = await query;
    if (error) return notify(error.message);
    setUi((current) => ({ ...current, budgetEditId: null }));
    refreshData("Budget disimpan.");
  }

  async function saveGoal(values) {
    if (guardDemo()) return;
    if (boot.backend === "fintrack") {
      const id = values.id || makeId("goal");
      const goals = readFintrackGoals(boot.session.user.id).filter((goal) => goal.id !== id);
      goals.push({
        id,
        name: values.name,
        target_amount: number(values.target_amount),
        current_amount: number(values.current_amount),
        deadline: values.deadline
      });
      writeFintrackGoals(boot.session.user.id, goals);
      setUi((current) => ({ ...current, goalEditId: null }));
      refreshData("Goal disimpan lokal untuk schema fintrack.");
      return;
    }
    const payload = {
      user_id: boot.session.user.id,
      name: values.name,
      target_amount: number(values.target_amount),
      current_amount: number(values.current_amount),
      deadline: values.deadline
    };
    const query = values.id
      ? boot.supabase.from("goals").update(payload).eq("id", values.id).eq("user_id", boot.session.user.id)
      : boot.supabase.from("goals").insert(payload);
    const { error } = await query;
    if (error) return notify(error.message);
    setUi((current) => ({ ...current, goalEditId: null }));
    refreshData("Goal disimpan.");
  }

  async function deleteRow(table, id, message) {
    if (guardDemo()) return;
    if (!window.confirm("Hapus data ini?")) return;
    if (boot.backend === "fintrack") {
      const tableMap = {
        wallets: "fintrack_wallets",
        transactions: "fintrack_transactions",
        budgets: "fintrack_budgets"
      };
      if (table === "goals") {
        const goals = readFintrackGoals(boot.session.user.id).filter((goal) => goal.id !== id);
        writeFintrackGoals(boot.session.user.id, goals);
        refreshData(message);
        return;
      }
      const mappedTable = tableMap[table];
      if (!mappedTable) return notify("Tabel tidak didukung schema fintrack.");
      const { error } = await boot.supabase.from(mappedTable).delete().eq("id", id);
      if (error) return notify(error.message);
      refreshData(message);
      return;
    }
    const { error } = await boot.supabase.from(table).delete().eq("id", id).eq("user_id", boot.session.user.id);
    if (error) return notify(error.message);
    refreshData(message);
  }

  async function logAi(kind, output, prompt = null) {
    if (boot.demo || !boot.supabase || !boot.session) return;
    await boot.supabase.from("ai_events").insert({
      user_id: boot.session.user.id,
      kind,
      prompt,
      output
    });
  }

  function runAdvisor(question) {
    const userQuestion = String(question || "").trim() || "Analisis kondisi keuangan bulan ini dan beri 3 saran paling penting.";
    const loadingId = `loading-${Date.now()}`;
    runOpenRouter({
      slot: "advisor",
      prompt: userQuestion,
      system: "Kamu adalah AI financial advisor DompetRapi untuk pengguna Indonesia. Jawab dalam bahasa Indonesia natural, praktis, singkat, dan berbasis data. Hindari klaim kepastian investasi. Jangan pakai markdown tebal, tanda *** atau karakter China/Jepang/Korea.",
      context: buildFinanceContext(data, budgets, metrics),
      onStart: () => {
        setUi((current) => ({
          ...current,
          proTab: "chat",
          advisor: [
            ...normalizeChatMessages(current.advisor),
            { role: "user", text: userQuestion },
            { id: loadingId, role: "assistant", text: "Sedang membaca data keuanganmu...", loading: true }
          ]
        }));
      },
      onSuccess: (lines) => {
        setUi((current) => ({
          ...current,
          advisor: replaceLoadingMessage(current.advisor, loadingId, {
            role: "assistant",
            text: lines.join("\n")
          })
        }));
      },
      onError: (lines) => {
        setUi((current) => ({
          ...current,
          advisor: replaceLoadingMessage(current.advisor, loadingId, {
            role: "assistant",
            text: lines.join("\n")
          })
        }));
      }
    });
  }

  function runReceipt(text, imageUrl) {
    runOpenRouter({
      slot: "receipt",
      prompt: text || "Baca struk dari gambar ini. Ekstrak item, total, dan sarankan kategori transaksi.",
      imageUrl,
      system: "Kamu adalah receipt scanner DompetRapi. Ekstrak item, total, tanggal jika ada, dan kategori transaksi. Jawab ringkas dalam bahasa Indonesia.",
      context: buildFinanceContext(data, budgets, metrics)
    });
  }

  function runReport(extraPrompt) {
    const focus = String(extraPrompt || "").trim();
    runOpenRouter({
      slot: "report",
      prompt: `Buat laporan analisis keuangan bulan ini. Sertakan ringkasan, risiko utama, dan aksi prioritas.${focus ? ` Fokus tambahan: ${focus}` : ""}`,
      system: "Kamu adalah report analyzer DompetRapi. Buat laporan dalam bahasa Indonesia dengan kalimat pendek dan actionable. Jangan pakai markdown tebal, tanda *** atau karakter China/Jepang/Korea.",
      context: buildFinanceContext(data, budgets, metrics)
    });
  }

  async function runOpenRouter({ slot, prompt, system, context, imageUrl, onStart, onSuccess, onError }) {
    if (onStart) {
      onStart();
    } else {
      setUi((current) => ({
        ...current,
        [slot]: ["Menghubungi OpenRouter Kimi K2.6..."]
      }));
    }

    try {
      const response = await fetch("/api/openrouter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, system, context, imageUrl })
      });
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("Endpoint /api/openrouter belum tersedia di server lokal. Deploy ke Vercel atau jalankan dengan Vercel dev");
      }
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "OpenRouter gagal merespons.");
      const lines = splitAiText(payload.text);
      if (onSuccess) {
        onSuccess(lines, payload);
      } else {
        setUi((current) => ({ ...current, [slot]: lines }));
      }
      logAi(slot, { lines, model: "moonshotai/kimi-k2.6:free" }, prompt);
    } catch (error) {
      const reason = (error.message || "OpenRouter belum bisa dihubungi").replace(/[.]+$/, "");
      const fallback = `AI belum bisa aktif: ${reason}. Set OPENROUTER_API_KEY di environment Vercel atau jalankan lewat server yang punya /api/openrouter.`;
      const lines = splitAiText(fallback);
      if (onError) {
        onError(lines);
      } else {
        setUi((current) => ({ ...current, [slot]: lines }));
      }
      notify(fallback);
    }
  }

  if (!boot.ready) return <Splash />;

  if (ui.route === "login") {
    return (
      <ShellToast message={ui.toast}>
        <AuthView
          demo={boot.demo}
          theme={theme}
          setTheme={setTheme}
          mode={ui.authMode}
          setMode={(authMode) => setUi((current) => ({ ...current, authMode }))}
          onSubmit={signIn}
          onGoogle={signInGoogle}
        />
      </ShellToast>
    );
  }

  if (isAppRoute) {
    if (!boot.demo && !boot.session) {
      go("login");
      return null;
    }

    return (
      <ShellToast message={ui.toast}>
        <Workspace
          page={currentPage}
          ui={ui}
          setUi={setUi}
          data={data}
          budgets={budgets}
          metrics={metrics}
          plan={plan}
          isPro={isPro}
          demo={boot.demo}
          profile={profile}
          theme={theme}
          setTheme={setTheme}
          backend={boot.backend}
          onLogout={signOut}
          onWallet={saveWallet}
          onTransaction={saveTransaction}
          onBudget={saveBudget}
          onGoal={saveGoal}
          onDelete={deleteRow}
          onAdvisor={runAdvisor}
          onReceipt={runReceipt}
          onReport={runReport}
        />
      </ShellToast>
    );
  }

  return (
    <ShellToast message={ui.toast}>
      <Landing theme={theme} setTheme={setTheme} />
    </ShellToast>
  );
}

function Splash() {
  return (
    <main className="splash">
      <Brand />
      <Loader2 className="spin" size={24} />
    </main>
  );
}

function ShellToast({ children, message }) {
  return (
    <>
      {children}
      {message ? <div className="toast">{message}</div> : null}
    </>
  );
}

function Landing({ theme, setTheme }) {
  const featureItems = [
    [WalletCards, "Semua dompet", "Bank, e-wallet, cash, kartu kredit, PayLater, dan investasi dalam satu workspace."],
    [Ruler, "Budget presisi", "Fixed atau percentage budgeting dengan warning saat kategori mulai panas."],
    [Bot, "AI Pro aktif", "Advisor, scanner struk, dan report analyzer memakai OpenRouter Kimi K2.6."],
    [LineChart, "Laporan jernih", "Tren pemasukan, pengeluaran, net worth, dan kategori terbesar langsung terbaca."],
    [Target, "Goals aktif", "Target nominal, deadline, dan progress real-time untuk rencana nabung."],
    [ShieldCheck, "Manual-first", "Tidak meminta password bank. Saldo dan transaksi dicatat manual oleh pengguna."]
  ];

  return (
    <div className="marketing">
      <header className="topbar">
        <Brand />
        <nav className="topnav">
          <a href="#fitur">Fitur</a>
          <a href="#harga">Harga</a>
          <a href="#faq">FAQ</a>
          <ThemeControls theme={theme} setTheme={setTheme} compact />
          <button className="btn ghost" onClick={() => go("login")}>Masuk</button>
        </nav>
      </header>

      <section className="hero-modern">
        <div className="hero-copy">
          <span className="pill">Personal finance SaaS</span>
          <h1>DompetRapi</h1>
          <p>
            Workspace keuangan pribadi yang bersih, cepat, dan siap dipakai untuk mencatat dompet,
            transaksi, budget, goals, laporan, dan AI Pro yang terhubung ke OpenRouter.
          </p>
          <div className="hero-actions">
            <button className="btn primary" onClick={() => go("app/dashboard")}>
              Buka dashboard <ChevronRight size={18} />
            </button>
            <button className="btn ghost" onClick={() => document.getElementById("fitur")?.scrollIntoView({ behavior: "smooth" })}>
              Lihat fitur
            </button>
          </div>
          <ThemeControls theme={theme} setTheme={setTheme} />
        </div>
        <ProductScene />
      </section>

      <section className="trust-strip">
        <div>
          <strong>Manual-first</strong>
          <span>Tidak ada sync rekening otomatis</span>
        </div>
        <div>
          <strong>Supabase-ready</strong>
          <span>Auth, RLS, dan database schema tersedia</span>
        </div>
        <div>
          <strong>React + Vite</strong>
          <span>Framework modern tanpa CDN app code</span>
        </div>
      </section>

      <section id="fitur" className="section">
        <SectionIntro label="Fitur" title="Kelola uang tanpa tampilan yang berisik." copy="Setiap halaman dibuat untuk dipindai cepat, bukan untuk membuat pengguna tersesat di banyak dekorasi." />
        <div className="feature-grid">
          {featureItems.map(([Icon, title, copy]) => (
            <article className="feature-tile" key={title}>
              <Icon size={22} />
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="harga" className="section split-section">
        <SectionIntro label="Plan" title="Satu plan saja: Pro." copy="Semua fitur langsung aktif: dashboard, budget, goals, OpenRouter AI, dan scanner struk." />
        <div className="pricing-modern">
          <PlanCard featured name={PRO_PLAN.name} price={PRO_PLAN.price} items={["Dompet dan transaksi tanpa batas", "Budget, goals, dan health score", "AI advisor OpenRouter", "Scan struk teks atau image URL", "Report analyzer AI"]} />
        </div>
      </section>

      <section id="faq" className="section faq-modern">
        <SectionIntro label="FAQ" title="Hal penting sebelum dipakai." copy="Versi ini fokus pada MVP SaaS yang aman dan mudah dikembangkan." />
        {[
          ["Apakah sync otomatis ke bank?", "Tidak. Versi awal memakai input manual dan tidak meminta kredensial bank."],
          ["Apakah AI sudah memakai API sungguhan?", "Ya. AI Pro memanggil OpenRouter lewat endpoint serverless /api/openrouter."],
          ["Bisa disambungkan ke Supabase?", "Bisa. Jalankan schema.sql, copy config.example.js ke config.js, lalu isi Supabase URL dan anon key."]
        ].map(([q, a]) => (
          <details key={q}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </section>
    </div>
  );
}

function ProductScene() {
  return (
    <div className="product-scene" aria-label="Preview dashboard DompetRapi">
      <div className="scene-window">
        <div className="scene-head">
          <span></span>
          <span></span>
          <span></span>
          <b>Dashboard</b>
        </div>
        <div className="scene-body">
          <aside>
            <i></i><i></i><i></i><i></i>
          </aside>
          <main>
            <div className="scene-card big">
              <small>Saldo bersih</small>
              <strong>Rp 18,4 jt</strong>
              <div className="scene-bars">
                {[42, 58, 46, 72, 64, 82].map((height, index) => <span key={index} style={{ height: `${height}%` }} />)}
              </div>
            </div>
            <div className="scene-card">
              <small>Budget</small>
              <strong>68%</strong>
              <em></em>
            </div>
            <div className="scene-card">
              <small>Health</small>
              <strong>86/100</strong>
              <em></em>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function ThemeControls({ theme, setTheme, compact = false }) {
  const toggleMode = () => setTheme((current) => ({
    ...current,
    mode: current.mode === "dark" ? "light" : "dark"
  }));

  return (
    <div className={compact ? "theme-controls compact" : "theme-controls"} aria-label="Pengaturan tema">
      <button className="icon-btn" onClick={toggleMode} aria-label="Ganti tema gelap terang">
        {theme.mode === "dark" ? <Sun size={17} /> : <Moon size={17} />}
      </button>
      <div className="accent-dots" aria-label="Warna tema">
        {ACCENTS.map(([color, label]) => (
          <button
            key={color}
            className={theme.accent === color ? "active" : ""}
            style={{ "--dot": color }}
            onClick={() => setTheme((current) => ({ ...current, accent: color }))}
            aria-label={`Tema ${label}`}
          />
        ))}
        <label className="custom-color" title="Pilih warna custom">
          <Palette size={15} />
          <input
            type="color"
            value={theme.accent}
            onChange={(event) => setTheme((current) => ({ ...current, accent: event.target.value }))}
          />
        </label>
      </div>
    </div>
  );
}

function ThemeModeButton({ theme, setTheme }) {
  return (
    <button
      className="icon-btn"
      onClick={() => setTheme((current) => ({ ...current, mode: current.mode === "dark" ? "light" : "dark" }))}
      aria-label="Ganti tema"
    >
      {theme.mode === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

function Workspace(props) {
  const {
    page,
    ui,
    setUi,
    data,
    budgets,
    metrics,
    plan,
    isPro,
    demo,
    profile,
    theme,
    setTheme,
    backend,
    onLogout
  } = props;
  const [mobileNav, setMobileNav] = useState(false);

  const titleMap = {
    dashboard: ["Dashboard", "Angka penting bulan ini dalam satu layar."],
    wallets: ["Dompet", "Saldo manual dari semua tempat uang."],
    transactions: ["Transaksi", "Catat pemasukan dan pengeluaran harian."],
    budgets: ["Budget", "Pantau limit kategori bulan berjalan."],
    goals: ["Goals", "Target tabungan dengan deadline yang jelas."],
    pro: ["AI Pro", "Health score, advisor, scanner struk, dan report analyzer OpenRouter."],
    account: ["Akun", "Kelola profil, tema, dan preferensi aplikasi."]
  };
  const [title, subtitle] = titleMap[page] || titleMap.dashboard;

  return (
    <div className="workspace">
      {mobileNav ? <button className="sidebar-scrim" aria-label="Tutup menu" onClick={() => setMobileNav(false)} /> : null}
      <aside className={`sidebar ${mobileNav ? "open" : ""}`} aria-hidden={!mobileNav ? undefined : false}>
        <div className="sidebar-head">
          <Brand />
          <button className="icon-btn mobile-only" onClick={() => setMobileNav(false)} aria-label="Tutup menu">
            <X size={18} />
          </button>
        </div>
        <nav className="side-nav">
          {NAV.map(([key, Icon, label]) => (
            <button key={key} className={key === page ? "active" : ""} onClick={() => go(`app/${key}`)}>
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
        <div className="account-card">
          <span className={`pill ${plan === "pro" ? "gold" : ""}`}>{demo ? "Demo Pro" : plan}</span>
          <span className="mini-badge">{demo ? "Demo data" : backend === "fintrack" ? "Supabase fintrack" : "Supabase app"}</span>
          <strong>{profile?.full_name || "Pengguna DompetRapi"}</strong>
          <ThemeControls theme={theme} setTheme={setTheme} />
          {!demo ? (
            <button className="btn quiet" onClick={onLogout}>
              <LogOut size={16} /> Keluar
            </button>
          ) : null}
        </div>
      </aside>

      <main className="workspace-main">
        <header className="mobile-header">
          <button className="icon-btn" onClick={() => setMobileNav(true)} aria-label="Buka menu">
            <Menu size={19} />
          </button>
          <Brand />
          <div className="mobile-header-actions">
            <button className="icon-btn" onClick={() => go("app/account")} aria-label="Buka akun">
              <UserRound size={19} />
            </button>
            <ThemeModeButton theme={theme} setTheme={setTheme} />
          </div>
        </header>

        {demo ? (
          <div className="demo-bar">
            <BadgeCheck size={18} />
            <span>Demo mode read-only. Tambahkan config.js untuk menyimpan data ke Supabase.</span>
            <button className="btn quiet" onClick={() => go("")}>Landing</button>
          </div>
        ) : null}

        {page !== "dashboard" ? (
          <div className="page-head">
            <div>
              <p className="kicker">DompetRapi</p>
              <h2>{title}</h2>
              <span>{subtitle}</span>
            </div>
            <HeaderAction page={page} />
          </div>
        ) : null}

        {page === "dashboard" && <Dashboard data={data} budgets={budgets} metrics={metrics} theme={theme} setUi={setUi} profile={profile} />}
        {page === "wallets" && <Wallets {...props} />}
        {page === "transactions" && <Transactions {...props} />}
        {page === "budgets" && <Budgets {...props} />}
        {page === "goals" && <Goals {...props} />}
        {page === "pro" && <ProLab {...props} />}
        {page === "account" && <AccountPanel {...props} />}
      </main>
      <MobileBottomNav page={page} />
    </div>
  );
}

function HeaderAction({ page }) {
  if (page === "transactions") return <button className="btn primary" onClick={openTransactionComposer}><Plus size={18} /> Transaksi</button>;
  return <button className="btn ghost" onClick={() => go("app/pro")}><Sparkles size={18} /> AI Pro</button>;
}

function openTransactionComposer() {
  go("app/transactions");
  window.setTimeout(() => document.querySelector("[data-amount-input]")?.focus(), 120);
}

function MobileBottomNav({ page }) {
  const items = [
    ["dashboard", LayoutDashboard, "Dashboard"],
    ["wallets", WalletCards, "Dompet"],
    ["add", Plus, "Tambah"],
    ["transactions", ReceiptText, "Transaksi"],
    ["account", UserRound, "Akun"]
  ];

  return (
    <nav className="mobile-dock" aria-label="Navigasi utama mobile">
      {items.map(([key, Icon, label]) => {
        const isAdd = key === "add";
        const active = key === page || (key === "wallets" && page === "wallets");
        return (
          <button
            key={key}
            className={`${isAdd ? "dock-add" : ""} ${active ? "active" : ""}`}
            onClick={isAdd ? openTransactionComposer : () => go(`app/${key}`)}
            aria-label={isAdd ? "Tambah transaksi" : label}
          >
            <span><Icon size={isAdd ? 34 : 22} /></span>
            <small>{label}</small>
          </button>
        );
      })}
    </nav>
  );
}

function Dashboard({ data, budgets, metrics, theme, setUi, profile }) {
  const [showBalance, setShowBalance] = useState(true);
  const hour = new Date().getHours();
  const greeting = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 18 ? 'Selamat sore' : 'Selamat malam';
  const userName = profile?.full_name ? profile.full_name.split(' ')[0] : 'Pengguna';
  const trend = trendData(data);
  const topExpense = topExpenseCategory(data);
  const totalBudgetLimit = sum(budgets, "limit");
  const totalBudgetSpent = sum(budgets, "spent");
  const budgetBase = totalBudgetLimit || metrics.monthlyIncome || Math.max(metrics.monthlyExpense, 1);
  const expenseProgress = Math.round((metrics.monthlyExpense / budgetBase) * 100);
  const budgetRealization = totalBudgetLimit ? Math.round((totalBudgetSpent / totalBudgetLimit) * 100) : 0;
  const remainingBudget = Math.max(0, budgetBase - metrics.monthlyExpense);
  const runway = metrics.monthlyExpense ? metrics.assets / metrics.monthlyExpense : 0;
  const billBudget = budgets.find((budget) => /tagihan|listrik|internet|cicilan|sewa/i.test(budget.categoryName));
  const upcomingBill = billBudget ? Math.max(0, number(billBudget.limit) - number(billBudget.spent)) : 0;
  const latestTransactions = data.transactions.slice(0, 5);
  const menuItems = [
    [Ruler, "Budget", "Limit kategori", () => go("app/budgets")],
    [ScanLine, "Scanner", "Scan struk", () => openProTab(setUi, "receipt")],
    [Target, "Goals", "Target nabung", () => go("app/goals")],
    [WalletCards, "Aset", "Semua saldo", () => go("app/wallets")],
    [CreditCard, "Utang", "Kartu & PayLater", () => go("app/wallets")],
    [CircleDollarSign, "Investasi", "Pantau aset", () => go("app/wallets")],
    [Bot, "AI Advisor", "Chat personal", () => openProTab(setUi, "chat")],
    [BarChart3, "Laporan", "Analisis AI", () => openProTab(setUi, "report")]
  ];

  return (
    <div className="dashboard-home">
      <section className="balance-hero">
        <div className="balance-hero-top">
          <div>
            <span>{greeting}, {userName}</span>
            <h2>{showBalance ? money(metrics.netWorth) : "Rp •••••••"}</h2>
          </div>
          <button className="hero-lock" aria-label="Toggle saldo" onClick={() => setShowBalance(!showBalance)}>
            {showBalance ? <Eye size={20} /> : <EyeOff size={20} />}
          </button>
        </div>

        <div className="balance-row">
          <div>
            <small>Pemasukan</small>
            <strong className="income-text">{shortMoney(metrics.monthlyIncome)}</strong>
          </div>
          <div>
            <small>Pengeluaran</small>
            <strong className="expense-text">{shortMoney(metrics.monthlyExpense)}</strong>
          </div>
        </div>

        <div className="hero-progress">
          <div>
            <span>Budget tersisa</span>
            <b>{money(remainingBudget)}</b>
          </div>
          <Progress value={expenseProgress} danger={expenseProgress > 100} />
        </div>
      </section>

      <section className="panel main-menu-panel">
        <div className="menu-title">
          <h3>Menu Utama</h3>
          <button className="btn quiet" onClick={() => go("app/account")}><Palette size={16} /> Ubah</button>
        </div>
        <div className="main-menu-grid">
          {menuItems.map(([Icon, label, caption, action]) => (
            <button className="menu-action" key={label} onClick={action}>
              <span><Icon size={25} /></span>
              <strong>{label}</strong>
              <small>{caption}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="dashboard-insights">
        <article className="panel dash-card progress-card">
          <PanelHead title="Progres pengeluaran" badge={`${expenseProgress}%`} />
          <div className="progress-ring" style={{ "--value": `${Math.min(expenseProgress, 100)}%` }}>
            <strong>{Math.min(expenseProgress, 999)}%</strong>
            <span>{periodLabel()}</span>
          </div>
          <Progress value={expenseProgress} danger={expenseProgress > 100} />
          <p>{money(metrics.monthlyExpense)} terpakai dari {money(budgetBase)}.</p>
        </article>

        <article className="panel dash-card activity-card">
          <PanelHead title="Aktivitas bulanan" badge="6 bulan" />
          <div className="mini-chart">
            <Bar
              data={{
                labels: trend.map((item) => item.label),
                datasets: [
                  { label: "Pemasukan", data: trend.map((item) => item.income), backgroundColor: theme.accent, borderRadius: 10 },
                  { label: "Pengeluaran", data: trend.map((item) => item.expense), backgroundColor: "#fb7185", borderRadius: 10 }
                ]
              }}
              options={chartOptions}
            />
          </div>
        </article>

        <article className="panel dash-card latest-card">
          <PanelHead title="Transaksi terbaru" badge={`${data.transactions.length} transaksi`} />
          <div className="stack">
            {latestTransactions.length ? latestTransactions.map((tx) => <TransactionItem key={tx.id} tx={tx} data={data} />) : <Empty title="Belum ada transaksi" copy="Tambahkan pemasukan atau pengeluaran pertama." />}
          </div>
        </article>

        <InsightCard icon={ArrowDownLeft} label="Total pemasukan" value={money(metrics.monthlyIncome)} tone="income" />
        <InsightCard icon={ArrowUpRight} label="Total pengeluaran" value={money(metrics.monthlyExpense)} tone="expense" />
        <InsightCard icon={PiggyBank} label="Runway dana darurat" value={`${runway.toFixed(1)} bulan`} copy={`Aset likuid ${money(metrics.assets)}`} />
        <InsightCard icon={CalendarDays} label="Tagihan mendatang" value={money(upcomingBill)} copy={billBudget?.categoryName || "Belum ada budget tagihan"} />
        <InsightCard icon={Activity} label="Pengeluaran terbesar" value={topExpense?.name || "Belum ada"} copy={topExpense ? money(topExpense.total) : "Catat transaksi dulu"} tone="expense" />

        <article className="panel dash-card budget-realization">
          <PanelHead title="Realisasi anggaran" badge={`${budgetRealization}%`} />
          <div className="budget-realization-list">
            {budgets.length ? budgets.slice(0, 4).map((budget) => <BudgetLine key={budget.id} budget={budget} />) : <Empty title="Belum ada budget" copy="Buat limit kategori bulan ini." />}
          </div>
        </article>
      </section>
    </div>
  );
}

function openProTab(setUi, tab) {
  setUi((current) => ({ ...current, proTab: tab }));
  go("app/pro");
}

function InsightCard({ icon: Icon, label, value, copy, tone }) {
  return (
    <article className={`panel dash-card insight-card ${tone || ""}`}>
      <span className="insight-icon"><Icon size={19} /></span>
      <small>{label}</small>
      <strong>{value}</strong>
      {copy ? <p>{copy}</p> : null}
    </article>
  );
}

function AccountPanel({ profile, demo, plan, backend, theme, setTheme, onLogout }) {
  const shortcuts = [
    [LayoutDashboard, "Dashboard", "Ringkasan utama", () => go("app/dashboard")],
    [WalletCards, "Dompet", "Kelola saldo", () => go("app/wallets")],
    [ReceiptText, "Transaksi", "Riwayat & tambah", openTransactionComposer],
    [Sparkles, "AI Pro", "Chat dan scanner", () => go("app/pro")]
  ];

  return (
    <div className="account-view">
      <section className="panel account-hero">
        <div className="account-avatar">
          {(profile?.full_name || "DR").slice(0, 2).toUpperCase()}
        </div>
        <div>
          <span>Kelola akun</span>
          <h3>{profile?.full_name || "Pengguna DompetRapi"}</h3>
          <p>{demo ? "Demo mode aktif. Data hanya contoh dan tidak disimpan." : backend === "fintrack" ? "Supabase fintrack terhubung." : "Supabase app terhubung."}</p>
        </div>
        <span className={`pill ${plan === "pro" ? "gold" : ""}`}>{demo ? "Demo Pro" : plan}</span>
      </section>

      <section className="panel settings-panel">
        <PanelHead title="Pengaturan tampilan" badge="Tema" />
        <p>Pilih mode gelap/terang dan warna aksen yang paling nyaman buat kamu.</p>
        <ThemeControls theme={theme} setTheme={setTheme} />
      </section>

      <section className="panel account-shortcuts">
        <PanelHead title="Navigasi cepat" badge="Akun" />
        <div className="account-shortcut-grid">
          {shortcuts.map(([Icon, label, copy, action]) => (
            <button key={label} onClick={action}>
              <Icon size={21} />
              <strong>{label}</strong>
              <span>{copy}</span>
            </button>
          ))}
        </div>
      </section>

      {!demo ? (
        <button className="btn primary account-logout" onClick={onLogout}>
          <LogOut size={18} /> Keluar dari akun
        </button>
      ) : null}
    </div>
  );
}

function Wallets({ data, ui, setUi, demo, backend, onWallet, onDelete }) {
  const edit = data.wallets.find((item) => item.id === ui.walletEditId);

  return (
    <div className="two-col">
      <section className="panel form-panel">
        <PanelHead title={edit ? "Edit dompet" : "Tambah dompet"} badge={`${data.wallets.length} aktif`} />
        <SmartForm
          key={edit?.id || "new"}
          disabled={demo}
          defaults={edit}
          fields={[
            ["id", "hidden"],
            ["name", "text", "Nama dompet", "BCA Harian"],
            ["type", "select", "Jenis", backend === "fintrack" ? WALLET_TYPES.filter(([value]) => ["bank", "ewallet", "cash", "investment"].includes(value)) : WALLET_TYPES],
            ["balance", "number", "Saldo", "0"],
            ["color", "color", "Warna", "#0f766e"]
          ]}
          submitLabel={edit ? "Simpan" : "Tambah"}
          onSubmit={onWallet}
        />
      </section>
      <section className="cards-grid">
        {data.wallets.map((wallet) => (
          <article className="wallet-tile" key={wallet.id}>
            <div className="tile-top">
              <span className="wallet-swatch" style={{ background: wallet.color }} />
              <div>
                <h3>{wallet.name}</h3>
                <p>{walletType(wallet.type)}</p>
              </div>
            </div>
            <strong>{money(wallet.balance)}</strong>
            <div className="tile-actions">
              <button className="icon-btn" onClick={() => setUi((current) => ({ ...current, walletEditId: wallet.id }))}><Pencil size={16} /></button>
              <button className="icon-btn" disabled={demo} onClick={() => onDelete("wallets", wallet.id, "Dompet dihapus.")}><Trash2 size={16} /></button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

function Transactions({ data, ui, setUi, demo, onTransaction, onDelete }) {
  const categories = data.categories.filter((item) => item.type === ui.txType);

  return (
    <div className="two-col">
      <section className="panel form-panel">
        <PanelHead title="Tambah transaksi" badge={ui.txType === "income" ? "Pemasukan" : "Pengeluaran"} />
        <SmartForm
          disabled={demo}
          defaults={{ type: ui.txType, transaction_date: isoDate(new Date()) }}
          beforeSubmit={(values) => ({ ...values, type: ui.txType })}
          fields={[
            ["type", "select", "Tipe", [["expense", "Pengeluaran"], ["income", "Pemasukan"]], (value) => setUi((current) => ({ ...current, txType: value }))],
            ["amount", "number", "Nominal", "150000", undefined, "data-amount-input"],
            ["wallet_id", "select", "Dompet", data.wallets.map((item) => [item.id, item.name])],
            ["category_id", "select", "Kategori", categories.map((item) => [item.id, item.name])],
            ["transaction_date", "date", "Tanggal"],
            ["note", "text", "Catatan", "Makan siang"]
          ]}
          submitLabel="Catat"
          onSubmit={onTransaction}
        />
      </section>
      <section className="panel">
        <PanelHead title="Riwayat" badge={`${data.transactions.length} transaksi`} />
        <div className="stack">
          {data.transactions.length ? data.transactions.map((tx) => (
            <TransactionItem key={tx.id} tx={tx} data={data} onDelete={demo ? null : () => onDelete("transactions", tx.id, "Transaksi dihapus.")} />
          )) : <Empty title="Belum ada transaksi" copy="Riwayat akan muncul di sini." />}
        </div>
      </section>
    </div>
  );
}

function Budgets({ data, budgets, ui, setUi, demo, onBudget, onDelete }) {
  const edit = data.budgets.find((item) => item.id === ui.budgetEditId);
  const expenseCategories = data.categories.filter((item) => item.type === "expense");

  return (
    <div className="two-col">
      <section className="panel form-panel">
        <PanelHead title={edit ? "Edit budget" : "Buat budget"} badge={periodLabel()} />
        <SmartForm
          key={edit?.id || "new"}
          disabled={demo}
          defaults={edit}
          fields={[
            ["id", "hidden"],
            ["category_id", "select", "Kategori", expenseCategories.map((item) => [item.id, item.name])],
            ["method", "select", "Metode", [["fixed", "Fixed"], ["percentage", "Percentage"]]],
            ["amount", "number", "Limit nominal", "1500000"],
            ["percentage", "number", "Persentase", "15"]
          ]}
          submitLabel={edit ? "Simpan" : "Tambah"}
          onSubmit={onBudget}
        />
      </section>
      <section className="cards-grid">
        {budgets.map((budget) => (
          <article className="budget-tile" key={budget.id}>
            <div className="tile-top">
              <div>
                <span className={`mini-badge ${budget.percent > 100 ? "danger" : ""}`}>{budget.percent > 100 ? "Over" : budget.method}</span>
                <h3>{budget.categoryName}</h3>
              </div>
              <div className="tile-actions">
                <button className="icon-btn" onClick={() => setUi((current) => ({ ...current, budgetEditId: budget.id }))}><Pencil size={16} /></button>
                <button className="icon-btn" disabled={demo} onClick={() => onDelete("budgets", budget.id, "Budget dihapus.")}><Trash2 size={16} /></button>
              </div>
            </div>
            <BudgetLine budget={budget} />
          </article>
        ))}
      </section>
    </div>
  );
}

function Goals({ data, ui, setUi, demo, onGoal, onDelete }) {
  const edit = data.goals.find((item) => item.id === ui.goalEditId);

  return (
    <div className="two-col">
      <section className="panel form-panel">
        <PanelHead title={edit ? "Edit goal" : "Tambah goal"} badge={`${data.goals.length} aktif`} />
        <SmartForm
          key={edit?.id || "new"}
          disabled={demo}
          defaults={edit}
          fields={[
            ["id", "hidden"],
            ["name", "text", "Nama", "Dana darurat"],
            ["target_amount", "number", "Target", "30000000"],
            ["current_amount", "number", "Terkumpul", "5000000"],
            ["deadline", "date", "Deadline"]
          ]}
          submitLabel={edit ? "Simpan" : "Tambah"}
          onSubmit={onGoal}
        />
      </section>
      <section className="cards-grid">
        {data.goals.map((goal) => {
          const percent = goalProgress(goal);
          return (
            <article className="goal-tile" key={goal.id}>
              <div className="tile-top">
                <div>
                  <span className="mini-badge">{formatDate(goal.deadline)}</span>
                  <h3>{goal.name}</h3>
                </div>
                <div className="tile-actions">
                  <button className="icon-btn" onClick={() => setUi((current) => ({ ...current, goalEditId: goal.id }))}><Pencil size={16} /></button>
                  <button className="icon-btn" disabled={demo} onClick={() => onDelete("goals", goal.id, "Goal dihapus.")}><Trash2 size={16} /></button>
                </div>
              </div>
              <Progress value={percent} />
              <p>{money(goal.current_amount)} dari {money(goal.target_amount)}</p>
            </article>
          );
        })}
      </section>
    </div>
  );
}

function ProLab({ data, metrics, isPro, ui, setUi, onAdvisor, onReceipt, onReport }) {
  const activeTab = ui.proTab || "chat";
  const [receiptDraft, setReceiptDraft] = useState({ text: "", imageUrl: "", imageData: "", imageName: "" });
  const [reportPrompt, setReportPrompt] = useState("");
  const chatMessages = normalizeChatMessages(ui.advisor);
  const tabs = [
    ["chat", Bot, "Chat"],
    ["receipt", ScanLine, "Scan Struk"],
    ["report", FileSearch, "Analisis"],
    ["health", Gauge, "Health"]
  ];

  function switchTab(tab) {
    setUi((current) => ({ ...current, proTab: tab }));
  }

  function handleReceiptImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setReceiptDraft((current) => ({
        ...current,
        imageData: String(reader.result || ""),
        imageName: file.name,
        imageUrl: ""
      }));
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function clearReceiptImage() {
    setReceiptDraft((current) => ({ ...current, imageData: "", imageName: "" }));
  }

  return (
    <div className="pro-lab">
      <section className="pro-command">
        <div>
          <span className="mini-badge gold">AI Pro aktif</span>
          <h3>AI keuangan yang terasa seperti ngobrol.</h3>
          <p>Chat, scan struk, dan analisis laporan sekarang dipisah biar lebih fokus dan enak dipakai di HP.</p>
        </div>
        <div className="pro-command-stats" aria-label="Ringkasan AI Pro">
          <span><Gauge size={16} /> {metrics.healthScore}/100</span>
          <span><CircleDollarSign size={16} /> {metrics.savingsRate}% saving</span>
          <span><Activity size={16} /> {data.goals.length} goals</span>
        </div>
      </section>

      <nav className="pro-tabs" aria-label="Navigasi AI Pro">
        {tabs.map(([key, Icon, label]) => (
          <button key={key} className={activeTab === key ? "active" : ""} onClick={() => switchTab(key)}>
            <Icon size={18} />
            {label}
          </button>
        ))}
      </nav>

      <div className="pro-grid">
        <aside className="pro-side panel">
          <PanelHead title="Financial health" badge={isPro ? "Pro" : "Locked"} />
          <div className="score-orbit compact" style={{ "--score": `${metrics.healthScore}%` }}>
            <strong>{metrics.healthScore}</strong>
            <span>score</span>
          </div>
          <div className="health-list modern">
            <span><CircleDollarSign size={16} /> Savings rate {metrics.savingsRate}%</span>
            <span><CreditCard size={16} /> Debt {money(metrics.debt)}</span>
            <span><Activity size={16} /> {data.goals.length} goals aktif</span>
          </div>
          <div className="ai-mini-stack">
            <button className="btn quiet" onClick={() => switchTab("chat")}><Bot size={16} /> Buka chat</button>
            <button className="btn quiet" onClick={() => switchTab("receipt")}><ScanLine size={16} /> Scan struk</button>
          </div>
        </aside>

        <section className="pro-stage">
          {activeTab === "chat" ? (
            <section className={`ai-panel chat-panel ${!isPro ? "locked-panel" : ""}`}>
              <div className="chat-window">
                <div className="chat-top">
                  <div className="chat-avatar"><Bot size={19} /></div>
                  <div>
                    <strong>DompetRapi Advisor</strong>
                    <span>Online untuk bantu baca cashflow</span>
                  </div>
                  <span className="mini-badge">Chat</span>
                </div>
                <div className="chat-thread">
                  {chatMessages.map((message, index) => <ChatBubble key={message.id || `${message.role}-${index}`} message={message} />)}
                </div>
                <form className="chat-composer" onSubmit={(event) => {
                  event.preventDefault();
                  const form = event.currentTarget;
                  const question = new FormData(form).get("question");
                  onAdvisor(question);
                  form.reset();
                }}>
                  <textarea name="question" disabled={!isPro} rows={1} placeholder="Tanya: budget mana yang bocor bulan ini?" />
                  <button className="icon-btn send-btn" disabled={!isPro} aria-label="Kirim chat">
                    <SendHorizontal size={18} />
                  </button>
                </form>
              </div>
            </section>
          ) : null}

          {activeTab === "receipt" ? (
            <section className={`panel ai-panel receipt-panel ${!isPro ? "locked-panel" : ""}`}>
              <PanelHead title="Receipt scanner" badge="Upload atau kamera" />
              <form onSubmit={(event) => {
                event.preventDefault();
                const image = receiptDraft.imageData || receiptDraft.imageUrl;
                onReceipt(receiptDraft.text, image);
              }}>
                <div className="capture-grid">
                  <label className={`capture-card ${!isPro ? "disabled" : ""}`}>
                    <input type="file" accept="image/*" disabled={!isPro} onChange={handleReceiptImage} />
                    <ImageUp size={22} />
                    <strong>Upload gambar</strong>
                    <span>PNG atau JPG struk</span>
                  </label>
                  <label className={`capture-card ${!isPro ? "disabled" : ""}`}>
                    <input type="file" accept="image/*" capture="environment" disabled={!isPro} onChange={handleReceiptImage} />
                    <Camera size={22} />
                    <strong>Ambil foto</strong>
                    <span>Buka kamera HP</span>
                  </label>
                </div>

                {receiptDraft.imageData ? (
                  <div className="receipt-preview">
                    <img src={receiptDraft.imageData} alt="Preview struk" />
                    <div>
                      <strong>{receiptDraft.imageName || "Struk siap discan"}</strong>
                      <span>Gambar akan dikirim ke AI saat scan.</span>
                      <button type="button" className="btn quiet" onClick={clearReceiptImage}>Hapus gambar</button>
                    </div>
                  </div>
                ) : null}

                <textarea
                  value={receiptDraft.text}
                  onChange={(event) => setReceiptDraft((current) => ({ ...current, text: event.target.value }))}
                  disabled={!isPro}
                  placeholder={"Tambahkan catatan kalau perlu:\nKopi 28000\nRoti 22000\nTotal 50000"}
                />
                <input
                  value={receiptDraft.imageUrl}
                  onChange={(event) => setReceiptDraft((current) => ({ ...current, imageUrl: event.target.value, imageData: "", imageName: "" }))}
                  name="image_url"
                  type="url"
                  disabled={!isPro}
                  placeholder="Atau tempel URL gambar struk"
                />
                <button className="btn primary" disabled={!isPro}><ScanLine size={18} /> Scan dengan AI</button>
              </form>
              <AiOutput lines={Array.isArray(ui.receipt) ? ui.receipt : ui.receipt ? [ui.receipt] : []} />
            </section>
          ) : null}

          {activeTab === "report" ? (
            <section className={`panel ai-panel report-panel ${!isPro ? "locked-panel" : ""}`}>
              <PanelHead title="Report analyzer" badge="Insight bulanan" />
              <div className="report-kpis">
                <div><span>Pengeluaran</span><strong>{money(metrics.monthlyExpense)}</strong></div>
                <div><span>Pemasukan</span><strong>{money(metrics.monthlyIncome)}</strong></div>
                <div><span>Net worth</span><strong>{money(metrics.netWorth)}</strong></div>
              </div>
              <form onSubmit={(event) => {
                event.preventDefault();
                onReport(reportPrompt);
              }}>
                <textarea
                  value={reportPrompt}
                  onChange={(event) => setReportPrompt(event.target.value)}
                  disabled={!isPro}
                  placeholder="Fokus laporan, misalnya: cari pengeluaran yang paling perlu dipangkas dan target saving bulan depan."
                />
                <button className="btn primary" disabled={!isPro}><FileSearch size={18} /> Buat analisis AI</button>
              </form>
              <AiOutput lines={ui.report} variant="report" />
            </section>
          ) : null}

          {activeTab === "health" ? (
            <section className="panel ai-panel health-deep-panel">
              <PanelHead title="Health detail" badge="Score 0-100" />
              <div className="health-detail-grid">
                <div className="health-detail-card">
                  <Gauge size={20} />
                  <span>Skor</span>
                  <strong>{metrics.healthScore}/100</strong>
                </div>
                <div className="health-detail-card">
                  <CircleDollarSign size={20} />
                  <span>Savings rate</span>
                  <strong>{metrics.savingsRate}%</strong>
                </div>
                <div className="health-detail-card">
                  <CreditCard size={20} />
                  <span>Utang</span>
                  <strong>{money(metrics.debt)}</strong>
                </div>
              </div>
              <button className="btn primary" onClick={() => {
                switchTab("chat");
                onAdvisor("Jelaskan financial health score saya dan beri tiga langkah paling realistis untuk naik level.");
              }}>
                <Bot size={18} /> Bahas score di chat
              </button>
            </section>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function ChatBubble({ message }) {
  const lines = splitAiText(message.text || "");
  return (
    <div className={`chat-bubble ${message.role === "user" ? "user" : "assistant"}`}>
      {message.loading ? (
        <span className="typing-dots"><i /><i /><i /></span>
      ) : (
        lines.map((line, index) => <p key={index}>{line}</p>)
      )}
    </div>
  );
}

function AuthView({ demo, theme, setTheme, mode, setMode, onSubmit, onGoogle }) {
  return (
    <main className="auth-view">
      <section>
        <Brand />
        <h1>{demo ? "Demo mode aktif." : "Masuk ke workspace keuanganmu."}</h1>
        <p>
          {demo
            ? "Supabase belum dikonfigurasi, jadi app berjalan dengan data contoh read-only."
            : "Auth memakai Supabase. Data finansial dipisahkan per user lewat RLS."}
        </p>
        <div className="auth-actions">
          <button className="btn primary" onClick={() => go("app/dashboard")}>Buka dashboard</button>
          <ThemeControls theme={theme} setTheme={setTheme} />
        </div>
      </section>
      <section className="auth-card">
        <div className="auth-tabs">
          <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Login</button>
          <button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>Register</button>
        </div>
        <span className={demo ? "pill" : "pill gold"}>{demo ? "Supabase belum aktif" : "Supabase connected"}</span>
        <h2>{mode === "login" ? "Selamat datang lagi" : "Buat akun baru"}</h2>
        <form onSubmit={(event) => {
          event.preventDefault();
          onSubmit(Object.fromEntries(new FormData(event.currentTarget)));
        }}>
          {mode === "register" ? <label>Nama lengkap<input name="full_name" type="text" disabled={demo} placeholder="Nama kamu" required /></label> : null}
          <label>Email<input name="email" type="email" disabled={demo} required /></label>
          <label>Password<input name="password" type="password" disabled={demo} minLength={6} required /></label>
          <button className="btn primary" disabled={demo}><LogIn size={18} /> {mode === "login" ? "Masuk" : "Daftar"}</button>
        </form>
        <button className="btn ghost" disabled={demo} onClick={onGoogle}>Google OAuth</button>
        {demo ? <p className="auth-hint">Copy config.example.js ke config.js atau isi .env supaya login/register aktif.</p> : null}
      </section>
    </main>
  );
}

function SmartForm({ fields, defaults = {}, disabled, submitLabel, onSubmit, beforeSubmit }) {
  return (
    <form className="smart-form" onSubmit={(event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(event.currentTarget));
      onSubmit(beforeSubmit ? beforeSubmit(values) : values);
    }}>
      {fields.map(([name, type, label, options, onChange, marker]) => {
        if (type === "hidden") return <input key={name} name={name} type="hidden" defaultValue={defaults?.[name] || ""} />;
        if (type === "select") {
          return (
            <label key={name}>
              {label}
              <select
                name={name}
                disabled={disabled}
                defaultValue={defaults?.[name] || options?.[0]?.[0] || ""}
                onChange={onChange ? (event) => onChange(event.target.value) : undefined}
              >
                {options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
              </select>
            </label>
          );
        }
        return (
          <label key={name}>
            {label}
            <input
              name={name}
              type={type}
              placeholder={typeof options === "string" ? options : ""}
              defaultValue={defaults?.[name] || (type === "color" ? options : "")}
              disabled={disabled}
              required={name !== "percentage" && name !== "note" && name !== "current_amount"}
              {...(marker ? { [marker]: "" } : {})}
            />
          </label>
        );
      })}
      <button className="btn primary" disabled={disabled}><Check size={18} /> {submitLabel}</button>
    </form>
  );
}

function Metric({ icon: Icon, label, value }) {
  return (
    <article className="metric">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <Icon size={22} />
    </article>
  );
}

function PanelHead({ title, badge }) {
  return (
    <div className="panel-head">
      <h3>{title}</h3>
      {badge ? <span className="mini-badge">{badge}</span> : null}
    </div>
  );
}

function TransactionItem({ tx, data, onDelete }) {
  const category = data.categories.find((item) => item.id === tx.category_id);
  const wallet = data.wallets.find((item) => item.id === tx.wallet_id);
  const Icon = tx.type === "income" ? ArrowDownLeft : ArrowUpRight;
  return (
    <article className="transaction-item">
      <span className={tx.type === "income" ? "tx-icon income" : "tx-icon expense"}><Icon size={18} /></span>
      <div>
        <strong>{tx.note || category?.name || "Transaksi"}</strong>
        <p>{formatDate(tx.transaction_date)} · {category?.name || "Kategori"} · {wallet?.name || "Dompet"}</p>
      </div>
      <b className={tx.type === "income" ? "income-text" : "expense-text"}>{tx.type === "income" ? "+" : "-"}{money(tx.amount)}</b>
      {onDelete ? <button className="icon-btn" onClick={onDelete}><Trash2 size={15} /></button> : null}
    </article>
  );
}

function BudgetLine({ budget }) {
  return (
    <div className="budget-line">
      <div>
        <strong>{budget.categoryName}</strong>
        <span>{money(budget.spent)} dari {money(budget.limit)}</span>
      </div>
      <Progress value={budget.percent} danger={budget.percent > 100} />
    </div>
  );
}

function Progress({ value, danger }) {
  return (
    <div className={danger ? "progress danger" : "progress"}>
      <span style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  );
}

function AiOutput({ lines }) {
  const safeLines = Array.isArray(lines) ? lines : lines ? [lines] : [];
  if (!safeLines.length) return null;
  return (
    <div className="ai-output">
      {safeLines.map((line, index) => (
        <article className="ai-result-card" key={index}>
          <span>{String(index + 1).padStart(2, "0")}</span>
          <p>{cleanAiLine(line)}</p>
        </article>
      ))}
    </div>
  );
}

function Empty({ title, copy }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      <span>{copy}</span>
    </div>
  );
}

function SectionIntro({ label, title, copy }) {
  return (
    <div className="section-intro">
      <span className="pill">{label}</span>
      <h2>{title}</h2>
      <p>{copy}</p>
    </div>
  );
}

function PlanCard({ name, price, items, featured }) {
  return (
    <article className={featured ? "plan-card featured" : "plan-card"}>
      <span className={featured ? "pill gold" : "pill"}>Pro only</span>
      <h3>{name}</h3>
      <strong>{price}<small>/tahun</small></strong>
      {items.map((item) => <p key={item}><Check size={16} /> {item}</p>)}
      <button className={featured ? "btn primary" : "btn ghost"} onClick={() => go("app/pro")}>Buka AI Pro</button>
    </article>
  );
}

function Brand() {
  return (
    <button className="brand" onClick={() => go("")} aria-label="DompetRapi">
      <span>DR</span>
      <b>DompetRapi</b>
    </button>
  );
}

async function loadConfig() {
  if (new URLSearchParams(location.search).get("demo") === "1") return null;
  const envConfig = {
    SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY
  };
  if (envConfig.SUPABASE_URL && envConfig.SUPABASE_ANON_KEY && !isPlaceholder(envConfig)) {
    return envConfig;
  }
  if (window.DOMPETRAPI_CONFIG?.SUPABASE_URL) return window.DOMPETRAPI_CONFIG;
  try {
    const configPath = "/config.js";
    const module = await import(/* @vite-ignore */ configPath);
    if (!isPlaceholder(module)) return module;
  } catch (_error) {
    return null;
  }
  return null;
}

function isPlaceholder(config) {
  return /your-|anon-key|supabase-url/i.test(`${config?.SUPABASE_URL || ""}${config?.SUPABASE_ANON_KEY || ""}`);
}

async function ensureUserSetup(supabase, user) {
  const userId = user.id;
  const fullName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Pengguna";
  await supabase.from("profiles").upsert({ id: userId, full_name: fullName, avatar_url: user.user_metadata?.avatar_url || null });
  await supabase.from("subscriptions").upsert({ user_id: userId, plan: "pro", status: "active" }, { onConflict: "user_id" });
  const existing = await supabase.from("categories").select("id", { count: "exact", head: true }).eq("user_id", userId);
  if (!existing.count) {
    await supabase.from("categories").insert(DEFAULT_CATEGORIES.map((category) => ({ user_id: userId, ...category, is_default: true })));
  }
}

async function detectSupabaseBackend(supabase) {
  const appProbe = await supabase.from("profiles").select("id").limit(1);
  if (!appProbe.error) return "dompetrapi";

  const fintrackProbe = await supabase.from("fintrack_wallets").select("id").limit(1);
  if (!fintrackProbe.error) return "fintrack";

  return "dompetrapi";
}

async function ensureFintrackSetup(supabase) {
  const existing = await supabase.from("fintrack_categories").select("id", { count: "exact", head: true });
  if (existing.error || existing.count) return;
  await supabase.from("fintrack_categories").insert(DEFAULT_CATEGORIES.map((category) => ({
    id: slugId(category.name),
    name: category.name,
    type: category.type,
    icon: category.icon,
    color: category.color
  })));
}

function mapFintrackData(rows, userId) {
  return {
    wallets: rows.wallets.map((wallet) => ({
      id: wallet.id,
      user_id: wallet.owner_id,
      name: wallet.name,
      type: wallet.kind,
      balance: wallet.balance,
      color: wallet.color || "#0f766e"
    })),
    categories: rows.categories.map((category) => ({
      id: category.id,
      user_id: category.owner_id,
      name: category.name,
      type: category.type,
      icon: category.icon || "circle",
      color: category.color || "#0f766e",
      is_default: true
    })),
    transactions: rows.transactions.map((transaction) => ({
      id: transaction.id,
      user_id: transaction.owner_id,
      wallet_id: transaction.wallet_id,
      category_id: transaction.category_id,
      type: transaction.type,
      amount: transaction.amount,
      transaction_date: transaction.date,
      note: transaction.note || transaction.title
    })),
    budgets: rows.budgets.map((budget) => ({
      id: budget.id,
      user_id: budget.owner_id,
      category_id: budget.category_id,
      period_start: periodStart(),
      method: "fixed",
      amount: budget.amount,
      percentage: null
    })),
    goals: readFintrackGoals(userId),
    aiEvents: []
  };
}

function readFintrackGoals(userId) {
  try {
    return JSON.parse(localStorage.getItem(`dompetrapi-fintrack-goals-${userId}`) || "[]");
  } catch (_error) {
    return [];
  }
}

function writeFintrackGoals(userId, goals) {
  localStorage.setItem(`dompetrapi-fintrack-goals-${userId}`, JSON.stringify(goals));
}

function toFintrackWalletKind(value) {
  return ["cash", "bank", "ewallet", "investment"].includes(value) ? value : "bank";
}

function makeId(prefix) {
  const random = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  return `${prefix}-${random}`;
}

function slugId(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function emptyData() {
  return { wallets: [], categories: [], transactions: [], budgets: [], goals: [], aiEvents: [] };
}

function demoData() {
  const categories = DEFAULT_CATEGORIES.map((category, index) => ({ id: `cat-${index}`, user_id: "demo", ...category }));
  const id = (name) => categories.find((item) => item.name === name)?.id;
  return {
    categories,
    wallets: [
      { id: "wallet-1", name: "BCA Harian", type: "bank", balance: 12800000, color: "#0f766e" },
      { id: "wallet-2", name: "GoPay", type: "ewallet", balance: 640000, color: "#2563eb" },
      { id: "wallet-3", name: "Cash", type: "cash", balance: 350000, color: "#f59e0b" },
      { id: "wallet-4", name: "Kartu Kredit", type: "credit_card", balance: -1250000, color: "#fb7185" }
    ],
    transactions: [
      { id: "tx-1", wallet_id: "wallet-1", category_id: id("Gaji"), type: "income", amount: 12000000, transaction_date: periodStart(), note: "Gaji bulanan" },
      { id: "tx-2", wallet_id: "wallet-2", category_id: id("Makanan"), type: "expense", amount: 78000, transaction_date: isoDate(new Date()), note: "Kopi dan makan siang" },
      { id: "tx-3", wallet_id: "wallet-1", category_id: id("Tagihan"), type: "expense", amount: 620000, transaction_date: isoDate(addDays(new Date(), -3)), note: "Internet dan listrik" },
      { id: "tx-4", wallet_id: "wallet-1", category_id: id("Belanja"), type: "expense", amount: 820000, transaction_date: isoDate(addDays(new Date(), -8)), note: "Kebutuhan bulanan" },
      { id: "tx-5", wallet_id: "wallet-3", category_id: id("Transportasi"), type: "expense", amount: 185000, transaction_date: isoDate(addDays(new Date(), -13)), note: "Transport kerja" }
    ],
    budgets: [
      { id: "budget-1", category_id: id("Makanan"), method: "fixed", amount: 1500000, percentage: null, period_start: periodStart() },
      { id: "budget-2", category_id: id("Belanja"), method: "percentage", amount: 1800000, percentage: 15, period_start: periodStart() },
      { id: "budget-3", category_id: id("Transportasi"), method: "fixed", amount: 700000, percentage: null, period_start: periodStart() }
    ],
    goals: [
      { id: "goal-1", name: "Dana darurat", target_amount: 30000000, current_amount: 14500000, deadline: isoDate(addDays(new Date(), 80)) },
      { id: "goal-2", name: "Laptop kerja", target_amount: 18000000, current_amount: 6200000, deadline: isoDate(addDays(new Date(), 130)) }
    ],
    aiEvents: []
  };
}

function getMetrics(data) {
  const month = monthKey(new Date());
  const monthTransactions = data.transactions.filter((item) => monthKey(item.transaction_date) === month);
  const monthlyIncome = sum(monthTransactions.filter((item) => item.type === "income"), "amount");
  const monthlyExpense = sum(monthTransactions.filter((item) => item.type === "expense"), "amount");
  const assets = sum(data.wallets.filter((item) => !["credit_card", "paylater"].includes(item.type)), "balance");
  const debt = Math.abs(sum(data.wallets.filter((item) => ["credit_card", "paylater"].includes(item.type)), "balance"));
  const netWorth = assets - debt;
  const savingsRate = monthlyIncome ? Math.round(((monthlyIncome - monthlyExpense) / monthlyIncome) * 100) : 0;
  const overBudget = enrichBudgets(data).filter((item) => item.percent > 100).length;
  const goalAvg = data.goals.length ? data.goals.reduce((total, goal) => total + goalProgress(goal), 0) / data.goals.length : 0;
  const healthScore = clamp(Math.round(62 + savingsRate / 3 + goalAvg / 9 - overBudget * 8 - Math.min(20, debt / Math.max(assets, 1) * 20)), 0, 100);
  return { monthlyIncome, monthlyExpense, assets, debt, netWorth, savingsRate, healthScore };
}

function enrichBudgets(data) {
  const month = monthKey(new Date());
  const income = sum(data.transactions.filter((item) => item.type === "income" && monthKey(item.transaction_date) === month), "amount");
  const expenses = data.transactions.filter((item) => item.type === "expense" && monthKey(item.transaction_date) === month);
  return data.budgets
    .filter((item) => monthKey(item.period_start) === month)
    .map((budget) => {
      const category = data.categories.find((item) => item.id === budget.category_id);
      const spent = sum(expenses.filter((item) => item.category_id === budget.category_id), "amount");
      const percentageLimit = budget.method === "percentage" && budget.percentage ? income * (number(budget.percentage) / 100) : 0;
      const limit = percentageLimit || number(budget.amount);
      return {
        ...budget,
        categoryName: category?.name || "Kategori",
        spent,
        limit,
        percent: limit ? spent / limit * 100 : 0
      };
    });
}

function trendData(data) {
  return lastMonths(6).map((month) => {
    const rows = data.transactions.filter((item) => monthKey(item.transaction_date) === month.key);
    return {
      label: month.label,
      income: sum(rows.filter((item) => item.type === "income"), "amount"),
      expense: sum(rows.filter((item) => item.type === "expense"), "amount")
    };
  });
}

function categoryDonut(data) {
  const month = monthKey(new Date());
  const totals = new Map();
  data.transactions.filter((item) => item.type === "expense" && monthKey(item.transaction_date) === month).forEach((item) => {
    totals.set(item.category_id, (totals.get(item.category_id) || 0) + number(item.amount));
  });
  return [...totals.entries()].map(([categoryId, total]) => {
    const category = data.categories.find((item) => item.id === categoryId);
    return { name: category?.name || "Kategori", color: category?.color || "#94a3b8", total };
  });
}

function topExpenseCategory(data) {
  return categoryDonut(data).sort((a, b) => b.total - a.total)[0];
}

const chartOptions = {
  maintainAspectRatio: false,
  plugins: {
    legend: { position: "bottom", labels: { boxWidth: 10 } },
    tooltip: { callbacks: { label: (context) => `${context.dataset.label}: ${money(context.raw)}` } }
  },
  scales: {
    x: { grid: { display: false } },
    y: { ticks: { callback: (value) => shortMoney(value) } }
  }
};

function getRoute() {
  return location.hash.replace(/^#\/?/, "");
}

function go(route) {
  location.hash = route ? `#/${route}` : "#/";
}

function loadSavedTheme() {
  try {
    const saved = JSON.parse(localStorage.getItem("dompetrapi-theme") || "null");
    if (saved?.mode && hexToRgb(saved?.accent)) {
      return { mode: saved.mode === "dark" ? "dark" : "light", accent: saved.accent };
    }
  } catch (_error) {
    return DEFAULT_THEME;
  }
  return DEFAULT_THEME;
}

function applyTheme(theme) {
  const safeTheme = theme || DEFAULT_THEME;
  const rgb = hexToRgb(safeTheme.accent) || hexToRgb(DEFAULT_THEME.accent);
  document.documentElement.dataset.theme = safeTheme.mode;
  document.documentElement.style.setProperty("--accent", safeTheme.accent);
  document.documentElement.style.setProperty("--accent-rgb", `${rgb.r}, ${rgb.g}, ${rgb.b}`);
  ChartJS.defaults.color = safeTheme.mode === "dark" ? "#9ba7b5" : "#69737f";
  ChartJS.defaults.borderColor = safeTheme.mode === "dark" ? "#2a313d" : "#e4e0d6";
  localStorage.setItem("dompetrapi-theme", JSON.stringify(safeTheme));
}

function hexToRgb(hex) {
  const normalized = String(hex || "").replace("#", "").trim();
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return null;
  const value = Number.parseInt(normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255
  };
}

function sum(items, key) {
  return items.reduce((total, item) => total + number(item[key]), 0);
}

function number(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function walletType(value) {
  return WALLET_TYPES.find(([key]) => key === value)?.[1] || value;
}

function money(value) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(number(value));
}

function shortMoney(value) {
  const amount = number(value);
  if (amount >= 1000000) return `Rp${Math.round(amount / 1000000)} jt`;
  if (amount >= 1000) return `Rp${Math.round(amount / 1000)} rb`;
  return `Rp${amount}`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}

function periodLabel() {
  return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date());
}

function periodStart() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
}

function monthKey(value) {
  const date = value instanceof Date ? value : new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

function lastMonths(count) {
  const formatter = new Intl.DateTimeFormat("id-ID", { month: "short" });
  const now = new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (count - 1 - index), 1);
    return { key: monthKey(date), label: formatter.format(date) };
  });
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function isoDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function goalProgress(goal) {
  return clamp(number(goal.current_amount) / Math.max(number(goal.target_amount), 1) * 100, 0, 100);
}

function buildFinanceContext(data, budgets, metrics) {
  const latestTransactions = data.transactions.slice(0, 12).map((transaction) => ({
    type: transaction.type,
    amount: number(transaction.amount),
    date: transaction.transaction_date,
    note: transaction.note,
    category: data.categories.find((category) => category.id === transaction.category_id)?.name || null,
    wallet: data.wallets.find((wallet) => wallet.id === transaction.wallet_id)?.name || null
  }));

  const compactBudgets = budgets.map((budget) => ({
    category: budget.categoryName,
    spent: budget.spent,
    limit: budget.limit,
    usage_percent: Math.round(budget.percent)
  }));

  return JSON.stringify({
    currency: "IDR",
    metrics,
    budgets: compactBudgets,
    wallets: data.wallets.map((wallet) => ({
      name: wallet.name,
      type: wallet.type,
      balance: number(wallet.balance)
    })),
    goals: data.goals.map((goal) => ({
      name: goal.name,
      target: number(goal.target_amount),
      current: number(goal.current_amount),
      deadline: goal.deadline
    })),
    latest_transactions: latestTransactions
  }, null, 2);
}

function normalizeChatMessages(messages) {
  if (!Array.isArray(messages) || !messages.length) return initialUi.advisor;
  if (typeof messages[0] === "string") {
    return messages.map((text) => ({ role: "assistant", text: cleanAiLine(text) }));
  }
  return messages.map((message) => ({
    id: message.id,
    role: message.role === "user" ? "user" : "assistant",
    text: cleanAiLine(message.text || ""),
    loading: Boolean(message.loading)
  }));
}

function replaceLoadingMessage(messages, loadingId, replacement) {
  const normalized = normalizeChatMessages(messages);
  let replaced = false;
  const next = normalized.map((message) => {
    if (message.id !== loadingId) return message;
    replaced = true;
    return { id: `${loadingId}-done`, ...replacement };
  });
  return replaced ? next : [...next, replacement];
}

function cleanAiLine(text) {
  return String(text || "")
    .normalize("NFKC")
    .replace(/[\u3400-\u9fff\uf900-\ufaff\u3040-\u30ff\uac00-\ud7af]/g, "")
    .replace(/\u00e2\u20ac\u00a2|\ufffd/g, "")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/[`*#>~]+/g, "")
    .replace(/^[\s\-\u2013\u2014\u2022]+/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function splitAiText(text) {
  return String(text || "")
    .replace(/\r/g, "")
    .split(/\n{2,}|\n(?=[\-*\u2022\u00e2\u20ac\u00a2]|\d+[\.)])/)
    .map((line) => cleanAiLine(line.replace(/^\d+[\.)]\s*/, "")))
    .filter(Boolean)
    .slice(0, 8);
}

function legacySplitAiText(text) {
  return String(text || "")
    .split(/\n{2,}|\n(?=[-*\u2022]|\d+\.)/)
    .map((line) => line.replace(/^[-*\u2022]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 8);
}

const rootElement = document.getElementById("root");
const reactRoot = window.__DOMPETRAPI_ROOT__ || createRoot(rootElement);
window.__DOMPETRAPI_ROOT__ = reactRoot;
reactRoot.render(<App />);
