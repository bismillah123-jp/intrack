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

function writeStreamEvent(res, payload) {
  res.write(`${JSON.stringify(payload)}\n`);
}

function extractContent(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value
      .map((item) => item?.text || item?.content || "")
      .filter(Boolean)
      .join("");
  }
  return String(value);
}

function getStreamDelta(data) {
  const choice = data?.choices?.[0];
  return extractContent(choice?.delta?.content || choice?.message?.content || choice?.content);
}

async function parseBigModelStream(response, onDelta) {
  const decoder = new TextDecoder();
  let buffer = "";
  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(":")) continue;
      const payload = trimmed.startsWith("data:") ? trimmed.slice(5).trim() : trimmed;
      if (!payload || payload === "[DONE]") continue;
      try {
        const data = JSON.parse(payload);
        const delta = getStreamDelta(data);
        if (delta) onDelta(delta, data);
      } catch (_error) {
        // Ignore malformed partial SSE lines. The next chunk usually completes them.
      }
    }
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

export async function streamBigModel({ prompt, imageUrl, system, context }, res) {
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
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");
  writeStreamEvent(res, { type: "meta", model });

  let text = "";
  try {
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
        stream: true
      })
    });

    if (!response.ok) {
      const data = await readJsonResponse(response);
      const message = data?.error?.message || data?.message || data?.raw_text || "BigModel stream gagal.";
      writeStreamEvent(res, { type: "error", message, partial: text, model });
      return;
    }

    await parseBigModelStream(response, (delta) => {
      text += delta;
      writeStreamEvent(res, { type: "delta", text: delta });
    });
    writeStreamEvent(res, { type: "done", text, model });
  } catch (error) {
    writeStreamEvent(res, {
      type: "error",
      message: error.message || "Koneksi streaming AI terputus.",
      partial: text,
      model
    });
  } finally {
    res.end();
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    if (req.body?.stream) {
      return await streamBigModel(req.body || {}, res);
    }
    const result = await callBigModel(req.body || {});
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "AI server error." });
  }
}
