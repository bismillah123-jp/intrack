import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { callAI, streamAI } from "./api/openrouter.js";
import { handleAiExecute } from "./api/v1/ai-execute.js";

async function readJsonBody(req) {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

function sendJson(res, status, payload) {
  res.setHeader("Content-Type", "application/json");
  res.statusCode = status;
  res.end(JSON.stringify(payload));
}

function aiDevApi() {
  return {
    name: "dompetrapi-ai-dev-api",
    configureServer(server) {
      server.middlewares.use("/api/openrouter", async (req, res, next) => {
        if (req.method !== "POST") return next();

        try {
          const body = await readJsonBody(req);
          if (body.stream) {
            await streamAI(body, res);
            return;
          }
          const result = await callAI(body);
          sendJson(res, 200, result);
        } catch (error) {
          sendJson(res, error.statusCode || 500, { error: error.message || "AI server error." });
        }
      });
      const executeRoute = async (req, res, next) => {
        if (req.method !== "POST") return next();

        try {
          const result = await handleAiExecute(await readJsonBody(req), req.headers || {});
          sendJson(res, 200, result);
        } catch (error) {
          sendJson(res, error.statusCode || 500, {
            handled: false,
            error: error.message || "AI execute error.",
            reply: "Waduh, sistem lagi proses nih, coba sebentar lagi ya."
          });
        }
      };
      server.middlewares.use("/api/v1/ai-execute", executeRoute);
      server.middlewares.use("/v1/ai-execute", executeRoute);
    }
  };
}

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));

  return {
    plugins: [react(), aiDevApi()],
    server: {
      host: "127.0.0.1",
      port: 8787,
      strictPort: true
    },
    preview: {
      host: "127.0.0.1",
      port: 8787,
      strictPort: true
    }
  };
});
