// @ts-nocheck
import { createOpenAI, type OpenAI } from "@ai-sdk/openai";
import { streamText, tool, smoothStream, embed } from "ai";
import z from "zod";
import type { ExportedHandler, Fetcher } from "@cloudflare/workers-types";

interface Env {
  // 靜態資源綁定（wrangler.assets.binding）
  ASSETS: Fetcher;

  // Supabase 與 OpenAI 相關變數，請於 wrangler secret / vars 設定
  OPENAI_API_KEY: string;
}

// ---------------------------------------------------------------------------
// CORS headers – 允許瀏覽器直接消費 SSE stream
// ---------------------------------------------------------------------------
const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS pre-flight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // API 端點 -------------------------------------------------------------
    if (
      request.method === "POST" &&
      new URL(request.url).pathname === "/api/chat"
    ) {
      // --------------------------------------------------------------
      // 初始化 OpenAI provider – 放在 handler 內才能拿到正確 env
      // --------------------------------------------------------------

      const openai: OpenAI = createOpenAI({
        apiKey: env.OPENAI_API_KEY,
        // 若需經由 Cloudflare AI Gateway，可於此自訂 baseURL
        // baseURL: "https://gateway.ai.cloudflare.com/v1/<account>/<gateway>/openai",
      });

      // --------------------------------------------------------------
      // 解析請求 body
      // --------------------------------------------------------------
      let body: any;
      try {
        body = await request.json();
      } catch {
        return new Response("Invalid JSON body", {
          status: 400,
          headers: corsHeaders,
        });
      }

      const { messages = [], filename = "/" } = body;

      // 系統提示詞
      const systemPrompt = `你是國民黨立委葛如鈞（寶博士）部落格的 AI 助手
- 盡可能簡短、友善回答
- 盡可能使用工具來提供使用者盡可能準確與完整的資訊
- 請以使用者的語言回答問題
- 葛如鈞=寶博士=Ju-Chun KO

<viewPage>
current page: https://juchunko.com${filename}
</viewPage>`;

      // --------------------------------------------------------------
      // 執行 LLM，並注入各種 tool
      // --------------------------------------------------------------
      const result = streamText({
        model: openai.responses("gpt-4.1-mini"),
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        maxSteps: 8,
        experimental_transform: smoothStream({
          delayInMs: 10,
          chunking: /[\u4E00-\u9FFF]|\S+\s+/, // 中英分段顯示
        }),
        tools: {
          // ----------------- 讀取目前頁面 -----------------
          viewPage: tool({
            description: "Get the current page content",
            parameters: z.object({}).strict(),
            execute: async () => {
              const date = new Date().toLocaleDateString();
              const fileData = await fetch(
                // remove last slash
                `https://github.com/DrJuChunKoO/blog.juchunko.com/raw/refs/heads/main/src/content/blog/${filename.replace(/\/$/, "")}.mdx`,
              ).then((res) => res.text());

              return `base: https://blog.juchunko.com/\n目前頁面內容：\n${fileData}`;
            },
          }),
        },
      });

      const response = result.toDataStreamResponse();
      // 附加 CORS 標頭 (以及 Vercel AI stream header)
      response.headers.set("x-vercel-ai-data-stream", "v1");
      response.headers.set("Content-Type", "text/x-unknown");
      response.headers.set("content-encoding", "identity");
      response.headers.set("transfer-encoding", "chunked");
      for (const [k, v] of Object.entries(corsHeaders))
        response.headers.set(k, v);
      return response;
    }

    // 非 /api/chat – 直接回傳靜態檔 (免費 CDN)
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
