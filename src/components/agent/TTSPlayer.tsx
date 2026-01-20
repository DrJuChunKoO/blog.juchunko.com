import { useEffect, useState, useRef, useCallback } from "react";
import { QueryClient, useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import { BookAudio, Play, Pause, Rewind, FastForward, Loader2, StepForward, StepBack, Maximize2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const isDescendantOf = (parent: HTMLElement, element: Element): boolean => {
	let current: Element | null = element;
	while (current) {
		if (current === parent) return true;
		current = current.parentElement;
	}
	return false;
};

async function fetchTTSAudioSegments(domain: string, path: string): Promise<AudioSegment[]> {
	try {
		const response = await fetch(`https://tts-api.juchunko.com/v1/audio/${domain}/${path}`);

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
	const originalStylesRef = useRef<Map<HTMLElement, { color: string; transition: string }>>(new Map());

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
				const domain = url.hostname;
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
		mainPlayerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
	};

	const resetAllStyles = useCallback(() => {
		originalStylesRef.current.forEach((style, el) => {
			el.style.color = style.color;
			el.style.transition = style.transition;
		});
		originalStylesRef.current.clear();
		const main = document.querySelector("main") || document.querySelector("article");
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
	}, [isOpen, isLoading, isError, segments, mode, loadAudioElements, resetAllStyles]);

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
		if (mode !== "api" || audioElementsRef.current.length === 0 || currentIndex >= audioElementsRef.current.length) return;

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
	}, [currentIndex, isPlaying, mode, segments.length, handleEnded, playbackRate]);

	useEffect(() => {
		if (mode !== "api" || !isPlaying) return;

		progressUpdateIntervalRef.current = setInterval(() => {
			if (currentAudioRef.current) {
				const previousSegmentsDuration = segmentDurations.slice(0, currentIndex).reduce((acc, d) => acc + d, 0);
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
		if (mode !== "api" || segments.length === 0 || !highlightEnabled || !isPlaying) {
			resetAllStyles();
			return;
		}

		const mainContent = document.querySelector("main") || document.querySelector("article") || document.body;
		if (!mainContent) return;

		const targetText = normalizeText(segments[currentIndex]?.text || "");
		if (!targetText) return;

		let matchedElement: HTMLElement | null = null;
		const walker = document.createTreeWalker(mainContent, NodeFilter.SHOW_TEXT, {
			acceptNode: (node) => {
				const parent = node.parentElement;
				// Skip text nodes inside the player
				if (parent?.closest(".tts-player-container")) {
					return NodeFilter.FILTER_REJECT;
				}
				return NodeFilter.FILTER_ACCEPT;
			},
		});
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

		// Find all block elements, excluding player
		const blockElements = Array.from(mainContent.querySelectorAll("p, li, h1, h2, h3, h4, h5, h6, blockquote, div, time")).filter(
			(el) => !el.closest(".tts-player-container"),
		);

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

		if (matchedElement) {
			mainContent.querySelectorAll("*").forEach((el) => {
				const htmlEl = el as HTMLElement;
				// Never dim or style the player components
				if (htmlEl.closest(".tts-player-container")) {
					return;
				}

				if (!originalStylesRef.current.has(htmlEl)) {
					originalStylesRef.current.set(htmlEl, {
						color: htmlEl.style.color,
						transition: htmlEl.style.transition,
					});
				}

				const isMatchedOrChild = matchedElement!.contains(el) || el === matchedElement;
				const isAncestor = isDescendantOf(matchedElement!, el);

				if (isMatchedOrChild) {
					htmlEl.style.color = "";
					htmlEl.style.transition = "color 0.3s ease";
				} else if (!isAncestor) {
					htmlEl.style.color = "var(--tts-dimmed)";
					htmlEl.style.transition = "color 0.3s ease";
				} else {
					htmlEl.style.color = "";
					htmlEl.style.transition = "color 0.3s ease";
				}
			});
			matchedElement.scrollIntoView({ behavior: "smooth", block: "center" });
		}
	}, [mode, segments, currentIndex, highlightEnabled, isPlaying, resetAllStyles]);

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

	const progressPercentage = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

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
			<div ref={mainPlayerRef} className="tts-player-container bg-gray-100 dark:bg-white/5 flex flex-col p-4 rounded-lg mb-6 border border-gray-200 dark:border-white/10">
				{mode === "loading" && (
					<div className="flex min-h-[160px] flex-col items-center justify-center">
						<Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
						<p className="text-muted-foreground mt-2 text-center text-xs">{ui[lang]["agent.voiceReader.loading"]}</p>
					</div>
				)}

				{mode === "fallback" && (
					<div className="flex min-h-[160px] flex-col items-center justify-center space-y-2">
						<p className="text-muted-foreground text-center text-xs">{ui[lang]["agent.voiceReader.error"]}</p>
					</div>
				)}

				{mode === "api" && segments.length > 0 && (
					<motion.div
						className="flex flex-col space-y-5 py-2"
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.3 }}
					>
						<div className="bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/5 rounded-lg border px-3 py-2.5">
							<div className="text-gray-500 dark:text-gray-400 mb-1 text-xs">{ui[lang]["agent.voiceReader.playing"]}</div>
							<div className="text-inherit line-clamp-2 text-sm leading-relaxed">{segments[currentIndex]?.text || ""}</div>
						</div>

						<div className="space-y-2">
							<div className="relative w-full">
								<div className="bg-black/10 dark:bg-white/10 h-2 w-full overflow-hidden rounded-full">
									<motion.div
										className="bg-blue-600 dark:bg-blue-500 h-full rounded-full"
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
							<div className="flex items-center justify-between">
								<span className="text-gray-500 dark:text-gray-400 font-mono text-xs tabular-nums">{formatTime(currentTime)}</span>
								<div className="flex items-center gap-2">
									<motion.button
										whileTap={{ scale: 0.95 }}
										onClick={() => setHighlightEnabled(!highlightEnabled)}
										className={`cursor-pointer rounded-md p-1.5 transition-colors ${
											highlightEnabled ? "bg-blue-600/10 text-blue-600 dark:text-blue-400" : "text-gray-500 hover:bg-black/5 dark:hover:bg-white/5"
										}`}
										title={highlightEnabled ? ui[lang]["agent.voiceReader.disableHighlight"] : ui[lang]["agent.voiceReader.enableHighlight"]}
									>
										<BookAudio className="size-3.5" />
									</motion.button>

									<Select value={playbackRate.toString()} onValueChange={(v) => setPlaybackRate(Number(v))}>
										<SelectTrigger
											className="text-gray-500 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5 h-7 w-auto min-w-[3rem] gap-1 border-0 bg-transparent px-2 font-mono text-xs shadow-none focus:ring-0 [&>svg]:opacity-50"
											title={ui[lang]["agent.voiceReader.speed"]}
										>
											<SelectValue />
										</SelectTrigger>
										<SelectContent align="end" className="min-w-[4rem]">
											{[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((rate) => (
												<SelectItem key={rate} value={rate.toString()} className="font-mono text-xs tabular-nums">
													{rate}×
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<span className="text-gray-500 dark:text-gray-400 font-mono text-xs tabular-nums">{formatTime(totalDuration)}</span>
							</div>
						</div>

						<div className="flex items-center justify-center gap-1">
							<motion.button
								whileTap={{ scale: 0.9 }}
								onClick={() => jumpToSegment(currentIndex - 1)}
								disabled={currentIndex === 0}
								className="text-gray-500 hover:bg-black/5 dark:hover:bg-white/5 hover:text-inherit cursor-pointer rounded-lg p-2 transition-all disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
								aria-label={ui[lang]["agent.voiceReader.previous"]}
							>
								<StepBack className="size-4" />
							</motion.button>

							<motion.button
								whileTap={{ scale: 0.9 }}
								onClick={seekBackward}
								disabled={currentTime < 1}
								className="text-gray-500 hover:bg-black/5 dark:hover:bg-white/5 hover:text-inherit cursor-pointer rounded-lg p-2 transition-all disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
								aria-label={ui[lang]["agent.voiceReader.rewind15s"]}
							>
								<Rewind className="size-4" />
							</motion.button>

							<motion.button
								whileTap={{ scale: 0.9 }}
								whileHover={{ scale: 1.05 }}
								onClick={togglePlay}
								className="bg-blue-600 text-white hover:bg-blue-700 mx-1 cursor-pointer rounded-full p-3.5 shadow-md transition-all"
								aria-label={isPlaying ? ui[lang]["agent.voiceReader.pause"] : ui[lang]["agent.voiceReader.play"]}
							>
								{isPlaying ? <Pause className="size-5" /> : <Play className="size-5" />}
							</motion.button>

							<motion.button
								whileTap={{ scale: 0.9 }}
								onClick={seekForward}
								disabled={currentTime >= totalDuration - 1}
								className="text-gray-500 hover:bg-black/5 dark:hover:bg-white/5 hover:text-inherit cursor-pointer rounded-lg p-2 transition-all disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
								aria-label={ui[lang]["agent.voiceReader.forward15s"]}
							>
								<FastForward className="size-4" />
							</motion.button>

							<motion.button
								whileTap={{ scale: 0.9 }}
								onClick={() => jumpToSegment(currentIndex + 1)}
								disabled={currentIndex === segments.length - 1}
								className="text-gray-500 hover:bg-black/5 dark:hover:bg-white/5 hover:text-inherit cursor-pointer rounded-lg p-2 transition-all disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
								aria-label={ui[lang]["agent.voiceReader.next"]}
							>
								<StepForward className="size-4" />
							</motion.button>
						</div>
					</motion.div>
				)}

				{(mode === "error" || (mode === "api" && segments.length === 0)) && (
					<div className="flex min-h-[160px] items-center justify-center">
						<p className="text-red-500 text-center text-xs">{ui[lang]["agent.voiceReader.error"]}</p>
					</div>
				)}
			</div>

			<AnimatePresence>
				{!isMainVisible && isPlaying && mode === "api" && (
					<motion.div
						initial={{ y: -100, opacity: 0 }}
						animate={{ y: 0, opacity: 1 }}
						exit={{ y: -100, opacity: 0 }}
						transition={{ type: "spring", damping: 25, stiffness: 200 }}
						className="tts-player-container fixed top-4 left-4 right-4 z-50 flex items-center justify-center pointer-events-none"
					>
						<div className="bg-white/80 dark:bg-black/80 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl p-2 pl-4 pr-3 flex items-center gap-4 max-w-2xl w-full pointer-events-auto overflow-hidden group">
							<div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-200 dark:bg-white/10">
								<motion.div
									className="h-full bg-blue-600 dark:bg-blue-500"
									initial={{ width: 0 }}
									animate={{ width: `${progressPercentage}%` }}
								/>
							</div>

							<div className="flex-1 min-w-0 flex flex-col">
								<span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-0.5">
									{ui[lang]["agent.voiceReader.playing"]}
								</span>
								<p className="text-sm font-medium truncate dark:text-white leading-tight">
									{segments[currentIndex]?.text}
								</p>
							</div>

							<div className="flex items-center gap-1 shrink-0">
								<button
									onClick={() => jumpToSegment(currentIndex - 1)}
									disabled={currentIndex === 0}
									className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors disabled:opacity-30"
								>
									<StepBack className="size-4 dark:text-white" />
								</button>

								<button
									onClick={togglePlay}
									className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-full shadow-lg transition-transform active:scale-90"
								>
									{isPlaying ? <Pause className="size-4 fill-current" /> : <Play className="size-4 fill-current" />}
								</button>

								<button
									onClick={() => jumpToSegment(currentIndex + 1)}
									disabled={currentIndex === segments.length - 1}
									className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors disabled:opacity-30"
								>
									<StepForward className="size-4 dark:text-white" />
								</button>

								<div className="w-px h-4 bg-gray-200 dark:bg-white/10 mx-1" />

								<button
									onClick={scrollToPlayer}
									className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400"
									title="Back to player"
								>
									<Maximize2 className="size-4 dark:text-white" />
								</button>
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</>
	);
}
