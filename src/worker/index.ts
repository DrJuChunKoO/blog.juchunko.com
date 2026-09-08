// @ts-nocheck
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import {
  createUIMessageStreamResponse,
  streamText,
  tool,
  smoothStream,
  convertToModelMessages,
  generateText,
  isStepCount,
  toUIMessageStream,
} from "ai";
import z from "zod";
import type { ExportedHandler, Fetcher } from "@cloudflare/workers-types";

interface Env {
  // 靜態資源綁定（wrangler.assets.binding）
  ASSETS: Fetcher;

  // OpenRouter 相關變數，請於 wrangler secret / vars 設定
  OPENROUTER_API_KEY: string;
}

function parseByteRange(rangeHeader: string, size: number) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
  if (!match || (!match[1] && !match[2])) return null;

  if (!match[1]) {
    const suffixLength = Number(match[2]);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) return null;
    return { start: Math.max(size - suffixLength, 0), end: size - 1 };
  }

  const start = Number(match[1]);
  const requestedEnd = match[2] ? Number(match[2]) : size - 1;
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(requestedEnd) ||
    start >= size ||
    requestedEnd < start
  ) {
    return null;
  }

  return { start, end: Math.min(requestedEnd, size - 1) };
}

async function serveVideo(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const rangeHeader = request.headers.get("Range");
  let size: number | undefined;
  if (rangeHeader) {
    const manifestResponse = await env.ASSETS.fetch(
      new URL("/video-assets.json", url),
    );
    const manifest = manifestResponse.ok
      ? ((await manifestResponse.json()) as Record<string, number>)
      : {};
    size = manifest[url.pathname];
  }

  const assetHeaders = new Headers(request.headers);
  assetHeaders.delete("Range");
  const assetResponse = await env.ASSETS.fetch(
    new Request(request, { headers: assetHeaders }),
  );

  const headers = new Headers(assetResponse.headers);
  headers.set("Accept-Ranges", "bytes");

  if (
    request.method !== "GET" ||
    !rangeHeader ||
    !assetResponse.ok ||
    !assetResponse.body ||
    !Number.isSafeInteger(size)
  ) {
    return new Response(assetResponse.body, {
      status: assetResponse.status,
      statusText: assetResponse.statusText,
      headers,
    });
  }

  const range = parseByteRange(rangeHeader, size);
  if (!range) {
    headers.set("Content-Range", `bytes */${size}`);
    headers.set("Content-Length", "0");
    await assetResponse.body.cancel();
    return new Response(null, { status: 416, headers });
  }

  const reader = assetResponse.body.getReader();
  let offset = 0;
  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          return;
        }

        const chunkStart = offset;
        const chunkEnd = offset + value.byteLength - 1;
        offset += value.byteLength;

        if (chunkEnd < range.start) continue;

        const start = Math.max(range.start - chunkStart, 0);
        const end = Math.min(range.end - chunkStart + 1, value.byteLength);
        controller.enqueue(value.subarray(start, end));

        if (chunkEnd >= range.end) {
          await reader.cancel();
          controller.close();
        }
        return;
      }
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });

  headers.set("Content-Range", `bytes ${range.start}-${range.end}/${size}`);
  headers.set("Content-Length", String(range.end - range.start + 1));
  return new Response(body, { status: 206, headers });
}

export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    const url = new URL(request.url);

    // API 端點 -------------------------------------------------------------
    if (request.method === "GET" && url.pathname === "/api/summary") {
      const filename = url.searchParams.get("filename") || "/";
      const lang = url.searchParams.get("lang") || "zh";

      const cacheUrl = new URL(request.url);
      const cacheKey = new Request(cacheUrl.toString(), request);
      const cache = caches.default;
      let cachedResponse = await cache.match(cacheKey);
      if (cachedResponse) {
        return cachedResponse;
      }

      try {
        const cleanPath = filename.replace(/^\//, "").replace(/\/$/, "");
        const fileUrl = `https://github.com/DrJuChunKoO/blog.juchunko.com/raw/refs/heads/main/src/content/blog/${cleanPath}.mdx`;
        const fileResponse = await fetch(fileUrl);
        if (!fileResponse.ok) {
          return new Response("Post content not found on GitHub", { status: 404 });
        }
        const fileContent = await fileResponse.text();

        const openrouter = createOpenAICompatible({
          name: "openrouter",
          apiKey: env.OPENROUTER_API_KEY,
          baseURL:
            "https://gateway.ai.cloudflare.com/v1/3f1f83a939b2fc99ca45fd8987962514/blog/openrouter/v1",
        });

        const systemPrompt = lang === "zh"
          ? `你是立委葛如鈞（寶博士）部落格的 AI 助手。請幫我詳細閱讀這篇文章，並為我總結出 3-4 個關鍵的核心重點摘要。
請直接以繁體中文（台灣習慣用語）列出重點，使用 Markdown 無序列表格式（如：- 重點一\n- 重點二...）。
請保持語氣專業、清晰、好懂，每點控制在 40 字以內，不要有任何前言、結尾或導言，直接輸出摘要列表。`
          : `You are the AI Assistant for Legislator Ju-Chun KO (Dr. dAAAb)'s blog. Please read this article carefully and summarize 3-4 key points for me.
Please list the points directly in English using Markdown bullet list format (e.g., - Point 1\n- Point 2...).
Keep the tone professional, clear, and easy to understand. Keep each point under 15 words. Do not include any introduction, foreword, or conclusion; output the list directly.`;

        const { text } = await generateText({
          model: openrouter.chatModel("@preset/website-chatbot"),
          instructions: systemPrompt,
          prompt: fileContent,
        });

        const response = new Response(JSON.stringify({ summary: text }), {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=86400", // cache for 1 day
            "Access-Control-Allow-Origin": "*",
          },
        });

        ctx.waitUntil(cache.put(cacheKey, response.clone()));
        return response;
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    if (request.method === "POST" && url.pathname === "/api/chat") {
      // --------------------------------------------------------------
      // 初始化 OpenRouter provider
      // --------------------------------------------------------------

      const openrouter = createOpenAICompatible({
        name: "openrouter",
        apiKey: env.OPENROUTER_API_KEY,
        baseURL:
          "https://gateway.ai.cloudflare.com/v1/3f1f83a939b2fc99ca45fd8987962514/blog/openrouter/v1",
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
- 請勿輸出 LaTeX 語法（如 $...$、$$...$$、\frac{}{} 等），網站不支援渲染，請改用純文字或 Markdown 表示數學內容

<viewPage>
current page: https://blog.juchunko.com${filename}
</viewPage>`;

      // --------------------------------------------------------------
      // 執行 LLM，並注入各種 tool
      // --------------------------------------------------------------
      const result = streamText({
        model: openrouter.chatModel("@preset/website-chatbot"),
        instructions: systemPrompt,
        messages: await convertToModelMessages(messages),
        stopWhen: isStepCount(8),
        experimental_transform: smoothStream({
          delayInMs: 10,
          chunking: /[\u4E00-\u9FFF]|\S+\s+/, // 中英分段顯示
        }),
        tools: {
          // ----------------- 讀取目前頁面 -----------------
          viewPage: tool({
            description: "Get the current page content",
            inputSchema: z.object({}).strict(),
            execute: async () => {
              const fileData = await fetch(
                // remove last slash
                `https://github.com/DrJuChunKoO/blog.juchunko.com/raw/refs/heads/main/src/content/blog/${filename.replace(/\/$/, "")}.mdx`,
              ).then((res) => res.text());

              return `base: https://blog.juchunko.com/\n目前頁面內容：\n${fileData}`;
            },
          }),
        },
      });

      return createUIMessageStreamResponse({
        stream: toUIMessageStream({ stream: result.stream }),
      });
    }

    if (url.pathname.endsWith(".mp4")) {
      return serveVideo(request, env);
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
