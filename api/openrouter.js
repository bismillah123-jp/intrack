const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const BIGMODEL_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models";

const MODELS = {
  advisor: "qwen/qwen3-32b",
  chat: "llama-3.1-8b-instant",
  receipt: "gemini-2.5-flash-lite",
  glmText: "glm-4.7-flash",
  glmVision: "glm-4.6v-flash"
};

const DEFAULT_SYSTEM = "Kamu adalah advisor keuangan pribadi untuk pengguna Indonesia. Jawab ringkas, praktis, dan aman. Jangan mengklaim sebagai penasihat keuangan resmi.";

function getApiKey(provider) {
  if (provider === "groq") return process.env.GROQ_API_KEY || "";
  if (provider === "gemini") return process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || "";
  if (provider === "bigmodel") return process.env.BIGMODEL_API_KEY || process.env.ZHIPU_API_KEY || "";
  return "";
}

function normalizeTask({ task, imageUrl }) {
  if (imageUrl || task === "receipt") return "receipt";
  if (task === "advisor" || task === "report") return "advisor";
  return "chat";
}

function getCandidates(input) {
  const task = normalizeTask(input);
  if (task === "receipt") {
    return [
      { provider: "gemini", model: MODELS.receipt, vision: true },
      { provider: "bigmodel", model: MODELS.glmVision, vision: true }
    ];
  }

  return [
    {
      provider: "groq",
      model: task === "advisor" ? MODELS.advisor : MODELS.chat,
      vision: false
    },
    { provider: "bigmodel", model: MODELS.glmText, vision: false }
  ];
}

function validateInput({ prompt }) {
  if (!prompt || typeof prompt !== "string") {
    const error = new Error("Prompt wajib diisi.");
    error.statusCode = 400;
    throw error;
  }
}

function buildText({ prompt, context }) {
  return context ? `${prompt}\n\nKonteks data aplikasi:\n${context}` : prompt;
}

function buildOpenAiMessages({ prompt, imageUrl, system, context }) {
  const text = buildText({ prompt, context });
  const userContent = imageUrl
    ? [
      { type: "text", text },
      { type: "image_url", image_url: { url: imageUrl } }
    ]
    : text;

  return [
    { role: "system", content: system || DEFAULT_SYSTEM },
    { role: "user", content: userContent }
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

function providerError(provider, response, data) {
  const fallback = `${provider} request gagal.`;
  const message = data?.error?.message || data?.error?.status || data?.message || data?.raw_text || fallback;
  const error = new Error(message);
  error.provider = provider;
  error.statusCode = response?.status || 502;
  return error;
}

function missingKeyError(provider) {
  const names = {
    groq: "GROQ_API_KEY",
    gemini: "GEMINI_API_KEY",
    bigmodel: "BIGMODEL_API_KEY"
  };
  const error = new Error(`${names[provider]} belum diset di environment server.`);
  error.provider = provider;
  error.statusCode = 503;
  return error;
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

async function parseOpenAiStream(response, onDelta) {
  if (!response.body) throw new Error("Provider tidak mengirim body streaming.");

  const decoder = new TextDecoder();
  let buffer = "";
  let finished = false;

  const parseLine = (line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(":")) return;
    const payload = trimmed.startsWith("data:") ? trimmed.slice(5).trim() : trimmed;
    if (!payload) return;
    if (payload === "[DONE]") {
      finished = true;
      return;
    }
    const data = JSON.parse(payload);
    if (data?.choices?.[0]?.finish_reason) finished = true;
    const delta = getStreamDelta(data);
    if (delta) onDelta(delta, data);
  };

  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || "";
    for (const line of lines) {
      try {
        parseLine(line);
      } catch (_error) {
        // A malformed event is ignored without discarding already received text.
      }
    }
  }

  buffer += decoder.decode();
  if (buffer.trim()) {
    try {
      parseLine(buffer);
    } catch (_error) {
      // Preserve completed events even if the connection ends on an invalid event.
    }
  }

  return { finished };
}

async function callOpenAiProvider(candidate, input, stream = false) {
  const apiKey = getApiKey(candidate.provider);
  if (!apiKey) throw missingKeyError(candidate.provider);

  const url = candidate.provider === "groq" ? GROQ_URL : BIGMODEL_URL;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: candidate.model,
      messages: buildOpenAiMessages(input),
      temperature: candidate.vision ? 0.2 : 0.7,
      ...(candidate.provider === "groq" && candidate.model === MODELS.advisor
        ? { reasoning_format: "hidden" }
        : {}),
      stream
    })
  });

  if (!response.ok) {
    const data = await readJsonResponse(response);
    throw providerError(candidate.provider, response, data);
  }

  return response;
}

async function toGeminiImagePart(imageUrl) {
  const dataMatch = String(imageUrl || "").match(/^data:(image\/[\w.+-]+);base64,([\s\S]+)$/i);
  if (dataMatch) {
    return {
      inline_data: {
        mime_type: dataMatch[1],
        data: dataMatch[2]
      }
    };
  }

  const response = await fetch(imageUrl);
  if (!response.ok) throw providerError("gemini", response, { message: "Gambar struk tidak dapat diunduh." });
  const mimeType = response.headers.get("content-type") || "image/jpeg";
  if (!mimeType.startsWith("image/")) {
    const error = new Error("URL scan struk harus mengarah ke file gambar.");
    error.statusCode = 400;
    throw error;
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > 10 * 1024 * 1024) {
    const error = new Error("Ukuran gambar struk maksimal 10 MB.");
    error.statusCode = 413;
    throw error;
  }

  return {
    inline_data: {
      mime_type: mimeType,
      data: bytes.toString("base64")
    }
  };
}

async function callGemini(candidate, input) {
  const apiKey = getApiKey("gemini");
  if (!apiKey) throw missingKeyError("gemini");

  const parts = [{ text: buildText(input) }];
  if (input.imageUrl) parts.push(await toGeminiImagePart(input.imageUrl));

  const response = await fetch(`${GEMINI_URL}/${candidate.model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: input.system || DEFAULT_SYSTEM }]
      },
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "text/plain"
      }
    })
  });

  const data = await readJsonResponse(response);
  if (!response.ok) throw providerError("gemini", response, data);

  const text = (data?.candidates?.[0]?.content?.parts || [])
    .map((part) => part?.text || "")
    .filter(Boolean)
    .join("");

  if (!text) throw providerError("gemini", response, { message: "Gemini tidak mengembalikan hasil scan." });
  return { text, raw: data };
}

function summarizeFailures(failures) {
  if (!failures.length) return "Tidak ada provider AI yang tersedia.";
  return failures
    .map(({ candidate, error }) => `${candidate.provider}: ${error.message || "gagal"}`)
    .join(" | ");
}

export async function callAI(input) {
  validateInput(input);
  const failures = [];

  for (const candidate of getCandidates(input)) {
    try {
      if (candidate.provider === "gemini") {
        const result = await callGemini(candidate, input);
        return { ...result, model: candidate.model, provider: candidate.provider };
      }

      const response = await callOpenAiProvider(candidate, input, false);
      const data = await readJsonResponse(response);
      const text = extractContent(data?.choices?.[0]?.message?.content);
      if (!text) throw providerError(candidate.provider, response, { message: "Provider tidak mengembalikan respons." });
      return { text, model: candidate.model, provider: candidate.provider, raw: data };
    } catch (error) {
      failures.push({ candidate, error });
    }
  }

  const error = new Error(summarizeFailures(failures));
  error.statusCode = failures.every(({ error: failure }) => failure.statusCode === 400) ? 400 : 503;
  throw error;
}

function writeStreamEvent(res, payload) {
  res.write(`${JSON.stringify(payload)}\n`);
}

export async function streamAI(input, res) {
  validateInput(input);
  const candidates = getCandidates(input).filter((candidate) => !candidate.vision);
  const failures = [];
  let text = "";
  let activeCandidate = candidates[0];

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");

  try {
    for (const candidate of candidates) {
      activeCandidate = candidate;
      writeStreamEvent(res, {
        type: "meta",
        model: candidate.model,
        provider: candidate.provider,
        fallback: failures.length > 0
      });

      try {
        const response = await callOpenAiProvider(candidate, input, true);
        const streamResult = await parseOpenAiStream(response, (delta) => {
          text += delta;
          writeStreamEvent(res, {
            type: "delta",
            text: delta,
            model: candidate.model,
            provider: candidate.provider
          });
        });

        if (!text) throw providerError(candidate.provider, response, { message: "Provider tidak mengembalikan respons streaming." });
        if (!streamResult.finished) {
          const error = new Error("Koneksi provider terputus sebelum respons selesai.");
          error.provider = candidate.provider;
          error.statusCode = 502;
          throw error;
        }
        writeStreamEvent(res, {
          type: "done",
          text,
          model: candidate.model,
          provider: candidate.provider
        });
        return;
      } catch (error) {
        failures.push({ candidate, error });
        if (text) {
          writeStreamEvent(res, {
            type: "error",
            message: error.message || "Koneksi streaming AI terputus.",
            partial: text,
            model: candidate.model,
            provider: candidate.provider
          });
          return;
        }
      }
    }

    writeStreamEvent(res, {
      type: "error",
      message: summarizeFailures(failures),
      partial: text,
      model: activeCandidate?.model,
      provider: activeCandidate?.provider
    });
  } catch (error) {
    writeStreamEvent(res, {
      type: "error",
      message: error.message || "Koneksi streaming AI terputus.",
      partial: text,
      model: activeCandidate?.model,
      provider: activeCandidate?.provider
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
      return await streamAI(req.body || {}, res);
    }
    const result = await callAI(req.body || {});
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || "AI server error." });
  }
}
