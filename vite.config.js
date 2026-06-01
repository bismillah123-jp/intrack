import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { callFreeTheAI } from "./api/openrouter.js";

function openRouterDevApi() {
  return {
    name: "dompetrapi-openrouter-dev-api",
    configureServer(server) {
      server.middlewares.use("/api/openrouter", async (req, res, next) => {
        if (req.method !== "POST") return next();

        try {
          let raw = "";
          for await (const chunk of req) raw += chunk;
          const body = raw ? JSON.parse(raw) : {};
          const result = await callFreeTheAI({
            ...body,
            origin: req.headers.origin
          });
          res.setHeader("Content-Type", "application/json");
          res.statusCode = 200;
          res.end(JSON.stringify(result));
        } catch (error) {
          res.setHeader("Content-Type", "application/json");
          res.statusCode = error.statusCode || 500;
          res.end(JSON.stringify({ error: error.message || "AI server error." }));
        }
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));

  return {
    plugins: [react(), openRouterDevApi()],
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
