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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
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
        baseURL:
          "https://gateway.ai.cloudflare.com/v1/3f1f83a939b2fc99ca45fd8987962514/blog/openai",
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
        });
      }

      const { messages = [], filename = "/", lang = "zh" } = body;

      // 系統提示詞
      const systemPrompt = `你是國民黨立委葛如鈞（寶博士）部落格的 AI 助手
- 盡可能簡短、友善回答
- 盡可能使用工具來提供使用者盡可能準確與完整的資訊
- 請以使用者的語言回答問題，如果使用者沒有指定語言，請以${
        lang === "zh" ? "台灣中文" : "English"
      }回答
- 葛如鈞=寶博士=Ju-Chun KO

<viewPage>
current page: https://blog.juchunko.com${filename}
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
      return response;
    }

    // ------------------------------
    // 舊版 /blog/ URL 永久轉址（301）
    // 1. /blog/:slug          -> /zh/:slug/
    // 2. /blog/:slug-en       -> /en/:slug/
    // ------------------------------

    if (new URL(request.url).pathname.startsWith("/blog/")) {
      // 取得 slug，移除開頭 /blog/ 以及結尾 /
      let slug = new URL(request.url).pathname
        .slice("/blog/".length)
        .replace(/\/$/, "");

      // 判斷是否為英文 (-en 結尾)
      let targetLang = "zh";
      if (slug.endsWith("-en")) {
        slug = slug.slice(0, -3); // 去除 -en
        targetLang = "en";
      }

      const location = `https://blog.juchunko.com/${targetLang}/${slug}/`;
      return Response.redirect(location, 301);
    }

    // 非 /api/chat – 直接回傳靜態檔 (免費 CDN)
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
