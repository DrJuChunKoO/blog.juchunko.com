import { useEffect, useState, useRef, useCallback } from "react";
import { QueryClient, useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import {
  BookAudio,
  Play,
  Pause,
  Rewind,
  FastForward,
  Loader2,
  StepForward,
  StepBack,
  Maximize2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ui } from "@/i18n/ui";

const ttsQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 30, // 30 minutes
      gcTime: 1000 * 60 * 60, // 60 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

type SupportedLang = "en" | "zh";

type AudioSegment = {
  text: string;
  hash: string;
  audio: string;
};

interface TTSPlayerProps {
  isOpen: boolean;
  lang?: SupportedLang;
}

type Mode = "loading" | "api" | "fallback" | "error";

/**
 * Normalize text for matching by removing extra whitespace
 */
const normalizeText = (text: string): string => {
  return text.replace(/\s+/g, " ").trim();
};

async function fetchTTSAudioSegments(
  domain: string,
  path: string,
): Promise<AudioSegment[]> {
  try {
    const response = await fetch(
      `https://tts-api.juchunko.com/v1/audio/${domain}/${path}`,
    );

    if (response.status === 404) {
      throw new Error("NOT_FOUND");
    }

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("NOT_FOUND");
    }

    return data;
  } catch (error) {
    console.error("fetchTTSAudioSegments error:", error);
    throw error;
  }
}

export default function TTSPlayer({ isOpen, lang = "zh" }: TTSPlayerProps) {
  const [mode, setMode] = useState<Mode>("loading");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [segmentDurations, setSegmentDurations] = useState<number[]>([]);
  const [highlightEnabled, setHighlightEnabled] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMainVisible, setIsMainVisible] = useState(true);

  const mainPlayerRef = useRef<HTMLDivElement>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const progressUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioElementsRef = useRef<HTMLAudioElement[]>([]);
  const originalStylesRef = useRef<
    Map<HTMLElement, { color: string; transition: string }>
  >(new Map());

  const currentUrl = typeof window !== "undefined" ? window.location.href : "";

  const {
    data: segments = [],
    isLoading,
    isError,
  } = useQuery(
    {
      queryKey: ["ttsSegments", currentUrl],
      queryFn: async () => {
        const url = new URL(currentUrl);
        const domain =
          url.hostname === "localhost" ? "blog.juchunko.com" : url.hostname;
        const path = url.pathname.slice(1).replace(/\/$/, "");
        return fetchTTSAudioSegments(domain, path);
      },
      enabled: isOpen && !!currentUrl,
    },
    ttsQueryClient,
  );

  // Visibility Observer
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsMainVisible(entry.isIntersecting);
      },
      { threshold: 0 },
    );

    if (mainPlayerRef.current) {
      observer.observe(mainPlayerRef.current);
    }

    return () => observer.disconnect();
  }, [mode, segments.length]);

  const scrollToPlayer = () => {
    mainPlayerRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  const resetAllStyles = useCallback(() => {
    originalStylesRef.current.forEach((style, el) => {
      if (el.isConnected) {
        el.style.color = style.color;
        el.style.transition = style.transition;
      }
    });
    originalStylesRef.current.clear();
    const main =
      document.querySelector("main") || document.querySelector("article");
    if (main) {
      main.querySelectorAll("*").forEach((el) => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.color = "";
        htmlEl.style.transition = "";
      });
    }
  }, []);

  const loadAudioElements = useCallback(async (segData: AudioSegment[]) => {
    try {
      const audios = segData.map((seg) => {
        const audio = new Audio(seg.audio);
        audio.preload = "metadata";
        return audio;
      });
      audioElementsRef.current = audios;

      setSegmentDurations(new Array(audios.length).fill(0));
      setMode("api");

      audios.forEach((audio, index) => {
        const updateDuration = () => {
          setSegmentDurations((prev) => {
            const next = [...prev];
            next[index] = audio.duration || 0;
            return next;
          });
          audio.removeEventListener("loadedmetadata", updateDuration);
          audio.removeEventListener("error", onMetaError);
        };
        const onMetaError = () => {
          audio.removeEventListener("loadedmetadata", updateDuration);
          audio.removeEventListener("error", onMetaError);
        };

        if (audio.readyState >= 1) {
          updateDuration();
        } else {
          audio.addEventListener("loadedmetadata", updateDuration);
          audio.addEventListener("error", onMetaError);
        }
      });
    } catch (error) {
      console.error("loadAudioElements error:", error);
      setMode("fallback");
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (isLoading) {
        setMode("loading");
      } else if (isError) {
        setMode("fallback");
      } else if (segments && segments.length > 0) {
        if (mode === "loading") {
          loadAudioElements(segments);
        }
      } else if (!isLoading) {
        setMode("fallback");
      }
    } else {
      audioElementsRef.current.forEach((audio) => {
        audio.pause();
        audio.src = "";
      });
      audioElementsRef.current = [];

      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }

      setIsPlaying(false);
      setMode("loading");
      setCurrentTime(0);
      setCurrentIndex(0);
      setSegmentDurations([]);
      setTotalDuration(0);
      if (progressUpdateIntervalRef.current) {
        clearInterval(progressUpdateIntervalRef.current);
        progressUpdateIntervalRef.current = null;
      }
      resetAllStyles();
    }
  }, [
    isOpen,
    isLoading,
    isError,
    segments,
    mode,
    loadAudioElements,
    resetAllStyles,
  ]);

  useEffect(() => {
    setTotalDuration(segmentDurations.reduce((acc, d) => acc + d, 0));
  }, [segmentDurations]);

  const calculateSegmentStartTime = useCallback(
    (index: number): number => {
      if (index <= 0 || index >= segmentDurations.length) return 0;
      return segmentDurations.slice(0, index).reduce((acc, d) => acc + d, 0);
    },
    [segmentDurations],
  );

  const jumpToSegment = useCallback(
    (index: number) => {
      const newIndex = Math.max(0, Math.min(segments.length - 1, index));
      const startTime = calculateSegmentStartTime(newIndex);
      setCurrentIndex(newIndex);
      setCurrentTime(startTime);
    },
    [segments.length, calculateSegmentStartTime],
  );

  const handleEnded = useCallback(() => {
    if (isPlaying && currentIndex < segments.length - 1) {
      const nextIndex = currentIndex + 1;
      const startTime = calculateSegmentStartTime(nextIndex);
      setCurrentIndex(nextIndex);
      setCurrentTime(startTime);
    } else {
      setIsPlaying(false);
    }
  }, [isPlaying, currentIndex, segments.length, calculateSegmentStartTime]);

  useEffect(() => {
    if (
      mode !== "api" ||
      audioElementsRef.current.length === 0 ||
      currentIndex >= audioElementsRef.current.length
    )
      return;

    const audio = audioElementsRef.current[currentIndex];
    if (currentAudioRef.current && currentAudioRef.current !== audio) {
      currentAudioRef.current.pause();
    }

    currentAudioRef.current = audio;
    audio.playbackRate = playbackRate;

    const handleError = (e: Event) => {
      console.error("Audio segment error, skipping:", e);
      if (isPlaying) handleEnded();
    };

    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    if (isPlaying) {
      audio.play().catch((err) => {
        console.error("Playback failed:", err);
        handleEnded();
      });
    } else {
      audio.pause();
    }

    return () => {
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, [
    currentIndex,
    isPlaying,
    mode,
    segments.length,
    handleEnded,
    playbackRate,
  ]);

  useEffect(() => {
    if (mode !== "api" || !isPlaying) return;

    progressUpdateIntervalRef.current = setInterval(() => {
      if (currentAudioRef.current) {
        const previousSegmentsDuration = segmentDurations
          .slice(0, currentIndex)
          .reduce((acc, d) => acc + d, 0);
        const segmentCurrentTime = currentAudioRef.current.currentTime;
        setCurrentTime(previousSegmentsDuration + segmentCurrentTime);
      }
    }, 100);

    return () => {
      if (progressUpdateIntervalRef.current) {
        clearInterval(progressUpdateIntervalRef.current);
        progressUpdateIntervalRef.current = null;
      }
    };
  }, [mode, isPlaying, currentIndex, segmentDurations]);

  useEffect(() => {
    if (
      mode !== "api" ||
      segments.length === 0 ||
      !highlightEnabled ||
      !isPlaying
    ) {
      resetAllStyles();
      return;
    }

    const mainContent =
      document.querySelector("main") ||
      document.querySelector("article") ||
      document.body;
    if (!mainContent) return;

    const targetText = normalizeText(segments[currentIndex]?.text || "");
    if (!targetText) return;

    let matchedElement: HTMLElement | null = null;
    const walker = document.createTreeWalker(
      mainContent,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const parent = node.parentElement;
          if (parent?.closest(".tts-player-container")) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      },
    );
    const textNodes: { node: Text; parent: HTMLElement; text: string }[] = [];

    let node: Node | null;
    while ((node = walker.nextNode())) {
      const textNode = node as Text;
      const parent = textNode.parentElement;
      if (parent && textNode.textContent) {
        const text = normalizeText(textNode.textContent);
        if (text) {
          textNodes.push({ node: textNode, parent, text });
        }
      }
    }

    const blockElements = Array.from(
      mainContent.querySelectorAll(
        "p, li, h1, h2, h3, h4, h5, h6, blockquote, div, time",
      ),
    ).filter((el) => !el.closest(".tts-player-container"));

    for (const el of blockElements) {
      const htmlEl = el as HTMLElement;
      const elText = normalizeText(htmlEl.textContent || "");
      if (elText === targetText) {
        matchedElement = htmlEl;
        break;
      }
    }

    if (!matchedElement) {
      let minLength = Infinity;
      for (const el of blockElements) {
        const htmlEl = el as HTMLElement;
        const elText = normalizeText(htmlEl.textContent || "");
        if (elText.includes(targetText)) {
          const textLength = elText.length;
          if (textLength < minLength) {
            matchedElement = htmlEl;
            minLength = textLength;
          }
        }
      }
    }

    // Strategy 3: If still no match, try finding by text nodes
    if (!matchedElement) {
      // Build text from consecutive text nodes
      for (let i = 0; i < textNodes.length; i++) {
        let combinedText = "";

        for (let j = i; j < textNodes.length; j++) {
          combinedText += textNodes[j].text;

          if (
            normalizeText(combinedText) === targetText ||
            normalizeText(combinedText).includes(targetText)
          ) {
            // Found match! Find the smallest common ancestor
            if (i === j) {
              matchedElement = textNodes[i].parent;
            } else {
              let ancestor: HTMLElement | null = textNodes[i].parent;
              while (ancestor) {
                let isCommon = true;
                for (let k = i; k <= j; k++) {
                  if (!ancestor.contains(textNodes[k].node)) {
                    isCommon = false;
                    break;
                  }
                }
                if (isCommon) {
                  matchedElement = ancestor;
                  break;
                }
                ancestor = ancestor.parentElement;
              }
            }
            break;
          }

          if (combinedText.length > targetText.length * 2) break;
        }
        if (matchedElement) break;
      }
    }

    if (matchedElement) {
      mainContent.querySelectorAll("*").forEach((el) => {
        const htmlEl = el as HTMLElement;
        if (htmlEl.closest(".tts-player-container")) return;

        if (!originalStylesRef.current.has(htmlEl)) {
          originalStylesRef.current.set(htmlEl, {
            color: htmlEl.style.color,
            transition: htmlEl.style.transition,
          });
        }

        // 1. Is matched element or inside matched element? (Highlight)
        if (matchedElement === el || matchedElement.contains(el)) {
          htmlEl.style.color = "";
          htmlEl.style.transition = "color 0.3s ease";
        }
        // 2. Is ancestor of matched element? (Keep original color, do NOT dim)
        else if (el.contains(matchedElement)) {
          htmlEl.style.color = "";
          htmlEl.style.transition = "color 0.3s ease";
        }
        // 3. Everything else (Dim)
        else {
          htmlEl.style.color = "var(--tts-dimmed)";
          htmlEl.style.transition = "color 0.3s ease";
        }
      });
      matchedElement.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [
    mode,
    segments,
    currentIndex,
    highlightEnabled,
    isPlaying,
    resetAllStyles,
  ]);

  const togglePlay = useCallback(() => setIsPlaying(!isPlaying), [isPlaying]);

  const seek = useCallback(
    (time: number) => {
      let accumulated = 0;
      for (let i = 0; i < segmentDurations.length; i++) {
        if (accumulated + segmentDurations[i] >= time) {
          setCurrentIndex(i);
          const audio = audioElementsRef.current[i];
          if (audio) {
            audio.currentTime = Math.max(0, time - accumulated);
            setCurrentTime(time);
          }
          return;
        }
        accumulated += segmentDurations[i];
      }
    },
    [segmentDurations],
  );

  const seekForward = () => {
    const newTime = Math.min(totalDuration, currentTime + 15);
    seek(newTime);
  };

  const seekBackward = () => {
    const newTime = Math.max(0, currentTime - 15);
    seek(newTime);
  };

  const progressPercentage =
    totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    return () => {
      audioElementsRef.current.forEach((audio) => {
        audio.pause();
        audio.src = "";
      });
      audioElementsRef.current = [];
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      if (progressUpdateIntervalRef.current) {
        clearInterval(progressUpdateIntervalRef.current);
        progressUpdateIntervalRef.current = null;
      }
      resetAllStyles();
    };
  }, [resetAllStyles]);

  return (
    <>
      <div
        ref={mainPlayerRef}
        className="tts-player-container mb-8 flex flex-col rounded-xl border border-black/10 bg-gray-50/40 p-4 text-gray-900 transition-all duration-300 dark:border-white/10 dark:bg-zinc-900/30 dark:text-gray-100"
      >
        {mode === "loading" && (
          <div className="flex min-h-[140px] flex-col items-center justify-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400 dark:text-gray-500" />
            <p className="text-center font-mono text-[10px] font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-500">
              {ui[lang]["agent.voiceReader.loading"]}
            </p>
          </div>
        )}

        {mode === "fallback" && (
          <div className="flex min-h-[140px] flex-col items-center justify-center space-y-2">
            <p className="text-center font-mono text-[10px] font-semibold tracking-wider text-red-500 uppercase dark:text-red-400">
              {ui[lang]["agent.voiceReader.error"]}
            </p>
          </div>
        )}

        {mode === "api" && segments.length > 0 && (
          <motion.div
            className="flex flex-col"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Header: Status & Settings */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
                  {isPlaying
                    ? ui[lang]["agent.voiceReader.playing"]
                    : ui[lang]["agent.voiceReader.title"]}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {/* Text highlight button */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setHighlightEnabled(!highlightEnabled)}
                  className={`flex size-8 cursor-pointer items-center justify-center rounded-full border transition-all ${
                    highlightEnabled
                      ? "border-black/10 bg-black/5 text-gray-900 dark:border-white/15 dark:bg-white/10 dark:text-gray-50"
                      : "border-transparent text-gray-400 hover:bg-black/5 hover:text-gray-950 dark:text-gray-500 dark:hover:bg-white/10 dark:hover:text-gray-50"
                  }`}
                  title={
                    highlightEnabled
                      ? ui[lang]["agent.voiceReader.disableHighlight"]
                      : ui[lang]["agent.voiceReader.enableHighlight"]
                  }
                >
                  <BookAudio className="size-3.5" />
                </motion.button>

                {/* Speed selector */}
                <Select
                  value={playbackRate.toString()}
                  onValueChange={(v) => setPlaybackRate(Number(v))}
                >
                  <SelectTrigger
                    className="h-8 w-auto min-w-[3.5rem] gap-1 rounded-full border border-black/10 bg-transparent px-2.5 font-mono text-xs font-semibold text-gray-500 shadow-none hover:border-black/20 hover:bg-black/5 focus:ring-0 dark:border-white/15 dark:text-gray-400 dark:hover:border-white/25 dark:hover:bg-white/10 [&>svg]:opacity-60"
                    title={ui[lang]["agent.voiceReader.speed"]}
                    size="sm"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    align="end"
                    className="min-w-[4rem] rounded-xl border-black/10 bg-white/95 backdrop-blur-md dark:border-white/15 dark:bg-zinc-950/95"
                  >
                    {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((rate) => (
                      <SelectItem
                        key={rate}
                        value={rate.toString()}
                        className="cursor-pointer rounded-lg font-mono text-xs tabular-nums focus:bg-black/5 focus:text-gray-950 dark:focus:bg-white/10 dark:focus:text-gray-50"
                      >
                        {rate}×
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Middle: Progress timeline */}
            <div className="mt-4 space-y-1.5">
              <div className="group/track relative w-full">
                <div className="h-1.5 w-full scale-y-50 overflow-hidden rounded-full bg-black/10 transition-all duration-200 group-hover/track:scale-y-100 dark:bg-white/10">
                  <motion.div
                    className="h-full rounded-full bg-gray-900 dark:bg-gray-100"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercentage}%` }}
                    transition={{ duration: 0.1 }}
                  />
                </div>
                <input
                  type="range"
                  min="0"
                  max={totalDuration || 0}
                  step="0.1"
                  value={currentTime}
                  onChange={(e) => seek(Number(e.target.value))}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
              </div>
              <div className="flex items-center justify-between font-mono text-[11px] font-medium text-gray-500 tabular-nums dark:text-gray-400">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(totalDuration)}</span>
              </div>
            </div>

            {/* Bottom: Playback Controls */}
            <div className="flex items-center justify-center gap-1.5">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => jumpToSegment(currentIndex - 1)}
                disabled={currentIndex === 0}
                className="cursor-pointer rounded-full p-2.5 text-gray-500 transition-all hover:bg-black/5 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-20 disabled:hover:bg-transparent dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-50"
                aria-label={ui[lang]["agent.voiceReader.previous"]}
              >
                <StepBack className="size-4" />
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={seekBackward}
                disabled={currentTime < 1}
                className="cursor-pointer rounded-full p-2.5 text-gray-500 transition-all hover:bg-black/5 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-20 disabled:hover:bg-transparent dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-50"
                aria-label={ui[lang]["agent.voiceReader.rewind15s"]}
              >
                <Rewind className="size-4" />
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.92 }}
                whileHover={{ scale: 1.04 }}
                onClick={togglePlay}
                className="mx-2 flex cursor-pointer items-center justify-center rounded-full bg-gray-950 p-3.5 text-white shadow-sm transition-all duration-200 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-950 dark:hover:bg-gray-200"
                aria-label={
                  isPlaying
                    ? ui[lang]["agent.voiceReader.pause"]
                    : ui[lang]["agent.voiceReader.play"]
                }
              >
                {isPlaying ? (
                  <Pause className="size-4.5 fill-current" />
                ) : (
                  <Play className="ml-0.5 size-4.5 fill-current" />
                )}
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={seekForward}
                disabled={currentTime >= totalDuration - 1}
                className="cursor-pointer rounded-full p-2.5 text-gray-500 transition-all hover:bg-black/5 hover:text-gray-950 disabled:cursor-not-allowed disabled:opacity-20 disabled:hover:bg-transparent dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-50"
                aria-label={ui[lang]["agent.voiceReader.forward15s"]}
              >
                <FastForward className="size-4" />
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => jumpToSegment(currentIndex + 1)}
                disabled={currentIndex === segments.length - 1}
                className="cursor-pointer rounded-full p-2.5 text-gray-500 transition-all hover:bg-black/5 hover:text-gray-950 disabled:cursor-not-allowed disabled:opacity-20 disabled:hover:bg-transparent dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-50"
                aria-label={ui[lang]["agent.voiceReader.next"]}
              >
                <StepForward className="size-4" />
              </motion.button>
            </div>
          </motion.div>
        )}

        {(mode === "error" || (mode === "api" && segments.length === 0)) && (
          <div className="flex min-h-[140px] items-center justify-center">
            <p className="text-center font-mono text-[10px] font-semibold tracking-wider text-red-500 uppercase dark:text-red-400">
              {ui[lang]["agent.voiceReader.error"]}
            </p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {!isMainVisible && isPlaying && mode === "api" && (
          <motion.div
            initial={{ y: -25, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -25, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="tts-player-container pointer-events-none fixed top-4 right-4 left-4 z-50 flex items-center justify-center text-gray-900 dark:text-gray-100"
          >
            <div className="group pointer-events-auto flex w-full max-w-2xl items-center gap-4 overflow-hidden rounded-2xl border border-black/10 bg-white/95 p-3.5 pr-4 pl-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)] backdrop-blur-md dark:border-white/15 dark:bg-zinc-950/95 dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
              <div className="absolute right-0 bottom-0 left-0 h-1 bg-black/5 dark:bg-white/5">
                <motion.div
                  className="h-full bg-gray-950 dark:bg-gray-100"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercentage}%` }}
                />
              </div>

              <div className="flex min-w-0 flex-1 flex-col">
                <span className="mb-1 font-mono text-[9px] font-bold tracking-wider text-gray-500 uppercase dark:text-gray-400">
                  {ui[lang]["agent.voiceReader.playing"]}
                </span>
                <p className="truncate text-sm leading-tight font-semibold text-gray-950 dark:text-gray-50">
                  {segments[currentIndex]?.text}
                </p>
              </div>

              <div className="z-10 flex shrink-0 items-center gap-1">
                <button
                  onClick={() => jumpToSegment(currentIndex - 1)}
                  disabled={currentIndex === 0}
                  className="rounded-full p-2 text-gray-500 transition-colors hover:bg-black/5 hover:text-gray-950 disabled:opacity-20 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-50"
                >
                  <StepBack className="size-4" />
                </button>

                <button
                  onClick={togglePlay}
                  className="rounded-full bg-gray-950 p-2.5 text-white shadow-sm transition-transform hover:bg-gray-800 active:scale-95 dark:bg-gray-100 dark:text-gray-950 dark:hover:bg-gray-200"
                >
                  {isPlaying ? (
                    <Pause className="size-4 fill-current" />
                  ) : (
                    <Play className="ml-0.5 size-4 fill-current" />
                  )}
                </button>

                <button
                  onClick={() => jumpToSegment(currentIndex + 1)}
                  disabled={currentIndex === segments.length - 1}
                  className="rounded-full p-2 text-gray-500 transition-colors hover:bg-black/5 hover:text-gray-950 disabled:opacity-20 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-50"
                >
                  <StepForward className="size-4" />
                </button>

                <div className="mx-1 h-4 w-px bg-black/10 dark:bg-white/10" />

                <button
                  onClick={scrollToPlayer}
                  className="rounded-full p-2 text-gray-500 transition-colors hover:bg-black/5 hover:text-gray-950 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-50"
                  title="Back to player"
                >
                  <Maximize2 className="size-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
