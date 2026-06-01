const FREETHEAI_URL = "https://api.freetheai.xyz/v1/chat/completions";
const MODEL = "fee/kimi-k2.6";

export async function callFreeTheAI({ prompt, imageUrl, system, context, origin }) {
  if (!process.env.FREETHEAI_API_KEY) {
    const error = new Error("FREETHEAI_API_KEY belum diset di environment server.");
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

  const response = await fetch(FREETHEAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.FREETHEAI_API_KEY}`
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
          content: imageUrl ? userContent : userContent[0].text
        }
      ]
    })
  });

  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data?.error?.message || "FreeTheAI request gagal.");
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
    const result = await callFreeTheAI({
      ...(req.body || {}),
      origin: req.headers.origin
    });
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "AI server error." });
  }
}
