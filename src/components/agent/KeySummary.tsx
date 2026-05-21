import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Sparkles, MessageSquare } from "lucide-react";

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
          `/api/summary?filename=${encodeURIComponent(path)}&lang=${lang}`
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
    const prompt = lang === "zh"
      ? "我對這篇「重點摘要」很有興趣，想跟您進一步討論這篇文章的細節！"
      : "I am interested in the key summary. I'd like to discuss the details of this article with you!";
    
    window.dispatchEvent(
      new CustomEvent("open-chatbot", {
        detail: { prompt },
      })
    );
  };

  if (error || (!loading && !summary)) {
    return null;
  }

  // Parse markdown list points
  const points = summary
    ? summary
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.startsWith("-") || line.startsWith("*"))
        .map((line) => line.substring(1).trim())
    : [];

  return (
    <div className="tts-player-container mb-8 rounded-2xl border border-black/10 bg-gray-50/30 p-5 text-gray-900 transition-all duration-300 dark:border-white/10 dark:bg-zinc-900/20 dark:text-gray-100">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="size-4 text-amber-500 animate-pulse fill-amber-500/20" />
        <span className="text-sm font-bold tracking-wider text-gray-800 uppercase dark:text-gray-200">
          {lang === "zh" ? "AI 重點摘要" : "AI Key Summary"}
        </span>
      </div>

      {loading ? (
        <div className="space-y-3 py-1">
          <div className="h-3.5 bg-black/5 dark:bg-white/5 rounded-full w-11/12 animate-pulse" />
          <div className="h-3.5 bg-black/5 dark:bg-white/5 rounded-full w-5/6 animate-pulse" />
          <div className="h-3.5 bg-black/5 dark:bg-white/5 rounded-full w-10/12 animate-pulse" />
        </div>
      ) : (
        <div className="space-y-4">
          <ul className="space-y-2.5 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {points.length > 0 ? (
              points.map((point, index) => (
                <li key={index} className="flex items-start gap-2.5">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-gray-400 dark:bg-gray-500" />
                  <span>{point}</span>
                </li>
              ))
            ) : (
              <li className="flex items-start gap-2.5">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-gray-400 dark:bg-gray-500" />
                <span>{summary}</span>
              </li>
            )}
          </ul>

          <div className="flex justify-end pt-2 border-t border-black/5 dark:border-white/5">
            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.01 }}
              onClick={handleDiscussClick}
              className="flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-gray-800 shadow-sm transition-all hover:border-black/20 hover:bg-gray-50 dark:border-white/15 dark:bg-zinc-950 dark:text-gray-200 dark:hover:border-white/25 dark:hover:bg-white/5 cursor-pointer"
            >
              <MessageSquare className="size-3.5" />
              <span>{lang === "zh" ? "與 AI 繼續討論" : "Discuss with AI"}</span>
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
}