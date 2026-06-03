const BIGMODEL_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";
const CHAT_MODEL = "glm-4.7-flash";
const VISION_MODEL = "glm-4.6v-flash";

function getBigModelApiKey() {
  return process.env.BIGMODEL_API_KEY || process.env.ZHIPU_API_KEY || "";
}

function getModel({ imageUrl }) {
  return imageUrl ? VISION_MODEL : CHAT_MODEL;
}

function buildMessages({ prompt, imageUrl, system, context }) {
  const text = context ? `${prompt}\n\nKonteks data aplikasi:\n${context}` : prompt;
  const userContent = imageUrl
    ? [
      { type: "text", text },
      { type: "image_url", image_url: { url: imageUrl } }
    ]
    : text;

  return [
    {
      role: "system",
      content: system || "Kamu adalah advisor keuangan pribadi untuk pengguna Indonesia. Jawab ringkas, praktis, dan aman. Jangan mengklaim sebagai penasihat keuangan resmi."
    },
    {
      role: "user",
      content: userContent
    }
  ];
}

async function readJsonResponse(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (_error) {
    return { raw_text: text };
  }
}

export async function callBigModel({ prompt, imageUrl, system, context }) {
  const apiKey = getBigModelApiKey();
  if (!apiKey) {
    const error = new Error("BIGMODEL_API_KEY belum diset di environment server.");
    error.statusCode = 500;
    throw error;
  }

  if (!prompt || typeof prompt !== "string") {
    const error = new Error("Prompt wajib diisi.");
    error.statusCode = 400;
    throw error;
  }

  const model = getModel({ imageUrl });
  const response = await fetch(BIGMODEL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: buildMessages({ prompt, imageUrl, system, context }),
      temperature: imageUrl ? 0.2 : 0.8,
      stream: false
    })
  });

  const data = await readJsonResponse(response);
  if (!response.ok) {
    const errorMessage = data?.error?.message || data?.message || data?.raw_text || "BigModel request gagal.";
    const error = new Error(errorMessage);
    error.statusCode = response.status;
    throw error;
  }

  return {
    text: data?.choices?.[0]?.message?.content || "Tidak ada respons dari model.",
    model,
    raw: data
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const result = await callBigModel(req.body || {});
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "AI server error." });
  }
}
