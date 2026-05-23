import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { handleAgentRequest } from "./server/deepseekAgent.mjs";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "wbh-agent-api",
      configureServer(server) {
        server.middlewares.use("/api/agent", (req, res) => {
          handleAgentRequest(req, res);
        });
      },
    },
  ],
});
