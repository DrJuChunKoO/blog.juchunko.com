import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Bot, Astroid } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkCjkFriendly from "remark-cjk-friendly";
import remarkCjkFriendlyGfmStrikethrough from "remark-cjk-friendly-gfm-strikethrough";

type SupportedLang = "en" | "zh";

interface KeySummaryProps {
  lang?: SupportedLang;
}

export default function KeySummary({ lang = "zh" }: KeySummaryProps) {
  const [summary, setSummary] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    const fetchSummary = async () => {
      try {
        const path = window.location.pathname;
        const response = await fetch(
          `/api/summary?filename=${encodeURIComponent(path)}&lang=${lang}`,
        );
        if (!response.ok) {
          throw new Error("Failed to fetch summary");
        }
        const data = await response.json();
        if (active) {
          setSummary(data.summary || "");
          setLoading(false);
        }
      } catch (err) {
        console.error("KeySummary error:", err);
        if (active) {
          setError(true);
          setLoading(false);
        }
      }
    };

    fetchSummary();
    return () => {
      active = false;
    };
  }, [lang]);

  const handleDiscussClick = () => {
    const prompt =
      lang === "zh"
        ? "我對這篇「重點摘要」很有興趣，想跟您進一步討論這篇文章的細節！"
        : "I am interested in the key summary. I'd like to discuss the details of this article with you!";

    window.dispatchEvent(
      new CustomEvent("open-chatbot", {
        detail: { prompt },
      }),
    );
  };

  if (error || (!loading && !summary)) {
    return null;
  }

  return (
    <div className="tts-ignore not-prose mb-8 rounded-2xl border border-black/10 bg-gray-50/30 text-gray-900 transition-all duration-300 dark:border-white/10 dark:bg-zinc-900/20 dark:text-gray-100">
      <div className="flex items-center justify-between gap-2 p-4">
        <span className="text-base leading-none font-semibold tracking-wider text-gray-800 uppercase dark:text-gray-200">
          {lang === "zh" ? "重點摘要" : "Key Summary"}
        </span>
        <Astroid className="size-4 text-gray-400 dark:text-gray-500" />
      </div>

      {loading ? (
        <div className="space-y-3 p-4 pt-0">
          <div className="h-3.5 w-11/12 animate-pulse rounded-full bg-black/5 dark:bg-white/5" />
          <div className="h-3.5 w-5/6 animate-pulse rounded-full bg-black/5 dark:bg-white/5" />
          <div className="h-3.5 w-10/12 animate-pulse rounded-full bg-black/5 dark:bg-white/5" />
        </div>
      ) : (
        <div>
          <div className="p-4 pt-0">
            <ReactMarkdown
              remarkPlugins={[
                remarkGfm,
                remarkCjkFriendly,
                remarkCjkFriendlyGfmStrikethrough,
              ]}
              components={{
                p: ({ children }) => (
                  <p className="mb-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                    {children}
                  </p>
                ),
                li: ({ children }) => (
                  <li className="flex items-start gap-2.5">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-gray-400 dark:bg-gray-500" />
                    <span className="min-w-0">{children}</span>
                  </li>
                ),
                ul: ({ children }) => (
                  <ul className="space-y-2.5 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                    {children}
                  </ul>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-gray-900 dark:text-gray-50">
                    {children}
                  </strong>
                ),
                code: ({ children }) => (
                  <code className="rounded bg-black/5 px-1.5 py-0.5 font-mono text-xs font-semibold text-gray-900 dark:bg-white/10 dark:text-gray-100">
                    {children}
                  </code>
                ),
              }}
            >
              {summary}
            </ReactMarkdown>
          </div>
          <div className="flex justify-end border-t border-black/5 p-4 dark:border-white/5">
            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.01 }}
              onClick={handleDiscussClick}
              className="flex cursor-pointer items-center gap-1.5 rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-gray-800 shadow-sm transition-all hover:border-black/20 hover:bg-gray-50 dark:border-white/15 dark:bg-zinc-950 dark:text-gray-200 dark:hover:border-white/25 dark:hover:bg-white/5"
            >
              <Bot className="size-4" />
              <span>
                {lang === "zh" ? "與 AI 繼續討論" : "Discuss with AI"}
              </span>
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
}
