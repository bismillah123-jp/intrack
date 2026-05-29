const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "moonshotai/kimi-k2.6:free";

export async function callOpenRouter({ prompt, imageUrl, system, context, origin }) {
  if (!process.env.OPENROUTER_API_KEY) {
    const error = new Error("OPENROUTER_API_KEY belum diset di environment server.");
    error.statusCode = 500;
    throw error;
  }

  if (!prompt || typeof prompt !== "string") {
    const error = new Error("Prompt wajib diisi.");
    error.statusCode = 400;
    throw error;
  }

  const userContent = [
    {
      type: "text",
      text: context ? `${prompt}\n\nKonteks data aplikasi:\n${context}` : prompt
    }
  ];

  if (imageUrl) {
    userContent.push({
      type: "image_url",
      image_url: { url: imageUrl }
    });
  }

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "HTTP-Referer": origin || "http://localhost:8787",
      "X-Title": "DompetRapi"
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: system || "Kamu adalah advisor keuangan pribadi untuk pengguna Indonesia. Jawab ringkas, praktis, dan aman. Jangan mengklaim sebagai penasihat keuangan resmi."
        },
        {
          role: "user",
          content: userContent
        }
      ]
    })
  });

  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data?.error?.message || "OpenRouter request gagal.");
    error.statusCode = response.status;
    throw error;
  }

  return {
    text: data?.choices?.[0]?.message?.content || "Tidak ada respons dari model.",
    raw: data
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const result = await callOpenRouter({
      ...(req.body || {}),
      origin: req.headers.origin
    });
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "AI server error." });
  }
}
