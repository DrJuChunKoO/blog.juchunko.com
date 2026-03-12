import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Play, Pause, Volume2, Download } from "lucide-react";

interface AudioEvidenceProps {
  src: string;
  title: string;
  description: string;
  transcript?: string;
  source?: string;
  sourceUrl?: string;
  duration?: string;
  lang?: "zh" | "en";
}

const i18n = {
  zh: {
    badge: "音訊證據 / Audio Evidence",
    download: "下載",
    transcript: "查看逐字稿 / View Transcript",
    sourceLabel: "來源 /",
  },
  en: {
    badge: "Audio Evidence",
    download: "Download",
    transcript: "View Transcript",
    sourceLabel: "Source:",
  },
};

export default function AudioEvidence({
  src,
  title,
  description,
  transcript,
  source,
  sourceUrl,
  duration: durationProp,
  lang = "zh",
}: AudioEvidenceProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const t = i18n[lang];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoaded = () => {
      setDuration(audio.duration);
      setIsLoaded(true);
    };
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const seek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const audio = audioRef.current;
      const bar = progressRef.current;
      if (!audio || !bar) return;
      const rect = bar.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      audio.currentTime = pct * duration;
    },
    [duration],
  );

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="not-prose my-8 overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100 dark:border-white/10 dark:from-gray-900 dark:to-gray-950">
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Header */}
      <div className="border-b border-gray-200 px-5 py-4 dark:border-white/10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <Volume2 className="size-4 text-red-500" />
              <span className="text-xs font-semibold tracking-wider text-red-500 uppercase">
                {t.badge}
              </span>
            </div>
            <h4 className="text-base font-bold text-gray-900 dark:text-white">
              {title}
            </h4>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {description}
            </p>
          </div>
          <a
            href={src}
            download
            className="flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 transition-colors hover:bg-gray-100 dark:border-white/10 dark:text-gray-400 dark:hover:bg-white/5"
          >
            <Download className="size-3" />
            {t.download}
          </a>
        </div>
      </div>

      {/* Player */}
      <div className="px-5 py-4">
        <div className="flex items-center gap-4">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={togglePlay}
            className="flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition-colors hover:bg-red-700"
          >
            {isPlaying ? (
              <Pause className="size-5 fill-current" />
            ) : (
              <Play className="size-5 fill-current" />
            )}
          </motion.button>

          <div className="flex flex-1 flex-col gap-2">
            {/* Progress bar */}
            <div
              ref={progressRef}
              onClick={seek}
              className="group relative h-2 w-full cursor-pointer overflow-hidden rounded-full bg-gray-200 dark:bg-white/10"
            >
              <motion.div
                className="h-full rounded-full bg-red-500"
                style={{ width: `${pct}%` }}
                transition={{ duration: 0.1 }}
              />
              <div className="absolute inset-0 rounded-full opacity-0 transition-opacity group-hover:opacity-100">
                <div className="h-full rounded-full bg-red-500/20" />
              </div>
            </div>

            {/* Time */}
            <div className="flex justify-between text-xs tabular-nums text-gray-400">
              <span>{fmt(currentTime)}</span>
              <span>{isLoaded ? fmt(duration) : durationProp || "—"}</span>
            </div>
          </div>
        </div>

        {/* Waveform decoration */}
        <div className="mt-3 flex h-8 items-end justify-center gap-[2px]">
          {Array.from({ length: 60 }).map((_, i) => {
            const h =
              Math.sin(i * 0.3) * 0.3 +
              Math.sin(i * 0.7) * 0.2 +
              Math.cos(i * 0.15) * 0.2 +
              0.35;
            const isActive = (i / 60) * 100 < pct;
            return (
              <div
                key={i}
                className={`w-1 rounded-full transition-colors duration-150 ${
                  isActive
                    ? "bg-red-500"
                    : "bg-gray-300 dark:bg-white/15"
                }`}
                style={{ height: `${h * 100}%` }}
              />
            );
          })}
        </div>
      </div>

      {/* Transcript toggle */}
      {transcript && (
        <div className="border-t border-gray-200 dark:border-white/10">
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="w-full cursor-pointer px-5 py-3 text-left text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/5"
          >
            {showTranscript ? "▼" : "▶"} {t.transcript}
          </button>
          <AnimatePresence>
            {showTranscript && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-4">
                  <pre className="whitespace-pre-wrap rounded-lg bg-black/5 p-4 font-mono text-xs leading-relaxed text-gray-700 dark:bg-white/5 dark:text-gray-300">
                    {transcript}
                  </pre>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Source attribution */}
      {source && (
        <div className="border-t border-gray-200 px-5 py-2 dark:border-white/10">
          <p className="text-[10px] text-gray-400">
            {t.sourceLabel}{" "}
            {sourceUrl ? (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-gray-600 dark:hover:text-gray-300"
              >
                {source}
              </a>
            ) : (
              source
            )}
          </p>
        </div>
      )}
    </div>
  );
}
