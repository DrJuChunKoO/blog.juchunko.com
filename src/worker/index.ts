// @ts-nocheck
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamText, tool, smoothStream, convertToModelMessages } from "ai";
import z from "zod";
import type { ExportedHandler, Fetcher } from "@cloudflare/workers-types";

interface Env {
  // 靜態資源綁定（wrangler.assets.binding）
  ASSETS: Fetcher;

  // OpenRouter 相關變數，請於 wrangler secret / vars 設定
  OPENROUTER_API_KEY: string;

  // x402 paywall (optional)
  // If not set, x402 endpoints will return 500 with instructions.
  X402_PAY_TO?: string; // receiving address
  X402_FACILITATOR_URL?: string; // default: https://x402.org/facilitator (testnet)
}

const X402_NETWORK = "eip155:84532"; // Base Sepolia (testnet)
const X402_USDC_ASSET = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // USDC on Base Sepolia
const X402_AMOUNT = "1000"; // 0.001 USDC (6 decimals)

function isAiUserAgent(ua: string) {
  return /GPTBot|Google-Extended|anthropic|Claude|o1/i.test(ua);
}

function paymentRequiredPayload(resourceUrl: string, payTo: string) {
  return {
    x402Version: 2,
    error: "Payment required",
    resource: {
      url: resourceUrl,
      description: "AI access to blog article content (mdx)",
      mimeType: "text/plain",
    },
    accepts: [
      {
        scheme: "exact",
        network: X402_NETWORK,
        amount: X402_AMOUNT,
        asset: X402_USDC_ASSET,
        payTo,
        maxTimeoutSeconds: 300,
      },
    ],
  };
}

async function x402VerifyAndSettle({
  facilitatorUrl,
  paymentPayload,
  paymentRequirements,
}: {
  facilitatorUrl: string;
  paymentPayload: any;
  paymentRequirements: any;
}) {
  const verifyRes = await fetch(`${facilitatorUrl}/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      x402Version: 2,
      paymentPayload,
      paymentRequirements,
    }),
  });
  const verifyJson: any = await verifyRes.json();
  if (!verifyRes.ok || !verifyJson?.isValid) {
    return { ok: false, stage: "verify", detail: verifyJson };
  }

  const settleRes = await fetch(`${facilitatorUrl}/settle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      x402Version: 2,
      paymentPayload,
      paymentRequirements,
    }),
  });
  const settleJson: any = await settleRes.json();
  if (!settleRes.ok || !settleJson?.success) {
    return { ok: false, stage: "settle", detail: settleJson };
  }

  return { ok: true, verify: verifyJson, settle: settleJson };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // x402 protected API: fetch the raw MDX for a blog post
    // Keeping paywall on an API endpoint avoids breaking the public website.
    // Example:
    //   GET /api/article?path=zh/reachy-mini
    // AI clients should pay via x402 (Payment-Required + Payment-Signature flow).
    if (request.method === "GET" && url.pathname === "/api/article") {
      const ua = request.headers.get("user-agent") || "";
      const isAI = isAiUserAgent(ua);

      const payTo = env.X402_PAY_TO;
      if (!payTo) {
        return new Response(
          "x402 not configured: missing env.X402_PAY_TO (receiving address)",
          { status: 500 },
        );
      }

      const facilitatorUrl = env.X402_FACILITATOR_URL || "https://x402.org/facilitator";

      const path = url.searchParams.get("path") || "";
      if (!path) {
        return new Response("Missing ?path=...", { status: 400 });
      }

      // Map to repo raw file
      const normalized = path.replace(/^\//, "").replace(/\/$/, "");
      const rawUrl = `https://github.com/DrJuChunKoO/blog.juchunko.com/raw/refs/heads/main/src/content/blog/${normalized}.mdx`;

      // Only require payment for AI UA. Humans (browser) can still use it for debugging.
      if (isAI) {
        const sigHeader =
          request.headers.get("Payment-Signature") ||
          request.headers.get("PAYMENT-SIGNATURE");

        const required = paymentRequiredPayload(url.toString(), payTo);
        const requirements = required.accepts[0];

        if (!sigHeader) {
          return new Response("402 Payment Required (x402)", {
            status: 402,
            headers: {
              "Payment-Required": JSON.stringify(required),
              "Content-Type": "text/plain; charset=utf-8",
            },
          });
        }

        let paymentPayload: any;
        try {
          paymentPayload = JSON.parse(sigHeader);
        } catch {
          return new Response("Invalid Payment-Signature (not JSON)", {
            status: 402,
            headers: { "Payment-Required": JSON.stringify(required) },
          });
        }

        const result = await x402VerifyAndSettle({
          facilitatorUrl,
          paymentPayload,
          paymentRequirements: requirements,
        });

        if (!result.ok) {
          return new Response(`Payment ${result.stage} failed`, {
            status: 402,
            headers: { "Payment-Required": JSON.stringify(required) },
          });
        }

        // Paid: return the MDX and include settlement details
        const upstream = await fetch(rawUrl);
        const text = await upstream.text();

        return new Response(text, {
          status: 200,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Payment-Response": JSON.stringify(result.settle),
          },
        });
      }

      // Non-AI: free access (debug)
      const upstream = await fetch(rawUrl);
      return new Response(await upstream.text(), {
        status: upstream.status,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    // API 端點 -------------------------------------------------------------
    if (
      request.method === "POST" &&
      url.pathname === "/api/chat"
    ) {
      // --------------------------------------------------------------
      // 初始化 OpenRouter provider
      // --------------------------------------------------------------

      const openrouter = createOpenRouter({
        apiKey: env.OPENROUTER_API_KEY,
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
        model: openrouter.chat("@preset/website-chatbot"),
        system: systemPrompt,
        messages: await convertToModelMessages(messages),
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

      return result.toUIMessageStreamResponse();
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
