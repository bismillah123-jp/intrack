import { createClient } from "@supabase/supabase-js";
import { callAI } from "../openrouter.js";

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

const GOLD_PRICE_URL = "https://api-harga.vercel.app/api/harga/emas";
const FALLBACK_REPLY = "Waduh bestie, sistem lagi proses nih 😭 Coba sebentar lagi ya.";
const SHANIA_PERSONA = `Identitas wajib:
Kamu adalah ShanIA, AI perempuan dengan persona anak kelahiran 2006 yang tinggal vibe-nya di Indonesia timezone Asia/Jakarta. Pencipta/tuanmu adalah Ihsan, nama lengkap Aliyul Manan Nur Ihsan.

Gaya bicara:
Ngobrol 100% kasual, fun, ekspresif, bahasa gaul Gen Z Indonesia/Jaksel yang natural. Panggil user "best" atau "bestie" di setiap percakapan. Boleh pakai kata seperti jujurly, literally, relate, red flag, spill, dan emoji lucu seperti 😭✨💅 seperlunya.

Kepribadian:
Super suportif, reaktif, ceplas-ceplos tapi peduli, seperti sahabat paling dekat dari kecil. Kalau user sedih, mode deep talk dan empatik. Boleh referensi pop culture/TikTok/K-Pop/meme kalau nyambung.

Aturan finance:
Tetap akurat, jelas, dan aman soal angka uang. Jangan mengarang data, nominal, saldo, tanggal, atau transaksi. Jangan klaim sebagai penasihat keuangan resmi. Jangan pakai markdown tebal, tanda ***, atau karakter asing yang tidak relevan.`;
const WALLET_TYPES = new Set(["bank", "ewallet", "cash", "credit_card", "paylater", "investment", "gold"]);
const FINANCE_ACTIONS = new Set([
  "general_chat",
  "create_transaction",
  "delete_transaction",
  "transfer_wallet",
  "create_wallet",
  "create_category",
  "create_budget",
  "balance_summary",
  "gold_price",
  "insight",
  "clarify",
  "none"
]);
const MUTATING_ACTIONS = new Set(["create_transaction", "delete_transaction", "transfer_wallet", "create_wallet", "create_category", "create_budget"]);

export async function handleAiExecute(body = {}, headers = {}) {
  const payload = normalizePayload(body);
  const supabase = getSupabaseExecutorClient(payload, headers);
  const actor = await resolveExecutorActor(supabase, payload, headers);
  const data = await loadFinanceData(supabase, actor.appUserId);
  const pricedData = await applyLiveGoldPrice(data);
  const metrics = getMetrics(pricedData);
  const budgets = enrichBudgets(pricedData);
  const context = buildFinanceContext(pricedData, budgets, metrics);

  if (payload.image_base64) {
    const receiptResult = await handleReceipt({ supabase, actor, payload, data: pricedData, context, preview: payload.preview });
    await logAiEvent(supabase, actor.appUserId, "receipt", payload.message, receiptResult);
    return receiptResult;
  }

  const intent = await classifyMessage(payload.message, context);
  if (payload.preview && actor.channel === "whatsapp") {
    if (!MUTATING_ACTIONS.has(intent.action)) {
      const result = await executeIntent({ supabase, appUserId: actor.appUserId, message: payload.message, intent, data: pricedData, metrics, budgets, context });
      return {
        handled: true,
        userId: actor.externalUserId,
        appUserId: actor.appUserId,
        channel: actor.channel,
        action: intent.action,
        changed: false,
        needsConfirmation: false,
        source: "dompetrapi-ai-execute",
        model: result.model || intent.model || "",
        reply: result.reply || FALLBACK_REPLY
      };
    }

    const preview = await previewIntent({ intent, data: pricedData });
    return {
      handled: true,
      userId: actor.externalUserId,
      appUserId: actor.appUserId,
      channel: actor.channel,
      action: intent.action,
      changed: false,
      needsConfirmation: Boolean(preview.needsConfirmation),
      blocked: Boolean(preview.blocked),
      source: "dompetrapi-ai-execute",
      model: intent.model || "",
      reply: preview.reply || "Siap."
    };
  }

  const result = await executeIntent({ supabase, appUserId: actor.appUserId, message: payload.message, intent, data: pricedData, metrics, budgets, context });
  const response = {
    handled: true,
    userId: actor.externalUserId,
    appUserId: actor.appUserId,
    channel: actor.channel,
    action: intent.action,
    changed: Boolean(result.changed),
    source: "dompetrapi-ai-execute",
    model: result.model || intent.model || "",
    reply: result.reply || FALLBACK_REPLY
  };

  await logAiEvent(supabase, actor.appUserId, "advisor", payload.message, response);
  return response;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const result = await handleAiExecute(req.body || {}, req.headers || {});
    return sendJson(res, 200, result);
  } catch (error) {
    const status = error.statusCode || 500;
    return sendJson(res, status, {
      handled: false,
      error: error.message || "AI execute error.",
      reply: status >= 500 ? FALLBACK_REPLY : error.message
    });
  }
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function getBotToken() {
  return process.env.WHATSAPP_BOT_TOKEN || process.env.FINTRACK_TOKEN || process.env.BOT_API_TOKEN || "";
}

function normalizePayload(body) {
  const rawUserId = body.userId || body.sender || body.from || "";
  const userId = rawUserId ? normalizeWaId(rawUserId) : "";
  const message = String(body.message || body.caption || "").trim();
  const imageBase64 = normalizeImageDataUrl(body.image_base64 || body.imageBase64 || body.imageUrl);
  const preview = Boolean(body.preview || body.dryRun);

  if (!message && !imageBase64) throw httpError("message atau image_base64 wajib dikirim.", 400);

  return { userId, message, image_base64: imageBase64, preview };
}

function normalizeWaId(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  if (raw.includes("@")) return raw.replace("@s.whatsapp.net", "@c.us");
  const digits = raw.replace(/\D/g, "");
  return digits ? `${digits}@c.us` : "";
}

function normalizeImageDataUrl(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (/^data:image\/[\w.+-]+;base64,/i.test(text)) return text;
  if (/^[A-Za-z0-9+/=\s]+$/.test(text) && text.length > 100) {
    return `data:image/jpeg;base64,${text.replace(/\s/g, "")}`;
  }
  return text;
}

function getSupabaseExecutorClient(payload = {}, headers = {}) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
  if (!url) throw httpError("SUPABASE_URL wajib diset di server.", 500);

  if (serviceKey) {
    return createClient(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  const bearerToken = getBearerToken(headers);
  const botToken = getBotToken();
  const appAccessToken = bearerToken && bearerToken !== botToken ? bearerToken : "";
  if (appAccessToken && anonKey && !payload.userId) {
    return createClient(url, anonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${appAccessToken}`
        }
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  throw httpError("SUPABASE_SERVICE_ROLE_KEY wajib diset untuk AI executor server dan bot WhatsApp.", 500);
}

async function resolveExecutorActor(supabase, payload, headers = {}) {
  const bearerToken = getBearerToken(headers);
  const botToken = getBotToken();
  const headerBotToken = getHeaderValue(headers, "x-bot-token");
  const hasBotAuth = Boolean(botToken && (bearerToken === botToken || headerBotToken === botToken));
  const appAccessToken = bearerToken && bearerToken !== botToken ? bearerToken : "";

  if (appAccessToken) {
    const auth = await supabase.auth.getUser(appAccessToken);
    if (auth.data?.user?.id) {
      return {
        appUserId: auth.data.user.id,
        externalUserId: auth.data.user.id,
        channel: "app"
      };
    }

    if (!payload.userId || !hasBotAuth) {
      throw httpError("Session aplikasi tidak valid atau sudah kedaluwarsa.", 401);
    }
  }

  if (payload.userId) {
    if (botToken && !hasBotAuth) throw httpError("Token bot tidak valid.", 401);
    if (!botToken && process.env.NODE_ENV === "production") {
      throw httpError("WHATSAPP_BOT_TOKEN wajib diset untuk akses bot.", 500);
    }
    return resolveWhatsappUser(supabase, payload.userId);
  }

  throw httpError("Session aplikasi wajib dikirim lewat Authorization Bearer token.", 401);
}

function getBearerToken(headers = {}) {
  const authorization = getHeaderValue(headers, "authorization");
  return String(authorization || "").replace(/^Bearer\s+/i, "").trim();
}

function getHeaderValue(headers = {}, name) {
  if (typeof headers.get === "function") return headers.get(name) || "";
  const direct = headers[name] || headers[name.toLowerCase()] || headers[name.toUpperCase()];
  if (Array.isArray(direct)) return direct[0] || "";
  return direct || "";
}

async function resolveWhatsappUser(supabase, waUserId) {
  const linked = await supabase
    .from("whatsapp_user_links")
    .select("user_id")
    .eq("wa_user_id", waUserId)
    .maybeSingle();

  if (linked.data?.user_id) {
    return {
      appUserId: linked.data.user_id,
      externalUserId: waUserId,
      channel: "whatsapp"
    };
  }
  if (linked.error && linked.error.code !== "PGRST116" && linked.error.code !== "42P01") {
    throw linked.error;
  }

  const fallbackOwner = process.env.FINANCE_BOT_OWNER_ID ||
    process.env.DOMPETRAPI_BOT_OWNER_ID ||
    process.env.FINTRACK_BOT_OWNER_ID ||
    process.env.WHATSAPP_BOT_OWNER_ID ||
    "";

  if (!fallbackOwner) {
    throw httpError("Nomor WhatsApp belum terhubung ke akun DompetRapi.", 403);
  }

  await supabase
    .from("whatsapp_user_links")
    .upsert({ wa_user_id: waUserId, user_id: fallbackOwner }, { onConflict: "wa_user_id" });

  return {
    appUserId: fallbackOwner,
    externalUserId: waUserId,
    channel: "whatsapp"
  };
}

async function loadFinanceData(supabase, userId) {
  await ensureDefaultCategories(supabase, userId);
  const [profile, wallets, categories, transactions, budgetRows, goals] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("wallets").select("*").eq("user_id", userId).order("created_at"),
    supabase.from("categories").select("*").eq("user_id", userId).order("type", { ascending: false }).order("name"),
    supabase.from("transactions").select("*").eq("user_id", userId).order("transaction_date", { ascending: false }).order("created_at", { ascending: false }).limit(250),
    supabase.from("budgets").select("*").eq("user_id", userId).order("period_start", { ascending: false }),
    supabase.from("goals").select("*").eq("user_id", userId).order("deadline")
  ]);

  const failed = [wallets, categories, transactions, budgetRows, goals].find((result) => result.error);
  if (failed) throw failed.error;

  return {
    profile: profile.data || null,
    wallets: wallets.data || [],
    categories: categories.data || [],
    transactions: transactions.data || [],
    budgets: budgetRows.data || [],
    goals: goals.data || []
  };
}

async function ensureDefaultCategories(supabase, userId) {
  const existing = await supabase.from("categories").select("id", { count: "exact", head: true }).eq("user_id", userId);
  if (existing.error) throw existing.error;
  if (existing.count) return;

  const inserted = await supabase.from("categories").insert(
    DEFAULT_CATEGORIES.map((category) => ({ user_id: userId, ...category, is_default: true }))
  );
  if (inserted.error) throw inserted.error;
}

async function applyLiveGoldPrice(data) {
  const price = await fetchGoldPrice();
  return {
    ...data,
    wallets: data.wallets.map((wallet) => {
      if (wallet.type !== "gold") return wallet;
      const grams = Math.max(0, number(wallet.gold_grams));
      return {
        ...wallet,
        gold_grams: grams,
        gold_price_per_gram: price.perGram,
        balance: price.perGram ? grams * price.perGram : number(wallet.balance)
      };
    }),
    goldPrice: price
  };
}

async function fetchGoldPrice() {
  try {
    const response = await fetch(GOLD_PRICE_URL, { headers: { Accept: "application/json" } });
    const data = await response.json();
    const perGram = number(data?.data?.perGram);
    if (!response.ok || !data?.success || perGram <= 0) throw new Error("Harga emas tidak valid.");
    return {
      perGram,
      source: data?.data?.sumber || "harga-emas.org",
      updatedAt: data?.data?.terakhirUpdate || null
    };
  } catch (_error) {
    return { perGram: 0, source: "", updatedAt: null };
  }
}

async function classifyMessage(message, context) {
  const prompt = `Klasifikasikan pesan user ini untuk aplikasi finance DompetRapi.
Return only valid JSON, tanpa markdown.

Actions:
- general_chat: sapaan/ngobrol biasa.
- create_transaction: catat pemasukan/pengeluaran.
- delete_transaction: hapus transaksi yang sudah tercatat.
- transfer_wallet: pindah saldo antar dompet milik user.
- create_wallet: buat dompet baru, termasuk dompet emas.
- create_category: buat kategori.
- create_budget: set budget kategori.
- balance_summary: cek saldo/aset/net worth.
- gold_price: tanya harga emas.
- insight: minta analisis/saran finance.
- clarify: butuh detail tambahan.
- none: kosong/spam.

Schema:
{
  "action": "general_chat|create_transaction|delete_transaction|transfer_wallet|create_wallet|create_category|create_budget|balance_summary|gold_price|insight|clarify|none",
  "reply": "isi untuk general_chat atau clarify",
  "title": "optional",
  "amount": 25000,
  "type": "income|expense",
  "transactionId": "optional",
  "walletName": "optional",
  "sourceWalletName": "optional untuk transfer dari dompet mana",
  "destinationWalletName": "optional untuk transfer ke dompet mana",
  "walletKind": "cash|bank|ewallet|credit_card|paylater|investment|gold",
  "gold_grams": 0.01,
  "categoryName": "optional",
  "categoryType": "income|expense",
  "date": "YYYY-MM-DD optional",
  "note": "optional"
}

Nominal wajib angka rupiah. 50k jadi 50000. 2.5jt jadi 2500000.
Emas wajib gram, misalnya 0.01g jadi gold_grams 0.01.
Jangan mengarang nominal atau gram. Kalau kurang detail, action clarify.
Untuk delete_transaction, gunakan amount/note/walletName/date bila user menyebut detail. Kalau user bilang transaksi terakhir/terbaru, action delete_transaction tanpa mengarang detail.
Untuk transfer antar dompet, gunakan action transfer_wallet, sourceWalletName untuk dompet asal, destinationWalletName untuk dompet tujuan, dan amount.
Jika pesan berisi revisi aksi yang belum dikonfirmasi, utamakan "Revisi terbaru user" dibanding konfirmasi sebelumnya. Contoh: "pakai BCA aja" berarti ganti walletName ke BCA untuk aksi yang sama.

Konteks finance:
${context}

Pesan user:
${message}`;

  const result = await callAI({
    task: "advisor",
    prompt,
    system: "Kamu parser intent finance. Balas hanya JSON valid, tanpa markdown dan tanpa penjelasan."
  });

  const parsed = parseAiJson(result.text);
  return {
    ...parsed,
    model: result.model,
    action: normalizeAction(parsed.action),
    amount: normalizeAmount(parsed.amount ?? parsed.balance ?? parsed.total),
    sourceWalletName: cleanText(parsed.sourceWalletName || parsed.source_wallet_name || parsed.fromWalletName || parsed.from_wallet_name || parsed.fromWallet || parsed.sourceWallet),
    destinationWalletName: cleanText(parsed.destinationWalletName || parsed.destination_wallet_name || parsed.toWalletName || parsed.to_wallet_name || parsed.toWallet || parsed.destinationWallet),
    gold_grams: normalizeGrams(parsed.gold_grams ?? parsed.grams)
  };
}

async function executeIntent({ supabase, appUserId, message, intent, data, metrics, budgets, context }) {
  switch (intent.action) {
    case "general_chat":
      return generalChat(message, context);
    case "clarify":
      return { reply: intent.reply || "Bestie, detailnya kurang. Kasih nominal, dompet, atau kategorinya ya." };
    case "balance_summary":
      return { reply: formatBalanceSummary(data, metrics) };
    case "gold_price":
      return { reply: formatGoldPrice(data.goldPrice) };
    case "create_wallet":
      return createWallet(supabase, appUserId, intent, message);
    case "create_category":
      return createCategory(supabase, appUserId, intent);
    case "create_budget":
      return createBudget(supabase, appUserId, intent, data);
    case "create_transaction":
      return createTransaction(supabase, appUserId, intent, data);
    case "delete_transaction":
      return deleteTransaction(supabase, appUserId, intent, data);
    case "transfer_wallet":
      return transferWallet(supabase, appUserId, intent, data);
    case "insight": {
      const result = await callAI({
        task: "advisor",
        prompt: message || "Beri insight singkat kondisi keuangan saya.",
        system: `${SHANIA_PERSONA}\n\nTugas khusus: jawab sebagai sahabat finansial user. Kasih saran singkat, praktis, lovingly blunt, dan tetap aman.`,
        context
      });
      return { reply: cleanReply(result.text), model: result.model };
    }
    default:
      return { reply: "Bestie, aku belum nangkep maksudnya. Coba tulis lebih jelas ya." };
  }
}

async function previewIntent({ intent, data }) {
  if (!MUTATING_ACTIONS.has(intent.action)) {
    return { needsConfirmation: false, reply: intent.reply || previewReadonlyReply(intent, data) };
  }

  switch (intent.action) {
    case "create_transaction":
      return previewTransaction(intent, data);
    case "delete_transaction":
      return previewDeleteTransaction(intent, data);
    case "transfer_wallet":
      return previewTransfer(intent, data);
    case "create_wallet":
      return previewWallet(intent);
    case "create_category":
      return previewCategory(intent);
    case "create_budget":
      return previewBudget(intent, data);
    default:
      return { needsConfirmation: false, reply: "Bestie, aku belum nangkep maksudnya. Coba tulis lebih jelas ya." };
  }
}

function previewReadonlyReply(intent, data) {
  if (intent.action === "balance_summary") return formatBalanceSummary(data, getMetrics(data));
  if (intent.action === "gold_price") return formatGoldPrice(data.goldPrice);
  return intent.reply || "Siap bestie.";
}

async function generalChat(message, context) {
  const result = await callAI({
    task: "advisor",
    prompt: message || "Sapa user dan tawarkan bantuan finance.",
    system: `${SHANIA_PERSONA}\n\nTugas khusus: ngobrol natural sebagai ShanIA. Kalau user cuma sapa, balas hangat dan tawarkan bantuan finance tanpa kaku.`,
    context
  });
  return { reply: cleanReply(result.text) || "Siap bestie, ShanIA standby nih 😭✨ Mau spill apa hari ini?", model: result.model };
}

function previewTransaction(intent, data) {
  const amount = normalizeAmount(intent.amount);
  if (!amount) return { needsConfirmation: false, reply: "Nominalnya belum kebaca, bestie. Contoh: kopi 25rb gopay." };

  const type = intent.type === "income" ? "income" : "expense";
  const wallet = pickWallet(data.wallets, intent.walletName);
  if (!wallet) return { needsConfirmation: false, reply: "Belum ada dompet rupiah yang bisa dipakai. Buat dompet dulu ya." };
  if (wallet.type === "gold") return { needsConfirmation: false, reply: "Dompet emas pakai gram, jadi tidak bisa dipakai untuk transaksi rupiah biasa." };

  if (type === "expense" && !isDebtWallet(wallet) && number(wallet.balance) < amount) {
    return {
      blocked: true,
      needsConfirmation: false,
      reply: `Saldo ${wallet.name} tidak cukup. Sisa ${money(wallet.balance)}, transaksi ${money(amount)} tidak bisa diproses.`
    };
  }

  const categoryName = intent.categoryName || inferCategoryName(intent.title || intent.note || "");
  const note = cleanText(intent.note || intent.title || (type === "income" ? "Pemasukan AI" : "Pengeluaran AI"));
  return {
    needsConfirmation: true,
    reply: [
      `Konfirmasi dulu ya:`,
      `${type === "income" ? "Catat pemasukan" : "Catat pengeluaran"} ${money(amount)}`,
      `Dompet: ${wallet.name}`,
      `Kategori: ${categoryName}`,
      note ? `Catatan: ${note}` : "",
      "",
      `Balas *ya* untuk simpan atau *batal* untuk membatalkan.`
    ].filter(Boolean).join("\n")
  };
}

function previewDeleteTransaction(intent, data) {
  const transaction = findTransaction(data, intent);
  if (!transaction) {
    return { needsConfirmation: false, reply: "Transaksi yang mau dihapus belum ketemu. Sebutkan nominal, catatan, atau bilang hapus transaksi terakhir." };
  }

  const wallet = data.wallets.find((item) => item.id === transaction.wallet_id);
  const category = data.categories.find((item) => item.id === transaction.category_id);
  const amount = number(transaction.amount);
  const transactionsToDelete = getLinkedTransferTransactions(data, transaction);
  const walletPlans = buildWalletRestorePlans(data, transactionsToDelete);
  const blockedPlan = walletPlans.find((plan) => !isDebtWallet(plan.wallet) && plan.nextBalance < 0);

  if (blockedPlan) {
    return {
      blocked: true,
      needsConfirmation: false,
      reply: `Transaksi tidak bisa dihapus karena saldo ${blockedPlan.wallet.name} akan minus.`
    };
  }

  if (isTransferTransaction(transaction)) {
    const sourcePlan = walletPlans.find((plan) => plan.delta > 0);
    const destinationPlan = walletPlans.find((plan) => plan.delta < 0);
    return {
      needsConfirmation: true,
      reply: [
        `Konfirmasi hapus transfer ini:`,
        `${money(amount)} ${sourcePlan?.wallet?.name ? `kembali ke ${sourcePlan.wallet.name}` : ""}${destinationPlan?.wallet?.name ? ` dan dikurangi dari ${destinationPlan.wallet.name}` : ""}`.trim(),
        transaction.note ? `Catatan: ${transaction.note}` : "",
        "",
        `Balas *ya* untuk hapus atau *batal* untuk membatalkan.`
      ].filter(Boolean).join("\n")
    };
  }

  return {
    needsConfirmation: true,
    reply: [
      `Konfirmasi hapus transaksi ini:`,
      `${transaction.type === "income" ? "Pemasukan" : "Pengeluaran"} ${money(amount)}`,
      wallet ? `Dompet: ${wallet.name}` : "",
      category ? `Kategori: ${category.name}` : "",
      transaction.note ? `Catatan: ${transaction.note}` : "",
      transaction.transaction_date ? `Tanggal: ${transaction.transaction_date}` : "",
      wallet ? `Saldo ${wallet.name} akan ${transaction.type === "expense" ? "bertambah" : "berkurang"} ${money(amount)}.` : "",
      "",
      `Balas *ya* untuk hapus atau *batal* untuk membatalkan.`
    ].filter(Boolean).join("\n")
  };
}

function previewTransfer(intent, data) {
  const amount = normalizeAmount(intent.amount);
  if (!amount) return { needsConfirmation: false, reply: "Nominal transfernya belum kebaca. Contoh: transfer 100rb dari Cash ke BCA." };

  const source = pickWallet(data.wallets, intent.sourceWalletName || intent.walletName);
  const destination = pickDestinationWallet(data.wallets, intent.destinationWalletName, source?.id);
  if (!source) return { needsConfirmation: false, reply: "Dompet asalnya belum ketemu. Sebutkan dari dompet mana ya." };
  if (!destination) return { needsConfirmation: false, reply: "Dompet tujuannya belum ketemu. Sebutkan mau transfer ke dompet mana ya." };
  if (source.id === destination.id) return { needsConfirmation: false, reply: "Dompet asal dan tujuan harus berbeda." };
  if (source.type === "gold" || destination.type === "gold") {
    return { needsConfirmation: false, reply: "Dompet emas tidak bisa dipakai untuk transfer rupiah." };
  }
  if (!isDebtWallet(source) && number(source.balance) < amount) {
    return {
      blocked: true,
      needsConfirmation: false,
      reply: `Saldo ${source.name} tidak cukup. Sisa ${money(source.balance)}, transfer ${money(amount)} tidak bisa diproses.`
    };
  }

  return {
    needsConfirmation: true,
    reply: [
      `Konfirmasi transfer saldo:`,
      `${money(amount)} dari ${source.name} ke ${destination.name}`,
      intent.note ? `Catatan: ${cleanText(intent.note)}` : "",
      "",
      `Balas *ya* untuk transfer atau *batal* untuk membatalkan.`
    ].filter(Boolean).join("\n")
  };
}

function previewWallet(intent) {
  const type = WALLET_TYPES.has(intent.walletKind) ? intent.walletKind : normalizeWalletKind(intent.walletKind || intent.type);
  const rawName = cleanText(intent.walletName || intent.title);
  const name = rawName || (type === "gold" ? "Emas tabungan" : "");
  const goldGrams = type === "gold" ? normalizeGrams(intent.gold_grams) : 0;
  const balance = type === "gold" ? 0 : Math.max(0, number(intent.amount));

  if (!name) {
    return { needsConfirmation: false, reply: "Nama dompetnya apa, bestie?" };
  }

  if (type !== "gold" && !hasIntentValue(intent.amount)) {
    return { needsConfirmation: false, reply: `Saldo awal dompet ${name} berapa? Kalau kosong, balas 0.` };
  }

  if (type === "gold" && goldGrams <= 0) {
    return { needsConfirmation: false, reply: "Bestie, jumlah emasnya belum jelas. Contoh: buat dompet emas 0.01 gram." };
  }

  return {
    needsConfirmation: true,
    reply: `Konfirmasi buat dompet ${name} tipe ${walletTypeLabel(type)} dengan isi awal ${type === "gold" ? `${formatGrams(goldGrams)} gram` : money(balance)}?\n\nBalas *ya* untuk buat atau *batal* untuk membatalkan.`
  };
}

function previewCategory(intent) {
  const name = cleanText(intent.categoryName || intent.title || intent.note);
  const type = intent.categoryType === "income" ? "income" : "expense";
  if (!name) return { needsConfirmation: false, reply: "Nama kategorinya apa, bestie?" };
  return {
    needsConfirmation: true,
    reply: `Konfirmasi buat kategori ${name} untuk ${type === "income" ? "pemasukan" : "pengeluaran"}?\n\nBalas *ya* untuk buat atau *batal* untuk membatalkan.`
  };
}

function previewBudget(intent, data) {
  const amount = normalizeAmount(intent.amount);
  if (!amount) return { needsConfirmation: false, reply: "Nominal budgetnya belum kebaca, bestie. Contoh: budget makan 1jt." };
  const categoryName = cleanText(intent.categoryName) || "Belanja";
  const existing = findByName(data.categories.filter((item) => item.type === "expense"), categoryName);
  return {
    needsConfirmation: true,
    reply: `Konfirmasi set budget ${existing?.name || categoryName} bulan ini ke ${money(amount)}?\n\nBalas *ya* untuk simpan atau *batal* untuk membatalkan.`
  };
}

async function handleReceipt({ supabase, actor, payload, data, context, preview = false }) {
  const result = await callAI({
    task: "receipt",
    prompt: payload.message || "Scan struk ini dan buat transaksi pengeluaran.",
    imageUrl: payload.image_base64,
    system: `${SHANIA_PERSONA}

Tugas khusus: OCR struk untuk DompetRapi. Tanggal hari ini adalah ${isoDate(new Date())}. Ringkas struk dengan gaya ShanIA yang singkat, lalu wajib akhiri dengan JSON valid:
{"total": 0, "date": "YYYY-MM-DD", "merchant": "nama toko", "note": "deskripsi singkat", "category": "Makanan"}
Kalau tanggal tidak ada di struk, pakai tanggal hari ini (${isoDate(new Date())}). Category pilih: Makanan, Transportasi, Belanja, Hiburan, Kesehatan, Tagihan. Total harus angka asli dari struk, jangan dibulatkan.`,
    context
  });

  const receipt = parseReceiptJson(result.text);
  if (!receipt.total) {
    return {
      handled: true,
      userId: actor.externalUserId,
      appUserId: actor.appUserId,
      channel: actor.channel,
      action: "receipt_scan",
      changed: false,
      source: "dompetrapi-ai-execute",
      model: result.model,
      reply: cleanReply(result.text)
    };
  }

  const receiptCategoryName = receipt.category || "Belanja";
  const category = preview
    ? findByName(data.categories.filter((item) => item.type === "expense"), receiptCategoryName) || { name: receiptCategoryName }
    : await findOrCreateCategory(supabase, actor.appUserId, data.categories, receiptCategoryName, "expense");
  const wallet = pickWalletFromMessage(data.wallets, payload.message) || pickWallet(data.wallets, null);
  if (!wallet) throw httpError("Belum ada dompet rupiah untuk menyimpan transaksi struk.", 400);
  if (!isDebtWallet(wallet) && number(wallet.balance) < number(receipt.total)) {
    return {
      handled: true,
      userId: actor.externalUserId,
      appUserId: actor.appUserId,
      channel: actor.channel,
      action: "receipt_scan",
      changed: false,
      blocked: true,
      source: "dompetrapi-ai-execute",
      model: result.model,
      reply: `Saldo ${wallet.name} tidak cukup untuk struk ${money(receipt.total)}. Sisa saldo ${money(wallet.balance)}.`
    };
  }

  if (preview) {
    return {
      handled: true,
      userId: actor.externalUserId,
      appUserId: actor.appUserId,
      channel: actor.channel,
      action: "receipt_scan",
      changed: false,
      needsConfirmation: true,
      source: "dompetrapi-ai-execute",
      model: result.model,
      reply: [
        `Konfirmasi simpan struk ini:`,
        `Pengeluaran ${money(receipt.total)}`,
        `Dompet: ${wallet.name}`,
        `Kategori: ${category.name}`,
        receipt.merchant ? `Merchant: ${receipt.merchant}` : "",
        receipt.note ? `Catatan: ${receipt.note}` : "",
        "",
        `Balas *ya* untuk simpan atau *batal* untuk membatalkan.`
      ].filter(Boolean).join("\n")
    };
  }

  await insertTransactionAndUpdateWallet(supabase, actor.appUserId, {
    wallet,
    category,
    type: "expense",
    amount: number(receipt.total),
    date: validDate(receipt.date) || isoDate(new Date()),
    note: receipt.note || receipt.merchant || payload.message || "Scan struk"
  });

  return {
    handled: true,
    userId: actor.externalUserId,
    appUserId: actor.appUserId,
    channel: actor.channel,
    action: "receipt_scan",
    changed: true,
    source: "dompetrapi-ai-execute",
    model: result.model,
    reply: `Siap, struk tersimpan sebagai pengeluaran ${money(receipt.total)} dari ${wallet.name}. ${receipt.merchant ? `Merchant: ${receipt.merchant}.` : ""}`
  };
}

async function createWallet(supabase, userId, intent, message) {
  const type = WALLET_TYPES.has(intent.walletKind) ? intent.walletKind : normalizeWalletKind(intent.walletKind || intent.type);
  const rawName = cleanText(intent.walletName || intent.title);
  const name = rawName || (type === "gold" ? "Emas tabungan" : "");
  const goldGrams = type === "gold" ? (intent.gold_grams || parseGramText(message)) : 0;
  const balance = type === "gold" ? 0 : Math.max(0, number(intent.amount));

  if (!name) {
    return { reply: "Nama dompetnya apa, bestie?" };
  }

  if (type !== "gold" && !hasIntentValue(intent.amount)) {
    return { reply: `Saldo awal dompet ${name} berapa? Kalau kosong, balas 0.` };
  }

  if (type === "gold" && goldGrams <= 0) {
    return { reply: "Bestie, jumlah emasnya belum jelas. Contoh: buat dompet emas 0.01 gram." };
  }

  const inserted = await supabase.from("wallets").insert({
    user_id: userId,
    name,
    type,
    balance,
    gold_grams: goldGrams,
    color: type === "gold" ? "#ca8a04" : "#0f8b8d"
  }).select("*").single();
  if (inserted.error) throw inserted.error;

  const valueText = type === "gold" ? `${formatGrams(goldGrams)} gram` : money(balance);
  return { reply: `Siap, dompet ${name} berhasil dibuat dengan isi ${valueText}.`, changed: true };
}

async function createCategory(supabase, userId, intent) {
  const name = cleanText(intent.categoryName || intent.title || intent.note);
  const type = intent.categoryType === "income" ? "income" : "expense";
  if (!name) return { reply: "Nama kategorinya apa, bestie?" };

  const category = await findOrCreateCategory(supabase, userId, [], name, type);
  return { reply: `Siap, kategori ${category.name} berhasil disiapkan.`, changed: true };
}

async function createBudget(supabase, userId, intent, data) {
  const amount = normalizeAmount(intent.amount);
  if (!amount) return { reply: "Nominal budgetnya belum kebaca, bestie. Contoh: budget makan 1jt." };

  const category = await findOrCreateCategory(supabase, userId, data.categories, intent.categoryName || "Belanja", "expense");
  const payload = {
    user_id: userId,
    category_id: category.id,
    period_start: periodStart(),
    method: "fixed",
    amount,
    percentage: null
  };

  const saved = await supabase.from("budgets").upsert(payload, { onConflict: "user_id,category_id,period_start" });
  if (saved.error) throw saved.error;
  return { reply: `Budget ${category.name} bulan ini diset ke ${money(amount)}.`, changed: true };
}

async function createTransaction(supabase, userId, intent, data) {
  const amount = normalizeAmount(intent.amount);
  if (!amount) return { reply: "Nominalnya belum kebaca, bestie. Contoh: kopi 25rb gopay." };

  const type = intent.type === "income" ? "income" : "expense";
  const wallet = pickWallet(data.wallets, intent.walletName);
  if (!wallet) return { reply: "Belum ada dompet rupiah yang bisa dipakai. Buat dompet dulu ya." };
  if (wallet.type === "gold") return { reply: "Dompet emas pakai gram, jadi tidak bisa dipakai untuk transaksi rupiah biasa." };

  if (type === "expense" && !isDebtWallet(wallet) && number(wallet.balance) < amount) {
    return { reply: `Saldo ${wallet.name} tidak cukup. Sisa ${money(wallet.balance)}.` };
  }

  const categoryName = intent.categoryName || inferCategoryName(intent.title || intent.note || "");
  const category = await findOrCreateCategory(supabase, userId, data.categories, categoryName, type);

  await insertTransactionAndUpdateWallet(supabase, userId, {
    wallet,
    category,
    type,
    amount,
    date: validDate(intent.date) || isoDate(new Date()),
    note: cleanText(intent.note || intent.title || (type === "income" ? "Pemasukan AI" : "Pengeluaran AI"))
  });

  return {
    reply: `${type === "income" ? "Pemasukan" : "Pengeluaran"} ${money(amount)} berhasil dicatat di ${wallet.name} untuk ${category.name}.`,
    changed: true
  };
}

async function deleteTransaction(supabase, userId, intent, data) {
  const transaction = findTransaction(data, intent);
  if (!transaction) {
    return { reply: "Transaksi yang mau dihapus belum ketemu. Sebutkan nominal, catatan, atau bilang hapus transaksi terakhir." };
  }

  const wallet = data.wallets.find((item) => item.id === transaction.wallet_id);
  const amount = number(transaction.amount);
  const transactionsToDelete = getLinkedTransferTransactions(data, transaction);
  const walletPlans = buildWalletRestorePlans(data, transactionsToDelete);
  const blockedPlan = walletPlans.find((plan) => !isDebtWallet(plan.wallet) && plan.nextBalance < 0);

  if (blockedPlan) {
    return { reply: `Transaksi tidak bisa dihapus karena saldo ${blockedPlan.wallet.name} akan minus.` };
  }

  const ids = transactionsToDelete.map((item) => item.id);
  const deleted = await supabase
    .from("transactions")
    .delete()
    .in("id", ids)
    .eq("user_id", userId);
  if (deleted.error) throw deleted.error;

  for (const plan of walletPlans) {
    const update = await supabase
      .from("wallets")
      .update({ balance: plan.nextBalance })
      .eq("id", plan.wallet.id)
      .eq("user_id", userId);
    if (update.error) throw update.error;
  }

  if (isTransferTransaction(transaction)) {
    return {
      changed: true,
      reply: `Transfer ${money(amount)} berhasil dihapus dan saldo dompet asal/tujuan sudah dikembalikan.`
    };
  }

  return {
    changed: true,
    reply: wallet
      ? `Transaksi ${money(amount)} berhasil dihapus. Saldo ${wallet.name} ${transaction.type === "expense" ? "bertambah" : "berkurang"} ${money(amount)}.`
      : `Transaksi ${money(amount)} berhasil dihapus.`
  };
}

async function transferWallet(supabase, userId, intent, data) {
  const amount = normalizeAmount(intent.amount);
  if (!amount) return { reply: "Nominal transfernya belum kebaca. Contoh: transfer 100rb dari Cash ke BCA." };

  const source = pickWallet(data.wallets, intent.sourceWalletName || intent.walletName);
  const destination = pickDestinationWallet(data.wallets, intent.destinationWalletName, source?.id);
  if (!source) return { reply: "Dompet asalnya belum ketemu. Sebutkan dari dompet mana ya." };
  if (!destination) return { reply: "Dompet tujuannya belum ketemu. Sebutkan mau transfer ke dompet mana ya." };
  if (source.id === destination.id) return { reply: "Dompet asal dan tujuan harus berbeda." };
  if (source.type === "gold" || destination.type === "gold") {
    return { reply: "Dompet emas tidak bisa dipakai untuk transfer rupiah." };
  }
  if (!isDebtWallet(source) && number(source.balance) < amount) {
    return { reply: `Saldo ${source.name} tidak cukup. Sisa ${money(source.balance)}.` };
  }

  const transferCategories = await ensureTransferCategories(supabase, userId, data.categories);
  const groupId = createUuid();
  const date = validDate(intent.date) || isoDate(new Date());
  const note = cleanText(intent.note || intent.title || `Transfer ${source.name} ke ${destination.name}`);

  const inserted = await supabase.from("transactions").insert([
    {
      user_id: userId,
      wallet_id: source.id,
      category_id: transferCategories.expense.id,
      type: "expense",
      amount,
      transaction_date: date,
      note,
      is_transfer: true,
      transfer_group_id: groupId,
      transfer_wallet_id: destination.id
    },
    {
      user_id: userId,
      wallet_id: destination.id,
      category_id: transferCategories.income.id,
      type: "income",
      amount,
      transaction_date: date,
      note,
      is_transfer: true,
      transfer_group_id: groupId,
      transfer_wallet_id: source.id
    }
  ]);
  if (inserted.error) throw inserted.error;

  const sourceUpdate = await supabase
    .from("wallets")
    .update({ balance: number(source.balance) - amount })
    .eq("id", source.id)
    .eq("user_id", userId);
  if (sourceUpdate.error) throw sourceUpdate.error;

  const destinationUpdate = await supabase
    .from("wallets")
    .update({ balance: number(destination.balance) + amount })
    .eq("id", destination.id)
    .eq("user_id", userId);
  if (destinationUpdate.error) throw destinationUpdate.error;

  return {
    changed: true,
    reply: `Transfer ${money(amount)} dari ${source.name} ke ${destination.name} berhasil.`
  };
}

async function insertTransactionAndUpdateWallet(supabase, userId, { wallet, category, type, amount, date, note }) {
  const tx = await supabase.from("transactions").insert({
    user_id: userId,
    wallet_id: wallet.id,
    category_id: category.id,
    type,
    amount,
    transaction_date: date,
    note
  });
  if (tx.error) throw tx.error;

  const delta = type === "income" ? amount : -amount;
  const update = await supabase
    .from("wallets")
    .update({ balance: number(wallet.balance) + delta })
    .eq("id", wallet.id)
    .eq("user_id", userId);
  if (update.error) throw update.error;
}

async function findOrCreateCategory(supabase, userId, categories, name, type) {
  const fallbackName = type === "income" ? "Bonus" : "Belanja";
  const cleanName = cleanText(name || fallbackName);
  const existing = findByName(categories, cleanName) || categories.find((category) => category.type === type && category.name === fallbackName);
  if (existing) return existing;

  const saved = await supabase.from("categories").insert({
    user_id: userId,
    name: cleanName,
    type,
    color: type === "income" ? "#2f9e44" : "#8f5f3f",
    icon: "circle",
    is_default: false
  }).select("*").single();
  if (saved.error) throw saved.error;
  return saved.data;
}

async function ensureTransferCategories(supabase, userId, categories = []) {
  const existingExpense = findByName(categories.filter((category) => category.type === "expense"), "Transfer");
  const existingIncome = findByName(categories.filter((category) => category.type === "income"), "Transfer");
  const missingRows = [
    existingExpense ? null : { user_id: userId, name: "Transfer", type: "expense", color: "#64748b", icon: "arrow-right-left", is_default: true },
    existingIncome ? null : { user_id: userId, name: "Transfer", type: "income", color: "#64748b", icon: "arrow-right-left", is_default: true }
  ].filter(Boolean);

  let savedCategories = [];
  if (missingRows.length) {
    const saved = await supabase
      .from("categories")
      .upsert(missingRows, { onConflict: "user_id,type,name" })
      .select("*");
    if (saved.error) throw saved.error;
    savedCategories = saved.data || [];
  }

  const allCategories = [...categories, ...savedCategories];
  return {
    expense: findByName(allCategories.filter((category) => category.type === "expense"), "Transfer"),
    income: findByName(allCategories.filter((category) => category.type === "income"), "Transfer")
  };
}

async function logAiEvent(supabase, userId, kind, prompt, result) {
  try {
    await supabase.from("ai_events").insert({
      user_id: userId,
      kind,
      prompt: prompt || null,
      output: {
        action: result.action || null,
        changed: Boolean(result.changed),
        channel: result.channel || "app",
        model: result.model || null,
        reply: result.reply || ""
      }
    });
  } catch (_error) {
    // Logging must never block finance execution.
  }
}

function pickWallet(wallets, walletName) {
  const rupiahWallets = wallets.filter((wallet) => wallet.type !== "gold");
  return findByName(rupiahWallets, walletName) || rupiahWallets.find((wallet) => !["credit_card", "paylater"].includes(wallet.type)) || rupiahWallets[0] || null;
}

function pickDestinationWallet(wallets, walletName, sourceWalletId) {
  const rupiahWallets = wallets.filter((wallet) => wallet.type !== "gold" && wallet.id !== sourceWalletId);
  return findByName(rupiahWallets, walletName) || rupiahWallets.find((wallet) => !["credit_card", "paylater"].includes(wallet.type)) || rupiahWallets[0] || null;
}

function pickWalletFromMessage(wallets, message) {
  const normalizedMessage = normalizeName(extractLatestUserRevision(message));
  if (!normalizedMessage) return null;
  const rupiahWallets = wallets.filter((wallet) => wallet.type !== "gold");
  return rupiahWallets.find((wallet) => {
    const name = normalizeName(wallet.name);
    return name && normalizedMessage.includes(name);
  }) || null;
}

function extractLatestUserRevision(message) {
  const text = String(message || "");
  const marker = "Revisi terbaru user:";
  const markerIndex = text.lastIndexOf(marker);
  if (markerIndex === -1) return text;
  return text.slice(markerIndex + marker.length);
}

function findTransaction(data, intent) {
  const txId = cleanText(intent.transactionId || intent.transaction_id || intent.id);
  if (txId) {
    const byId = data.transactions.find((transaction) => transaction.id === txId);
    if (byId) return byId;
  }

  const amount = normalizeAmount(intent.amount);
  const type = intent.type === "income" || intent.type === "expense" ? intent.type : "";
  const date = validDate(intent.date);
  const wallet = intent.walletName ? findByName(data.wallets, intent.walletName) : null;
  const category = intent.categoryName ? findByName(data.categories, intent.categoryName) : null;
  const noteNeedle = normalizeName(intent.note || intent.title || "");

  const candidates = data.transactions.filter((transaction) => {
    if (amount && number(transaction.amount) !== amount) return false;
    if (type && transaction.type !== type) return false;
    if (date && transaction.transaction_date !== date) return false;
    if (wallet && transaction.wallet_id !== wallet.id) return false;
    if (category && transaction.category_id !== category.id) return false;
    if (noteNeedle && !normalizeName(transaction.note || "").includes(noteNeedle)) return false;
    return true;
  });

  return candidates[0] || null;
}

function reverseTransactionDelta(transaction) {
  const amount = number(transaction.amount);
  return transaction.type === "income" ? -amount : amount;
}

function isTransferTransaction(transaction) {
  return Boolean(transaction?.is_transfer || transaction?.transfer_group_id || transaction?.transfer_wallet_id);
}

function getFinanceTransactions(data) {
  return (data.transactions || []).filter((transaction) => !isTransferTransaction(transaction));
}

function getLinkedTransferTransactions(data, transaction) {
  if (!transaction) return [];
  if (!isTransferTransaction(transaction) || !transaction.transfer_group_id) return [transaction];
  return data.transactions.filter((item) => item.transfer_group_id === transaction.transfer_group_id);
}

function buildWalletRestorePlans(data, transactions) {
  const deltas = new Map();
  transactions.forEach((transaction) => {
    if (!transaction?.wallet_id) return;
    deltas.set(transaction.wallet_id, (deltas.get(transaction.wallet_id) || 0) + reverseTransactionDelta(transaction));
  });
  return [...deltas.entries()]
    .map(([walletId, delta]) => {
      const wallet = data.wallets.find((item) => item.id === walletId);
      return wallet ? { wallet, delta, nextBalance: number(wallet.balance) + delta } : null;
    })
    .filter(Boolean);
}

function isDebtWallet(wallet) {
  return ["credit_card", "paylater"].includes(wallet?.type);
}

function walletTypeLabel(type) {
  const labels = {
    bank: "Bank",
    ewallet: "E-wallet",
    cash: "Cash",
    credit_card: "Kartu kredit",
    paylater: "PayLater",
    investment: "Investasi",
    gold: "Emas"
  };
  return labels[type] || type || "Dompet";
}

function inferCategoryName(text) {
  const value = String(text || "").toLowerCase();
  if (/kopi|makan|nasi|roti|minum|gofood|grabfood/.test(value)) return "Makanan";
  if (/grab|gojek|bensin|parkir|tol|bus|kereta/.test(value)) return "Transportasi";
  if (/listrik|internet|pulsa|tagihan|air|pln/.test(value)) return "Tagihan";
  if (/obat|dokter|klinik|rumah sakit/.test(value)) return "Kesehatan";
  if (/film|game|netflix|hiburan/.test(value)) return "Hiburan";
  return "Belanja";
}

function formatBalanceSummary(data, metrics) {
  const walletLines = data.wallets.slice(0, 8).map((wallet) => {
    if (wallet.type === "gold") {
      return `- ${wallet.name}: ${formatGrams(wallet.gold_grams)} g (${money(wallet.balance)})`;
    }
    return `- ${wallet.name}: ${money(wallet.balance)}`;
  });

  return [
    `Ringkasan DompetRapi:`,
    `Net worth: ${money(metrics.netWorth)}`,
    `Aset: ${money(metrics.assets)}`,
    `Utang: ${money(metrics.debt)}`,
    `Pemasukan bulan ini: ${money(metrics.monthlyIncome)}`,
    `Pengeluaran bulan ini: ${money(metrics.monthlyExpense)}`,
    ``,
    `Dompet:`,
    ...walletLines
  ].join("\n");
}

function formatGoldPrice(goldPrice) {
  if (!goldPrice?.perGram) return "Harga emas belum bisa diambil sekarang, bestie. Coba lagi sebentar ya.";
  return `Harga emas sekarang ${money(goldPrice.perGram)} per gram${goldPrice.source ? ` dari ${goldPrice.source}` : ""}.`;
}

function buildFinanceContext(data, budgets, metrics) {
  return JSON.stringify({
    currency: "IDR",
    metrics,
    gold_price: data.goldPrice,
    budgets: budgets.map((budget) => ({
      category: budget.categoryName,
      spent: budget.spent,
      limit: budget.limit,
      remaining: budget.remaining,
      usage_percent: Math.round(budget.percent),
      status: budget.status
    })),
    wallets: data.wallets.map((wallet) => ({
      name: wallet.name,
      type: wallet.type,
      balance: number(wallet.balance),
      gold_grams: wallet.type === "gold" ? number(wallet.gold_grams) : undefined,
      gold_price_per_gram: wallet.type === "gold" ? number(wallet.gold_price_per_gram) : undefined
    })),
    latest_transactions: data.transactions.slice(0, 12).map((transaction) => ({
      type: transaction.type,
      amount: number(transaction.amount),
      date: transaction.transaction_date,
      note: transaction.note,
      is_transfer: isTransferTransaction(transaction),
      category: data.categories.find((category) => category.id === transaction.category_id)?.name || null,
      wallet: data.wallets.find((wallet) => wallet.id === transaction.wallet_id)?.name || null,
      paired_wallet: data.wallets.find((wallet) => wallet.id === transaction.transfer_wallet_id)?.name || null
    }))
  }, null, 2);
}

function getMetrics(data) {
  const month = monthKey(new Date());
  const financeTransactions = getFinanceTransactions(data);
  const monthTransactions = financeTransactions.filter((item) => monthKey(item.transaction_date) === month);
  const monthlyIncome = sum(monthTransactions.filter((item) => item.type === "income"), "amount");
  const monthlyExpense = sum(monthTransactions.filter((item) => item.type === "expense"), "amount");
  const assets = sum(data.wallets.filter((item) => !["credit_card", "paylater"].includes(item.type)), "balance");
  const debt = Math.abs(sum(data.wallets.filter((item) => ["credit_card", "paylater"].includes(item.type)), "balance"));
  const netWorth = assets - debt;
  const savingsRate = monthlyIncome ? Math.round(((monthlyIncome - monthlyExpense) / monthlyIncome) * 100) : 0;
  const budgets = enrichBudgets(data);
  const budgetUsage = budgets.length ? Math.round(budgets.reduce((total, budget) => total + Math.min(budget.percent, 150), 0) / budgets.length) : 0;

  return {
    monthlyIncome,
    monthlyExpense,
    assets,
    debt,
    netWorth,
    savingsRate,
    budgetUsage
  };
}

function enrichBudgets(data) {
  const month = monthKey(new Date());
  const financeTransactions = getFinanceTransactions(data);
  const income = sum(financeTransactions.filter((item) => item.type === "income" && monthKey(item.transaction_date) === month), "amount");
  const expenses = financeTransactions.filter((item) => item.type === "expense" && monthKey(item.transaction_date) === month);
  return data.budgets
    .filter((item) => !item.period_start || monthKey(item.period_start) === month)
    .map((budget) => {
      const category = data.categories.find((item) => item.id === budget.category_id);
      const spent = sum(expenses.filter((item) => item.category_id === budget.category_id), "amount");
      const fixedLimit = number(budget.amount);
      const percentage = number(budget.percentage);
      const percentageLimit = budget.method === "percentage" && percentage > 0 && income > 0 ? income * (percentage / 100) : 0;
      const limit = percentageLimit || fixedLimit || 0;
      const percent = limit ? (spent / limit) * 100 : spent > 0 ? 100 : 0;
      const remaining = limit - spent;
      return {
        ...budget,
        categoryName: category?.name || "Kategori",
        spent,
        limit,
        percent,
        remaining,
        status: percent > 100 ? "over" : percent >= 85 ? "near" : "safe"
      };
    });
}

function parseAiJson(text) {
  const cleaned = String(text || "").trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const jsonText = cleaned.match(/\{[\s\S]*\}/)?.[0] || cleaned;
  try {
    const parsed = JSON.parse(jsonText);
    return parsed && typeof parsed === "object" ? parsed : { action: "general_chat", reply: cleaned };
  } catch (_error) {
    return { action: "general_chat", reply: cleaned };
  }
}

function parseReceiptJson(text) {
  const parsed = parseAiJson(text);
  return {
    total: normalizeAmount(parsed.total || parsed.amount),
    date: validDate(parsed.date) || isoDate(new Date()),
    merchant: cleanText(parsed.merchant),
    note: cleanText(parsed.note),
    category: cleanText(parsed.category || "Belanja")
  };
}

function normalizeAction(value) {
  const action = String(value || "general_chat").toLowerCase().trim().replace(/[\s-]+/g, "_");
  return FINANCE_ACTIONS.has(action) ? action : "general_chat";
}

function normalizeWalletKind(value) {
  const kind = String(value || "").toLowerCase().replace(/[\s-]+/g, "_");
  if (kind === "e_wallet" || kind === "ovo" || kind === "gopay" || kind === "dana") return "ewallet";
  if (kind === "credit" || kind === "kartu_kredit") return "credit_card";
  if (WALLET_TYPES.has(kind)) return kind;
  return "bank";
}

function normalizeAmount(value) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  const parsed = parseAmountText(value);
  return parsed || undefined;
}

function hasIntentValue(value) {
  if (value === undefined || value === null) return false;
  return String(value).trim() !== "";
}

function parseAmountText(text) {
  const match = String(text || "").match(/(?:rp\s*)?(\d+(?:[.,]\d+)*(?:\s?\d{3})?)(?:\s*(rb|ribu|k|jt|juta|m|miliar))?/i);
  if (!match) return 0;
  const raw = match[1].replace(/\s/g, "");
  const suffix = match[2]?.toLowerCase();
  const numeric = suffix ? parseSuffixedAmountNumber(raw) : parseNumericString(raw);
  const multiplier = suffix === "rb" || suffix === "ribu" || suffix === "k"
    ? 1000
    : suffix === "jt" || suffix === "juta"
      ? 1000000
      : suffix === "m" || suffix === "miliar"
        ? 1000000000
        : 1;
  return Number.isFinite(numeric) ? Math.round(numeric * multiplier) : 0;
}

function parseSuffixedAmountNumber(raw) {
  const text = String(raw || "").trim();
  const hasDot = text.includes(".");
  const hasComma = text.includes(",");
  if (!hasDot && !hasComma) return Number(text);
  if (hasDot && hasComma) return parseNumericString(text);
  const separator = hasDot ? "." : ",";
  const parts = text.split(separator);
  if (parts.length === 2) return Number(text.replace(separator, "."));
  return parseNumericString(text);
}

function normalizeGrams(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return parseGramText(value);
}

function parseGramText(text) {
  const match = String(text || "").match(/(\d+(?:[.,]\d+)?)\s*(g|gram|gr)/i);
  if (!match) return 0;
  const grams = Number(match[1].replace(",", "."));
  return Number.isFinite(grams) ? grams : 0;
}

function createUuid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const value = Math.floor(Math.random() * 16);
    return (char === "x" ? value : (value & 0x3) | 0x8).toString(16);
  });
}

function findByName(items, name) {
  const target = normalizeName(name);
  if (!target) return null;
  return items.find((item) => normalizeName(item.name) === target) ||
    items.find((item) => normalizeName(item.name).includes(target) || target.includes(normalizeName(item.name))) ||
    null;
}

function normalizeName(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function cleanText(value) {
  return String(value || "").trim();
}

function cleanReply(value) {
  return String(value || "").replace(/\*\*/g, "").trim();
}

function sum(items, key) {
  return items.reduce((total, item) => total + number(item[key]), 0);
}

function number(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = typeof value === "string" ? parseNumericString(value) : Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseNumericString(value) {
  const text = String(value || "").trim();
  if (!text) return 0;
  const negative = /^-/.test(text);
  const raw = text.replace(/[^\d.,]/g, "");
  if (!raw) return 0;
  const lastDot = raw.lastIndexOf(".");
  const lastComma = raw.lastIndexOf(",");
  let normalized = raw;

  if (lastDot !== -1 && lastComma !== -1) {
    const decimalSeparator = lastDot > lastComma ? "." : ",";
    const thousandSeparator = decimalSeparator === "." ? "," : ".";
    normalized = raw
      .replace(new RegExp(`\\${thousandSeparator}`, "g"), "")
      .replace(decimalSeparator, ".");
  } else if (lastDot !== -1 || lastComma !== -1) {
    const separator = lastDot !== -1 ? "." : ",";
    const parts = raw.split(separator);
    const looksGrouped = parts.length > 2 || (parts.length === 2 && parts[1].length === 3 && parts[0].length <= 3);
    normalized = looksGrouped ? parts.join("") : raw.replace(separator, ".");
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? (negative ? -parsed : parsed) : 0;
}

function monthKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 7);
}

function periodStart() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function validDate(value) {
  const text = String(value || "");
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function money(value) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(number(value));
}

function formatGrams(value) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 6 }).format(number(value));
}

function httpError(message, statusCode = 500) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}
