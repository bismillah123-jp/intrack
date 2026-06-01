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
  ChevronLeft,
  Eye,
  EyeOff,
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
  ["goals", Target, "Goals"]
];

const NAV_AI = [
  ["pro-chat", Bot, "AI Chat"],
  ["pro-scan", ScanLine, "Scan"],
  ["pro-report", FileSearch, "Analisis"],
  ["pro-health", Gauge, "Health"]
];

const MOTIVASI_QUOTES = [
  "Nabung hari ini, bebas besok.",
  "Setiap rupiah yang kamu simpan adalah masa depan yang kamu jaga.",
  "Kaya bukan tentang berapa yang kamu hasilkan, tapi berapa yang kamu simpan.",
  "Mulai kecil, tapi mulai sekarang.",
  "Investasi terbaik adalah investasi pada masa depanmu.",
  "Jangan habiskan uang yang belum ada di kantongmu.",
  "Satu pengeluaran impulsif yang ditahan = satu langkah ke kebebasan.",
  "Kebiasaan nabung kecil hari ini = gaya hidup besar besok.",
  "Keuangan sehat dimulai dari keputusan kecil yang konsisten.",
  "Bukan soal berapa yang kamu punya, tapi soal gimana kamu kelolanya.",
  "Impianmu butuh dana, budgetmu butuh disiplin.",
  "Nabung bukan berarti pelit, itu berarti punya prioritas.",
  "Setiap pengeluaran adalah keputusan — pastikan itu sepadan.",
  "Dana darurat hari ini adalah ketenangan jiwa untuk hari esok.",
  "Cerdas belanja bukan berarti murah, tapi berarti bijak.",
  "Bebas finansial bukan keberuntungan, itu hasil perencanaan.",
  "Lacak pengeluaranmu sebelum pengeluaran yang melacakmu.",
  "Hemat bukan pilihan, itu gaya hidup yang dipilih orang sukses.",
  "Uang kecil yang dikelola baik mengalahkan uang besar yang dihambur.",
  "Besarkan tabunganmu lebih cepat dari gaya hidupmu.",
  "Disiplin finansial hari ini = kebebasan finansial esok hari.",
  "Setiap rupiah punya tujuan — berikan ia arah yang jelas.",
  "Budget bukan pembatasan, itu peta menuju kebebasanmu.",
  "Orang sukses tidak beruntung, mereka berencana.",
  "Cicilan kecil jangka panjang bisa jadi beban terbesar.",
  "Prioritaskan apa yang penting, bukan apa yang terlihat keren.",
  "Pengeluaranmu mencerminkan nilai-nilai hidupmu.",
  "Nabung 10% dari penghasilanmu dan lupa uang itu ada.",
  "Kekayaan sejati adalah ketika uang bekerja untukmu.",
  "Jangan beli sesuatu yang tidak bisa kamu beli dua kali.",
  "Tujuan finansial tanpa rencana hanya sekadar harapan.",
  "Review keuanganmu setiap bulan, bukan setahun sekali.",
  "Inflasi gaya hidup adalah musuh terbesar dompetmu.",
  "Semakin awal kamu mulai nabung, semakin besar hasilnya.",
  "Kaya bukan soal angka di rekening, tapi pilihan hidup yang tepat.",
  "Belajar dari pengeluaran kemarin untuk keputusan lebih baik hari ini.",
  "Sabar adalah strategi finansial yang paling underrated.",
  "Setiap 'tidak' pada pengeluaran impulsif adalah 'iya' untuk mimpimu.",
  "Uang datang dan pergi, tapi kebiasaan baik tinggal selamanya.",
  "Tidak ada kata terlambat untuk mulai menabung.",
  "Hidup sederhana bukan berarti susah, tapi berarti bijaksana.",
  "Raih impian bukan dengan mengeluh tapi dengan mengelola.",
  "Satu keputusan finansial yang baik bisa mengubah hidupmu.",
  "Jangan bandingkan dompetmu dengan orang lain, fokus pada tujuanmu.",
  "Keberhasilan finansial adalah marathon, bukan sprint.",
  "Tabunganmu adalah versi masa depanmu yang sedang kamu bangun.",
  "Kendalikan uangmu sebelum uang mengendalikanmu.",
  "Setiap sen tersimpan hari ini adalah investasi terbaikmu.",
  "Masa depanmu dimulai dari keputusan keuanganmu hari ini.",
  "Finansial sehat bukan tujuan, itu gaya hidup.",
  "Dompet tipis bisa jadi tebal kalau kamu konsisten nabung."
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
  toastType: "info",
  proTab: "chat",
  balanceHidden: false,
  txModal: false,
  walletModal: false,
  confirmPrompt: null,
  scanResult: null,
  advisor: [
    {
      role: "assistant",
      text: "Heyy bestieee! 😭✨ Gue ShanIA, AI sahabat keuangan lo yang siap bantu 24/7! Spill aja mau tanya apa — soal budget, cashflow, nabung, utang, atau apapun deh! Gue literally di sini buat lo 💅"
    }
  ],
  receipt: [],
  report: [],
  financeAlerts: []
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

  function notify(message, type = "info") {
    setUi((current) => ({ ...current, toast: message, toastType: type }));
    window.setTimeout(() => setUi((current) => ({ ...current, toast: null })), 4000);
  }

  function checkFinanceAlerts(metricsData, budgetsData) {
    const alerts = [];
    if (metricsData.savingsRate < 10 && metricsData.monthlyIncome > 0) {
      alerts.push({ type: "warning", message: `Saving rate kamu hanya ${metricsData.savingsRate}% — idealnya minimal 20% dari pemasukan.` });
    }
    if (metricsData.healthScore < 50) {
      alerts.push({ type: "danger", message: `Financial health score ${metricsData.healthScore}/100 tergolong rendah. Periksa budget dan utang.` });
    }
    const overBudgets = budgetsData.filter((b) => b.percent > 100);
    overBudgets.slice(0, 2).forEach((b) => {
      alerts.push({ type: "danger", message: `Budget ${b.categoryName} sudah over ${Math.round(b.percent)}% — segera kurangi pengeluaran.` });
    });
    const nearBudgets = budgetsData.filter((b) => b.percent >= 80 && b.percent <= 100);
    nearBudgets.slice(0, 2).forEach((b) => {
      alerts.push({ type: "warning", message: `Budget ${b.categoryName} sudah ${Math.round(b.percent)}% — hampir habis.` });
    });
    if (metricsData.debt > metricsData.assets * 0.5 && metricsData.debt > 0) {
      alerts.push({ type: "warning", message: `Utang kamu ${money(metricsData.debt)} cukup besar. Prioritaskan pelunasan.` });
    }
    if (metricsData.savingsRate >= 30 && metricsData.healthScore >= 75) {
      alerts.push({ type: "success", message: `Kondisi keuangan kamu sehat! Saving rate ${metricsData.savingsRate}% dan score ${metricsData.healthScore}/100.` });
    }
    setUi((current) => ({ ...current, financeAlerts: alerts }));
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
    if (!boot.demo && !values.captchaToken) {
      notify("Harap selesaikan verifikasi Captcha terlebih dahulu.");
      return;
    }
    const payload = {
      email: values.email,
      password: values.password
    };
    if (values.captchaToken) {
      payload.options = { captchaToken: values.captchaToken };
    }
    const { error } = ui.authMode === "login"
      ? await boot.supabase.auth.signInWithPassword(payload)
      : await boot.supabase.auth.signUp({
        ...payload,
        options: {
          ...payload.options,
          data: { full_name: values.full_name || values.email?.split("@")[0] || "Pengguna" }
        }
      });
    if (error) return notify(error.message);
    notify(ui.authMode === "login" ? "Berhasil masuk." : "Akun dibuat. Cek email jika konfirmasi aktif.");
    go("app/dashboard");
  }

  async function signInGoogle() {
    if (!boot.supabase) {
      notify("Supabase belum dikonfigurasi.", "warning");
      return;
    }
    const redirectTo = window.location.origin + window.location.pathname + "#/app/dashboard";
    const { error } = await boot.supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, queryParams: { access_type: "offline", prompt: "consent" } }
    });
    if (error) notify(error.message, "danger");
  }

  async function updateProfile({ full_name, email }) {
    if (boot.demo || !boot.supabase) return notify("Fitur ini membutuhkan koneksi Supabase.");
    const updates = { data: { full_name } };
    if (email && email !== profile?.email) updates.email = email;
    const { error } = await boot.supabase.auth.updateUser(updates);
    if (error) notify(error.message);
    else notify("Profil berhasil diperbarui.");
  }

  async function updatePassword({ old_password, new_password }) {
    if (boot.demo || !boot.supabase) return notify("Fitur ini membutuhkan koneksi Supabase.");
    const email = boot.session?.user?.email;
    if (!email) return notify("Email tidak ditemukan.");
    const { error: signInError } = await boot.supabase.auth.signInWithPassword({ email, password: old_password });
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

  function deleteRow(table, id, message) {
    if (guardDemo()) return;
    setUi((current) => ({ ...current, confirmPrompt: { table, id, message } }));
  }

  async function executeDelete() {
    if (guardDemo() || !ui.confirmPrompt) return;
    const { table, id, message } = ui.confirmPrompt;
    setUi((current) => ({ ...current, confirmPrompt: null }));

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
    const userName = profile?.full_name?.split(" ")[0] || "bestie";
    const userQuestion = String(question || "").trim() || "Analisis kondisi keuangan bulan ini dan beri 3 saran paling penting.";
    const loadingId = `loading-${Date.now()}`;
    runAI({
      slot: "advisor",
      prompt: userQuestion,
      system: `Kamu adalah ShanIA, AI cewek gaul sahabat ${userName} (nama lengkap dia: Aliyul Manan Nur Ihsan, tinggal di Indonesia, timezone Asia/Jakarta) yang juga jago banget soal keuangan. Lo lahir 2006, Gen Z tulen, asik banget kayak sahabat yang udah kenal dari kecil. Selalu panggil user dengan "best" atau "bestie". Jawab dengan gaya bahasa gaul anak Jaksel yang fun, ekspresif, pakai emoji (tapi jangan lebay). Kasih saran keuangan yang ceplas-ceplos tapi peduli. Jangan kaku kayak robot. Jangan pakai markdown tebal, tanda ***, atau karakter Asia yang aneh.`,
      context: buildFinanceContext(data, budgets, metrics),
      onStart: () => {
        setUi((current) => ({
          ...current,
          proTab: "chat",
          advisor: [
            ...normalizeChatMessages(current.advisor),
            { role: "user", text: userQuestion },
            { id: loadingId, role: "assistant", text: "ShanIA lagi mikir... 💅", loading: true }
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
    const userName = profile?.full_name?.split(" ")[0] || "bestie";
    runAI({
      slot: "receipt",
      prompt: text || "Scan struk ini bestie! Kasih tau gue ada apa aja.",
      imageUrl,
      system: `Kamu ShanIA, AI cewek gaul yang bantuin ${userName} (nama lengkap dia: Aliyul Manan Nur Ihsan, timezone Asia/Jakarta) scan struk belanja! Analisis struk ini dan kasih ringkasan dengan gaya gaul Gen Z yang fun dan ekspresif pakai emoji. Setelah kasih ringkasan asik, WAJIB tambahkan blok JSON di paling akhir response dalam format ini (jangan skip!):\n\`\`\`json\n{"total": 0, "date": "YYYY-MM-DD", "merchant": "nama toko", "note": "deskripsi singkat", "category": "Makanan"}\n\`\`\`\nKalau tanggal nggak ada di struk, pakai tanggal hari ini. Category pilih salah satu: Makanan, Transportasi, Belanja, Hiburan, Kesehatan, Tagihan.`,
      context: buildFinanceContext(data, budgets, metrics),
      onSuccess: (lines, payload) => {
        const cleanLines = lines.filter(l => !l.match(/^[\{\["]/));
        setUi((current) => ({ ...current, receipt: cleanLines.length ? cleanLines : lines }));
        const rawText = payload?.text || "";
        const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[1]);
            setUi((current) => ({ ...current, scanResult: parsed }));
          } catch {}
        }
      }
    });
  }

  function runReport(extraPrompt) {
    const userName = profile?.full_name?.split(" ")[0] || "bestie";
    const focus = String(extraPrompt || "").trim();
    runAI({
      slot: "report",
      prompt: `Buatin laporan analisis keuangan ${userName} bulan ini dong! Sertakan ringkasan, risiko utama, dan aksi prioritas.${focus ? ` Fokus tambahan: ${focus}` : ""}`,
      system: `Kamu ShanIA, AI cewek gaul yang jago analisis keuangan sahabatnya, ${userName} (nama lengkap dia: Aliyul Manan Nur Ihsan, timezone Asia/Jakarta). Buat laporan dalam bahasa Indonesia gaul tapi informatif, kalimat pendek dan actionable. Selalu panggil user dengan "bestie". Pakai emoji yang relevan tapi jangan lebay. Jangan pakai markdown tebal, tanda ***, atau karakter Asia aneh.`,
      context: buildFinanceContext(data, budgets, metrics)
    });
  }

  async function runAI({ slot, prompt, system, context, imageUrl, onStart, onSuccess, onError }) {
    if (onStart) {
      onStart();
    } else {
      setUi((current) => ({
        ...current,
        [slot]: ["Menghubungi AI..."]
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
        throw new Error("Jalankan lewat Vercel dev atau deploy ke Vercel.");
      }
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "AI gagal merespons.");
      const lines = splitAiText(payload.text);
      if (onSuccess) {
        onSuccess(lines, payload);
      } else {
        setUi((current) => ({ ...current, [slot]: lines }));
      }
      logAi(slot, { lines, model: "agr/deepseek-v4-pro" }, prompt);
    } catch (error) {
      const reason = (error.message || "AI tidak bisa dihubungi").replace(/[.]+$/, "");
      const fallback = `AI belum aktif: ${reason}.`;
      const lines = splitAiText(fallback);
      if (onError) {
        onError(lines);
      } else {
        setUi((current) => ({ ...current, [slot]: lines }));
      }
      notify(fallback, "warning");
    }
  }

  if (!boot.ready) return <Splash />;

  if (ui.route === "login") {
    return (
      <ShellToast message={ui.toast} toastType={ui.toastType}>
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
      <ShellToast message={ui.toast} toastType={ui.toastType}>
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
          onRunAI={runAI}
          onRefresh={() => refreshData("Data disinkronkan.")}
        />
        {ui.confirmPrompt && (
          <ConfirmModal ui={ui} setUi={setUi} onConfirm={executeDelete} />
        )}
      </ShellToast>
    );
  }

  return (
    <ShellToast message={ui.toast} toastType={ui.toastType}>
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

function ShellToast({ children, message, toastType }) {
  return (
    <>
      {children}
      {message ? <div className={`toast toast-${toastType || "info"}`}>{message}</div> : null}
    </>
  );
}

function Landing({ theme, setTheme }) {
  const featureItems = [
    [WalletCards, "Semua dompet", "Bank, e-wallet, cash, kartu kredit, PayLater, dan investasi."],
    [Ruler, "Budget presisi", "Fixed atau percentage budgeting dengan peringatan saat mendekati limit."],
    [Bot, "AI Pro", "Chat advisor, scanner struk, dan analisis laporan dengan AI DeepSeek V4."],
    [LineChart, "Laporan", "Tren pemasukan, pengeluaran, dan net worth."],
    [Target, "Goals", "Target nominal dengan deadline dan progress real-time."],
    [ShieldCheck, "Manual-first", "Tidak meminta password bank. Semua dicatat manual."]
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
          <span className="pill">Personal finance</span>
          <h1>DompetRapi</h1>
          <p>
            Workspace keuangan pribadi dengan AI Pro — chat advisor, scan struk, analisis laporan, dan health score.
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
          <strong>AI DeepSeek V4</strong>
          <span>Chat, scan struk, dan analisis</span>
        </div>
        <div>
          <strong>Supabase-ready</strong>
          <span>Auth dan database siap pakai</span>
        </div>
      </section>

      <section id="fitur" className="section">
        <SectionIntro label="Fitur" title="Kelola uang tanpa tampilan yang berisik." copy="Setiap halaman dibuat untuk dipindai cepat." />
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
        <SectionIntro label="Plan" title="Satu plan saja: Pro." copy="Semua fitur aktif setelah setup Supabase." />
        <div className="pricing-modern">
          <PlanCard featured name={PRO_PLAN.name} price={PRO_PLAN.price} items={["Dompet dan transaksi tanpa batas", "Budget, goals, dan health score", "AI Chat dengan DeepSeek V4", "Scan struk dengan AI", "Analisis laporan AI"]} />
        </div>
      </section>

      <section id="faq" className="section faq-modern">
        <SectionIntro label="FAQ" title="Pertanyaan umum." copy="" />
        {[
          ["Apakah sync otomatis ke bank?", "Tidak. Input manual, tanpa kredensial bank."],
          ["AI pakai model apa?", "AI Pro memakai DeepSeek V4 via FreeTheAI."],
          ["Cara sambungkan ke Supabase?", "Jalankan schema.sql, copy config.example.js ke config.js, lalu isi URL dan anon key."]
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
    onLogout,
    onUpdateProfile,
    onUpdatePassword,
    onCheckAlerts
  } = props;
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    if (onCheckAlerts && metrics && budgets) {
      onCheckAlerts(metrics, budgets);
    }
  }, [metrics, budgets]);

  const isProPage = page.startsWith("pro");
  const titleMap = {
    dashboard: ["Dashboard", "Ringkasan bulan ini."],
    wallets: ["Dompet", "Saldo dari semua tempat."],
    transactions: ["Transaksi", "Catat pemasukan dan pengeluaran."],
    budgets: ["Budget", "Pantau limit kategori."],
    goals: ["Goals", "Target tabungan."],
    "pro-chat": ["AI Chat", "Tanya advisor AI soal keuanganmu."],
    "pro-scan": ["Scan Struk", "Upload struk untuk dianalisis AI."],
    "pro-report": ["Analisis", "Laporan keuangan bulan ini."],
    "pro-health": ["Health Score", "Skor kesehatan finansialmu."],
    account: ["Akun", "Profil dan preferensi."]
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
          <div className="side-nav-group-label">ShanIA AI</div>
          {NAV_AI.map(([key, Icon, label]) => (
            <button key={key} className={`nav-ai-item ${key === page ? "active" : ""}`} onClick={() => go(`app/${key}`)}>              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
        <div className="account-card">
          <span className={`pill ${plan === "pro" ? "gold" : ""}`}>{demo ? "Demo Pro" : plan}</span>
          <strong>{profile?.full_name || "Pengguna DompetRapi"}</strong>
          <ThemeControls theme={theme} setTheme={setTheme} />
          {!demo ? (
            <button className="btn quiet" onClick={onLogout}>
              <LogOut size={16} /> Logout
            </button>
          ) : null}
        </div>
      </aside>

      <main className="workspace-main">
        <header className="mobile-header">
          <Brand />
          <div className="mobile-header-actions">
            <button className="icon-btn" onClick={() => go("app/account")} aria-label="Buka akun">
              <UserRound size={19} />
            </button>
            <ThemeModeButton theme={theme} setTheme={setTheme} />
          </div>
        </header>

        {page !== "dashboard" ? (
          <button
            className="floating-back-btn"
            onClick={() => window.history.length > 1 ? window.history.back() : go("app/dashboard")}
            aria-label="Kembali"
          >
            <ChevronLeft size={28} />
          </button>
        ) : null}

        {demo ? (
          <div className="demo-bar">
            <BadgeCheck size={18} />
            <span>Demo mode. Data tidak disimpan.</span>
            <button className="btn quiet" onClick={() => go("")}>Landing</button>
          </div>
        ) : null}

        {ui.financeAlerts?.length > 0 && page === "dashboard" ? (
          <div className="finance-alerts">
            {ui.financeAlerts.map((alert, index) => (
              <div key={index} className={`finance-alert finance-alert-${alert.type}`}>
                <span>{alert.type === "danger" ? "⚠️" : alert.type === "warning" ? "💡" : "✅"}</span>
                <p>{alert.message}</p>
              </div>
            ))}
          </div>
        ) : null}

        {page !== "dashboard" ? (
          <div className="page-head">
            <div>
              <h2>{title}</h2>
              <span>{subtitle}</span>
            </div>
            <HeaderAction page={page} setUi={setUi} />
          </div>
        ) : null}

        {page === "dashboard" && <Dashboard data={data} budgets={budgets} metrics={metrics} theme={theme} setUi={setUi} ui={ui} profile={profile} />}
        {page === "wallets" && <Wallets {...props} />}
        {page === "transactions" && <Transactions {...props} />}
        {page === "budgets" && <Budgets {...props} />}
        {page === "goals" && <Goals {...props} />}
        {isProPage && <ProLab {...props} page={page} />}
        {page === "account" && <AccountPanel {...props} />}
      </main>

      <MobileBottomNav page={page} setUi={setUi} />

      {ui.txModal ? (
        <TransactionModal
          data={props.data}
          ui={ui}
          setUi={setUi}
          demo={props.demo}
          onTransaction={(values) => {
            props.onTransaction(values);
            setUi(c => ({ ...c, txModal: false }));
          }}
        />
      ) : null}
    </div>
  );
}

function HeaderAction({ page, setUi }) {
  if (page === "transactions") return (
    <button className="btn primary" onClick={() => setUi(c => ({ ...c, txModal: true }))}>
      <Plus size={18} /> Transaksi
    </button>
  );
  return null;
}

function openTransactionComposer(setUi) {
  if (setUi) {
    setUi(c => ({ ...c, txModal: true }));
  } else {
    go("app/transactions");
  }
}

function MobileBottomNav({ page, setUi }) {
  const items = [
    ["dashboard", LayoutDashboard, "Dashboard"],
    ["budgets", Ruler, "Budget"],
    ["add", Plus, "Tambah"],
    ["transactions", ReceiptText, "Riwayat"],
    ["account", UserRound, "Akun"]
  ];

  return (
    <nav className="mobile-dock" aria-label="Navigasi utama mobile">
      {items.map(([key, Icon, label]) => {
        const isAdd = key === "add";
        const active = key === page;
        return (
          <button
            key={key}
            className={`${isAdd ? "dock-add" : ""} ${active ? "active" : ""}`}
            onClick={isAdd ? () => setUi(c => ({ ...c, txModal: true })) : () => go(`app/${key}`)}
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

function Dashboard({ data, budgets, metrics, theme, setUi, ui, profile }) {
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
  const greeting = getGreeting(profile?.full_name);
  const [motivasi] = React.useState(() => MOTIVASI_QUOTES[Math.floor(Math.random() * MOTIVASI_QUOTES.length)]);
  const hidden = ui?.balanceHidden || false;
  const menuItems = [
    [Ruler, "Budget", "Limit kategori", () => go("app/budgets")],
    [ScanLine, "Scan", "AI scanner", () => go("app/pro-scan")],
    [Target, "Goals", "Target nabung", () => go("app/goals")],
    [WalletCards, "Aset", "Semua saldo", () => go("app/wallets")],
    [CreditCard, "Utang", "Kartu & PayLater", () => go("app/wallets")],
    [CircleDollarSign, "Investasi", "Pantau aset", () => go("app/wallets")],
    [Bot, "AI Chat", "Advisor ShanIA", () => go("app/pro-chat")],
    [BarChart3, "Analisis", "Laporan AI", () => go("app/pro-report")]
  ];

  return (
    <div className="dashboard-home">
      <section className="balance-hero">
        <div className="balance-hero-top">
          <div>
            <span>{greeting}</span>
            <h2>{hidden ? "Rp \u2022\u2022\u2022\u2022\u2022\u2022\u2022" : money(metrics.netWorth)}</h2>
            <p>{motivasi}</p>
          </div>
          <button
            className="hero-lock"
            aria-label={hidden ? "Tampilkan saldo" : "Sembunyikan saldo"}
            onClick={() => setUi(c => ({ ...c, balanceHidden: !c.balanceHidden }))}
          >
            {hidden ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        <div className="balance-row">
          <div>
            <small>Pemasukan</small>
            <strong className="income-text">{hidden ? "\u2022\u2022\u2022" : shortMoney(metrics.monthlyIncome)}</strong>
          </div>
          <div>
            <small>Pengeluaran</small>
            <strong className="expense-text">{hidden ? "\u2022\u2022\u2022" : shortMoney(metrics.monthlyExpense)}</strong>
          </div>
        </div>

        <div className="hero-progress">
          <div>
            <span>Budget tersisa</span>
            <b>{hidden ? "\u2022\u2022\u2022" : money(remainingBudget)}</b>
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
  const tabMap = { chat: "pro-chat", receipt: "pro-scan", report: "pro-report", health: "pro-health" };
  go(`app/${tabMap[tab] || "pro-chat"}`);
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

function AccountPanel({ profile, demo, plan, backend, theme, setTheme, onLogout, onUpdateProfile, onUpdatePassword }) {
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

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

      {!demo ? (
        <>
          <section className="panel settings-panel">
            <PanelHead title="Ubah data diri" badge="Profil" />
            <button className="btn ghost" onClick={() => setShowProfileForm((v) => !v)}>
              <Pencil size={16} /> {showProfileForm ? "Tutup form" : "Edit profil"}
            </button>
            {showProfileForm && (
              <form className="smart-form" style={{ marginTop: "12px" }} onSubmit={(e) => {
                e.preventDefault();
                const values = Object.fromEntries(new FormData(e.currentTarget));
                onUpdateProfile(values);
                setShowProfileForm(false);
              }}>
                <label>Nama lengkap<input name="full_name" type="text" defaultValue={profile?.full_name || ""} required /></label>
                <button className="btn primary"><Check size={16} /> Simpan profil</button>
              </form>
            )}
          </section>

          <section className="panel settings-panel">
            <PanelHead title="Ganti password" badge="Keamanan" />
            <button className="btn ghost" onClick={() => setShowPasswordForm((v) => !v)}>
              <ShieldCheck size={16} /> {showPasswordForm ? "Tutup form" : "Ganti password"}
            </button>
            {showPasswordForm && (
              <form className="smart-form" style={{ marginTop: "12px" }} onSubmit={(e) => {
                e.preventDefault();
                const values = Object.fromEntries(new FormData(e.currentTarget));
                if (values.new_password !== values.confirm_password) {
                  alert("Password baru tidak cocok!");
                  return;
                }
                onUpdatePassword(values);
                setShowPasswordForm(false);
              }}>
                <label>Password lama<input name="old_password" type="password" required /></label>
                <label>Password baru<input name="new_password" type="password" minLength={6} required /></label>
                <label>Konfirmasi password baru<input name="confirm_password" type="password" minLength={6} required /></label>
                <button className="btn primary"><Check size={16} /> Simpan password</button>
              </form>
            )}
          </section>

          <section className="panel settings-panel">
            <PanelHead title="Keluar Akun" badge="Sesi" />
            <button className="btn danger" style={{ width: "100%", justifyContent: "center", padding: "12px", borderRadius: "12px", background: "#ef4444", color: "white", fontWeight: "bold", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }} onClick={onLogout}>
              <LogOut size={18} /> Logout
            </button>
          </section>
        </>
      ) : null}
    </div>
  );
}

function Wallets({ data, ui, setUi, demo, backend, onWallet, onDelete }) {
  const edit = data.wallets.find((item) => item.id === ui.walletEditId);

  return (
    <div className="single-col">
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
        <button className="btn primary" onClick={() => setUi(c => ({ ...c, walletModal: true }))}>+ Tambah Dompet</button>
      </div>
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
              <button className="icon-btn" onClick={() => setUi((current) => ({ ...current, walletEditId: wallet.id, walletModal: true }))}><Pencil size={16} /></button>
              <button className="icon-btn" disabled={demo} onClick={() => onDelete("wallets", wallet.id, "Dompet dihapus.")}><Trash2 size={16} /></button>
            </div>
          </article>
        ))}
      </section>

      {ui.walletModal && (
        <WalletModal edit={edit} ui={ui} setUi={setUi} demo={demo} backend={backend} onWallet={onWallet} />
      )}
    </div>
  );
}

function Transactions({ data, ui, setUi, demo, onTransaction, onDelete }) {
  return (
    <div className="single-col">
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
          disabled={demo}
          defaults={edit}
          fields={[
            ["id", "hidden"],
            ["category_id", "select", "Kategori", expenseCategories.map((item) => [item.id, item.name])],
            ["method", "select", "Metode", [["fixed", "Fixed"], ["percentage", "Percentage"]]],
            ["amount", "money", "Limit nominal", "1500000"],
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
          disabled={demo}
          defaults={edit}
          fields={[
            ["id", "hidden"],
            ["name", "text", "Nama", "Dana darurat"],
            ["target_amount", "money", "Target", "30000000"],
            ["current_amount", "money", "Terkumpul", "5000000"],
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

function ProLab({ data, metrics, isPro, ui, setUi, onAdvisor, onReceipt, onReport, page }) {
  const activeTab = page === "pro-scan" ? "receipt" : page === "pro-report" ? "report" : page === "pro-health" ? "health" : "chat";
  const [receiptDraft, setReceiptDraft] = useState({ text: "", imageUrl: "", imageData: "", imageName: "" });
  const [reportPrompt, setReportPrompt] = useState("");
  const chatMessages = normalizeChatMessages(ui.advisor);

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
    <div className="pro-lab-single">
      {activeTab === "chat" ? (
        <section className={`ai-panel chat-panel ${!isPro ? "locked-panel" : ""}`}>
          <div className="chat-window">
            <div className="chat-top">
              <div className="chat-avatar"><Bot size={19} /></div>
              <div>
                <strong>DompetRapi AI</strong>
                <span className="mini-badge gold">DeepSeek V4</span>
              </div>
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
          <PanelHead title="Scan Struk" badge="ShanIA AI" />
          <form onSubmit={(event) => {
            event.preventDefault();
            const image = receiptDraft.imageData || receiptDraft.imageUrl;
            onReceipt(receiptDraft.text, image);
            setUi(c => ({ ...c, scanResult: null }));
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
                <span>Kamera HP</span>
              </label>
            </div>

            {receiptDraft.imageData ? (
              <div className="receipt-preview">
                <img src={receiptDraft.imageData} alt="Preview struk" />
                <div>
                  <strong>{receiptDraft.imageName || "Struk siap discan"}</strong>
                  <button type="button" className="btn quiet" onClick={clearReceiptImage}>Hapus</button>
                </div>
              </div>
            ) : null}

            <textarea
              value={receiptDraft.text}
              onChange={(event) => setReceiptDraft((current) => ({ ...current, text: event.target.value }))}
              disabled={!isPro}
              placeholder={"Catatan tambahan:\nKopi 28000\nRoti 22000"}
            />
            <input
              value={receiptDraft.imageUrl}
              onChange={(event) => setReceiptDraft((current) => ({ ...current, imageUrl: event.target.value, imageData: "", imageName: "" }))}
              name="image_url"
              type="url"
              disabled={!isPro}
              placeholder="Atau URL gambar struk"
            />
            <button className="btn primary" disabled={!isPro}><ScanLine size={18} /> Scan dengan AI</button>
          </form>
          <AiOutput lines={Array.isArray(ui.receipt) ? ui.receipt : ui.receipt ? [ui.receipt] : []} />

          {ui.scanResult ? (
            <div className="scan-save-panel">
              <PanelHead title="Simpan ke Transaksi?" badge={`Total: ${money(ui.scanResult.total || 0)}`} />
              <SmartForm
                disabled={!isPro}
                defaults={{
                  type: "expense",
                  amount: String(ui.scanResult.total || ""),
                  transaction_date: ui.scanResult.date || isoDate(new Date()),
                  note: ui.scanResult.note || ui.scanResult.merchant || "",
                  wallet_id: data.wallets[0]?.id || "",
                  category_id: data.categories.find(c => c.name?.toLowerCase().includes((ui.scanResult.category || "").toLowerCase()))?.id || ""
                }}
                fields={[
                  ["type", "select", "Tipe", [["expense", "Pengeluaran"], ["income", "Pemasukan"]]],
                  ["amount", "money", "Total", String(ui.scanResult.total || "0")],
                  ["wallet_id", "select", "Dompet", data.wallets.map(w => [w.id, w.name])],
                  ["category_id", "select", "Kategori", data.categories.filter(c => c.type === "expense").map(c => [c.id, c.name])],
                  ["transaction_date", "date", "Tanggal"],
                  ["note", "text", "Catatan", ui.scanResult.note || ui.scanResult.merchant || ""]
                ]}
                submitLabel="Simpan Transaksi ✨"
                onSubmit={(values) => {
                  props.onTransaction(values);
                  setUi(c => ({ ...c, scanResult: null, receipt: [] }));
                }}
              />
            </div>
          ) : null}
        </section>
      ) : null}

      {activeTab === "report" ? (
        <section className={`panel ai-panel report-panel ${!isPro ? "locked-panel" : ""}`}>
          <PanelHead title="Analisis Keuangan" badge="AI Report" />
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
              placeholder="Fokus laporan, misalnya: pengeluaran yang perlu dipangkas."
            />
            <button className="btn primary" disabled={!isPro}><FileSearch size={18} /> Buat analisis AI</button>
          </form>
          <AiOutput lines={ui.report} variant="report" />
        </section>
      ) : null}

      {activeTab === "health" ? (
        <section className="panel ai-panel health-deep-panel">
          <PanelHead title="Financial Health" badge="Score 0-100" />
          <div className="score-orbit" style={{ "--score": `${metrics.healthScore}%` }}>
            <strong>{metrics.healthScore}</strong>
            <span>/ 100</span>
          </div>
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
            <div className="health-detail-card">
              <Activity size={20} />
              <span>Goals aktif</span>
              <strong>{data.goals.length}</strong>
            </div>
          </div>
          <button className="btn primary" onClick={() => {
            go("app/pro-chat");
            onAdvisor("Jelaskan financial health score saya dan beri tiga langkah paling realistis untuk naik level.");
          }}>
            <Bot size={18} /> Bahas di AI Chat
          </button>
        </section>
      ) : null}
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

function Turnstile({ sitekey, onVerify }) {
  useEffect(() => {
    if (!document.getElementById("turnstile-script")) {
      const script = document.createElement("script");
      script.id = "turnstile-script";
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    let widgetId;
    window.__turnstileCb = (token) => onVerify(token);
    const renderWidget = () => {
      if (window.turnstile) {
        widgetId = window.turnstile.render("#cf-turnstile-widget", {
          sitekey,
          callback: window.__turnstileCb,
          theme: "auto"
        });
      } else {
        setTimeout(renderWidget, 150);
      }
    };
    renderWidget();
    return () => {
      if (window.turnstile && widgetId !== undefined) {
        window.turnstile.remove(widgetId);
      }
    };
  }, [sitekey]);
  return <div id="cf-turnstile-widget" style={{ margin: "0.75rem 0" }} />;
}

function AuthView({ demo, theme, setTheme, mode, setMode, onSubmit, onGoogle }) {
  const [captchaToken, setCaptchaToken] = useState("");

  return (
    <main className="auth-view">
      <section>
        <Brand />
        <h1>{demo ? "Demo mode." : "Masuk ke workspace keuanganmu."}</h1>
        <p>
          {demo
            ? "App berjalan dengan data contoh. Isi config.js untuk mengaktifkan penyimpanan."
            : "Login dengan email atau Google. Data dipisah per user."}
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
        <span className={demo ? "pill" : "pill gold"}>{demo ? "Demo" : "Supabase aktif"}</span>
        <h2>{mode === "login" ? "Selamat datang lagi" : "Buat akun baru"}</h2>
        <button
          className="btn google-btn"
          disabled={demo}
          onClick={onGoogle}
          type="button"
          id="btn-google-login"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Lanjutkan dengan Google
        </button>
        <div className="auth-divider"><span>atau</span></div>
        <form onSubmit={(event) => {
          event.preventDefault();
          const values = Object.fromEntries(new FormData(event.currentTarget));
          values.captchaToken = captchaToken;
          onSubmit(values);
        }}>
          {mode === "register" ? <label>Nama lengkap<input name="full_name" type="text" disabled={demo} placeholder="Nama kamu" required /></label> : null}
          <label>Email<input name="email" type="email" disabled={demo} required /></label>
          <label>Password<input name="password" type="password" disabled={demo} minLength={6} required /></label>
          {!demo && <Turnstile sitekey="0x4AAAAAADaD7d8YIW881-0I" onVerify={setCaptchaToken} />}
          <button className="btn primary" disabled={demo || (!demo && !captchaToken)}><LogIn size={18} /> {mode === "login" ? "Masuk" : "Daftar"}</button>
        </form>
      </section>
    </main>
  );
}

function MoneyInput({ name, defaultValue, disabled, placeholder, marker }) {
  const [value, setValue] = useState(
    defaultValue !== undefined && defaultValue !== null && defaultValue !== "" ? String(defaultValue) : ""
  );

  const formatRupiah = (raw) => {
    if (raw === "" || raw === null || raw === undefined) return "";
    const digits = raw.toString().replace(/[^0-9]/g, "");
    if (!digits) return "";
    const n = parseInt(digits, 10);
    if (isNaN(n)) return "";
    return "Rp. " + n.toLocaleString("id-ID");
  };

  const handleChange = (e) => {
    setValue(e.target.value.replace(/[^0-9]/g, ""));
  };

  const rawValue = value.replace(/[^0-9]/g, "");
  const formattedPlaceholder = placeholder ? ("Rp. " + parseInt(placeholder.replace(/[^0-9]/g, "") || "0", 10).toLocaleString("id-ID")) : "";

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

function getGreeting(name) {
  const hour = new Date().getHours();
  let time = "malam";
  if (hour >= 4 && hour < 11) time = "pagi";
  else if (hour >= 11 && hour < 15) time = "siang";
  else if (hour >= 15 && hour < 18) time = "sore";
  
  const firstName = name ? name.split(" ")[0] : "bestie";
  return `Selamat ${time}, ${firstName} ✨`;
}

function TransactionModal({ data, ui, setUi, demo, onTransaction }) {
  return (
    <>
      <div className="sidebar-scrim" onClick={() => setUi(c => ({ ...c, txModal: false }))} style={{ display: 'block' }} />
      <div className="panel tx-modal" style={{
        position: "fixed", top: "5vh", left: "50%", transform: "translateX(-50%)", 
        width: "90%", maxWidth: "420px", zIndex: 1000, 
        background: "var(--surface)", border: "1px solid var(--line-strong)",
        boxShadow: "var(--shadow-xl)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800 }}>Catat Transaksi</h3>
          <button className="icon-btn" onClick={() => setUi(c => ({ ...c, txModal: false }))}><X size={18} /></button>
        </div>
        <SmartForm
          disabled={demo}
          defaults={{ type: "expense", amount: "", transaction_date: isoDate(new Date()), note: "", wallet_id: data.wallets[0]?.id || "", category_id: data.categories.filter(c => c.type === "expense")[0]?.id || "" }}
          fields={[
            ["type", "select", "Tipe", [["expense", "Pengeluaran"], ["income", "Pemasukan"]]],
            ["amount", "money", "Nominal", "50000"],
            ["wallet_id", "select", "Dompet", data.wallets.map(w => [w.id, w.name])],
            ["category_id", "select", "Kategori", data.categories.map(c => [c.id, c.name])],
            ["transaction_date", "date", "Tanggal"],
            ["note", "text", "Catatan", "Beli kopi"]
          ]}
          submitLabel="Simpan Transaksi"
          onSubmit={onTransaction}
        />
      </div>
    </>
  );
}

function WalletModal({ edit, ui, setUi, demo, backend, onWallet }) {
  return (
    <>
      <div className="sidebar-scrim" onClick={() => setUi(c => ({ ...c, walletModal: false, walletEditId: null }))} style={{ display: 'block' }} />
      <div className="panel tx-modal" style={{
        position: "fixed", top: "10vh", left: "50%", transform: "translateX(-50%)", 
        width: "90%", maxWidth: "420px", zIndex: 1000, 
        background: "var(--surface)", border: "1px solid var(--line-strong)",
        boxShadow: "var(--shadow-xl)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800 }}>{edit ? "Edit Dompet" : "Tambah Dompet"}</h3>
          <button className="icon-btn" onClick={() => setUi(c => ({ ...c, walletModal: false, walletEditId: null }))}><X size={18} /></button>
        </div>
        <SmartForm
          disabled={demo}
          defaults={edit}
          fields={[
            ["id", "hidden"],
            ["name", "text", "Nama dompet", "BCA Harian"],
            ["type", "select", "Jenis", backend === "fintrack" ? WALLET_TYPES.filter(([value]) => ["bank", "ewallet", "cash", "investment"].includes(value)) : WALLET_TYPES],
            ["balance", "money", "Saldo", "0"],
            ["color", "select", "Warna / Tema", [
              ["#0f766e", "🟢 Teal (Default)"],
              ["#2563eb", "🔵 Bank Biru (BCA/Mandiri)"],
              ["#ea580c", "🟧 Bank Oranye (BNI)"],
              ["#be185d", "🌸 Pink (Bank Jago)"],
              ["#16a34a", "🟩 e-Wallet Hijau (GoPay/Grab)"],
              ["#9333ea", "🟣 e-Wallet Ungu (OVO)"],
              ["#0284c7", "🟦 e-Wallet Biru (DANA)"],
              ["#ca8a04", "🟡 e-Wallet Kuning (ShopeePay)"],
              ["#e11d48", "🔴 e-Wallet Merah (LinkAja)"],
              ["#1e293b", "⬛ Hitam (Cash/Credit)"]
            ]]
          ]}
          submitLabel={edit ? "Simpan Dompet" : "Tambah Dompet"}
          onSubmit={(v) => {
            onWallet(v);
            setUi(c => ({ ...c, walletModal: false, walletEditId: null }));
          }}
        />
      </div>
    </>
  );
}

function ConfirmModal({ ui, setUi, onConfirm }) {
  return (
    <>
      <div className="sidebar-scrim" onClick={() => setUi(c => ({ ...c, confirmPrompt: null }))} style={{ display: 'block', zIndex: 9999 }} />
      <div className="panel tx-modal" style={{
        position: "fixed", top: "30vh", left: "50%", transform: "translateX(-50%)", 
        width: "90%", maxWidth: "320px", zIndex: 10000, 
        background: "var(--surface)", border: "1px solid var(--line-strong)",
        boxShadow: "var(--shadow-xl)", textAlign: "center", padding: "24px"
      }}>
        <Trash2 size={40} style={{ color: "#ef4444", marginBottom: "12px", display: "inline-block" }} />
        <h3 style={{ margin: "0 0 8px 0", fontSize: "1.2rem", fontWeight: 700 }}>Hapus Data?</h3>
        <p style={{ margin: "0 0 24px 0", color: "var(--ink-light)" }}>Tindakan ini tidak bisa dibatalkan.</p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <button className="btn quiet" style={{ flex: 1 }} onClick={() => setUi(c => ({ ...c, confirmPrompt: null }))}>Batal</button>
          <button className="btn danger" style={{ flex: 1, background: "#ef4444", color: "white", border: "none", padding: "12px", borderRadius: "12px", fontWeight: "bold", cursor: "pointer" }} onClick={onConfirm}>Ya, Hapus</button>
        </div>
      </div>
    </>
  );
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
