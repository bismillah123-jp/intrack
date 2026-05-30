import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import {
  Activity,
  ArrowDownLeft,
  ArrowLeft,
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
  ["receivable", "Piutang"],
  ["credit_card", "Kartu kredit"],
  ["paylater", "PayLater"],
  ["debt", "Pinjaman/Utang"],
  ["investment", "Investasi"]
];

const NAV = [
  ["dashboard", LayoutDashboard, "Dashboard"],
  ["wallets", WalletCards, "Dompet"],
  ["transactions", ReceiptText, "Transaksi"],
  ["budgets", Ruler, "Budget"],
  ["goals", Target, "Goals"]
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
        if (session && _event === "SIGNED_IN" && !window.location.hash.includes("app/")) {
          go("app/dashboard");
        }
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
      options: { redirectTo: window.location.origin + window.location.pathname }
    });
    if (error) notify(error.message);
  }

  async function updateProfile({ full_name, email }) {
    if (boot.demo || !boot.supabase) return notify("Fitur ini membutuhkan koneksi Supabase.");
    const updates = { data: { full_name } };
    if (email && email !== profile?.email) updates.email = email;
    const { error } = await boot.supabase.auth.updateUser(updates);
    if (error) notify(error.message);
    else notify("Profil berhasil diperbarui. Cek email jika Anda mengganti alamat email.");
  }

  async function updatePassword({ old_password, new_password }) {
    if (boot.demo || !boot.supabase) return notify("Fitur ini membutuhkan koneksi Supabase.");
    
    const email = boot.session?.user?.email;
    if (!email) return notify("Email tidak ditemukan.");

    const { error: signInError } = await boot.supabase.auth.signInWithPassword({
      email,
      password: old_password
    });
    
    if (signInError) return notify("Password lama salah.");

    const { error } = await boot.supabase.auth.updateUser({ password: new_password });
    if (error) notify(error.message);
    else notify("Password berhasil diperbarui.");
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
          onUpdateProfile={updateProfile}
          onUpdatePassword={updatePassword}
          onReceipt={runReceipt}
          onReport={runReport}
        />
      </ShellToast>
    );
  }

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

function ThemeControls({ theme, setTheme }) {
  const modes = ["light", "dark"];
  const accents = ["#0f8b8d", "#2563eb", "#7c3aed", "#e11d48", "#d97706", "#059669", "#4f46e5", "#db2777", "#0d9488", "#65a30d"];
  
  return (
    <div className="theme-controls">
      <div className="theme-modes">
        {modes.map((mode) => (
          <button 
            key={mode} 
            className={theme?.mode === mode ? "active" : ""} 
            onClick={() => setTheme({ ...(theme || {}), mode })}
            title={`Mode ${mode}`}
          >
            {mode === "light" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        ))}
      </div>
      <div className="theme-accents">
        {accents.map((color) => (
          <button 
            key={color}
            className={theme?.accent === color ? "active" : ""}
            style={{ background: color }}
            onClick={() => setTheme({ ...(theme || {}), accent: color })}
            aria-label={`Warna ${color}`}
          />
        ))}
      </div>
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
        <button className="btn ghost" disabled={demo} onClick={onGoogle} style={{ gap: "10px" }}>
          <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Lanjutkan dengan Google
        </button>
        {demo ? <p className="auth-hint">Copy config.example.js ke config.js atau isi .env supaya login/register aktif.</p> : null}
      </section>
    </main>
  );
}

function MoneyInput({ name, defaultValue, disabled, placeholder, marker }) {
  const [value, setValue] = useState(defaultValue !== undefined && defaultValue !== null ? defaultValue : "");

  const formatRupiah = (val) => {
    if (val === "" || val === null || val === undefined) return "";
    const numberString = val.toString().replace(/[^,\d]/g, '');
    if (!numberString) return "";
    const split = numberString.split(',');
    const sisa = split[0].length % 3;
    let rupiah = split[0].substr(0, sisa);
    const ribuan = split[0].substr(sisa).match(/\d{3}/gi);

    if (ribuan) {
      const separator = sisa ? '.' : '';
      rupiah += separator + ribuan.join('.');
    }

    rupiah = split[1] !== undefined ? rupiah + ',' + split[1] : rupiah;
    return rupiah ? `Rp. ${rupiah}` : '';
  };

  const handleChange = (e) => {
    setValue(e.target.value.replace(/[^0-9]/g, ''));
  };

  const rawValue = value.toString().replace(/[^0-9]/g, '');
  const formattedPlaceholder = placeholder ? formatRupiah(placeholder) : "";

  return (
    <div className="money-input-wrapper">
      <input type="hidden" name={name} value={rawValue} />
      <input
        type="text"
        inputMode="numeric"
        value={formatRupiah(value)}
        onChange={handleChange}
        disabled={disabled}
        placeholder={formattedPlaceholder}
        required
        {...(marker ? { [marker]: "" } : {})}
      />
    </div>
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
        if (type === "money") {
          return (
            <label key={name}>
              {label}
              <MoneyInput
                name={name}
                defaultValue={defaults?.[name] !== undefined ? defaults[name] : ""}
                placeholder={typeof options === "string" ? options : ""}
                disabled={disabled}
                marker={marker}
              />
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
  const assets = sum(data.wallets.filter((item) => !["credit_card", "paylater", "debt"].includes(item.type)), "balance");
  const debt = Math.abs(sum(data.wallets.filter((item) => ["credit_card", "paylater", "debt"].includes(item.type)), "balance"));
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
