type FullscreenVideo = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
};

let pageEvents = new AbortController();

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "--:--";
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return `${hours ? `${hours}:` : ""}${String(minutes).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function initVideoPlayers() {
  const template = document.querySelector<HTMLTemplateElement>(
    "#video-player-template",
  );
  if (!template) return;
  const { signal } = pageEvents;

  document
    .querySelectorAll<FullscreenVideo>(
      "article [data-pagefind-body] video[controls]",
    )
    .forEach((video, index) => {
      // Keep native caption controls until the custom player supports track selection.
      if (
        video.closest(".video-player") ||
        video.querySelector("track") ||
        video.hasAttribute("data-native-controls")
      )
        return;

      const root = template.content.firstElementChild!.cloneNode(
        true,
      ) as HTMLDivElement;
      const labels: Record<string, string> = JSON.parse(root.dataset.labels!);
      root.removeAttribute("data-labels");
      root.setAttribute(
        "aria-label",
        `${root.getAttribute("aria-label")} ${index + 1}`,
      );
      const stage = root.querySelector<HTMLDivElement>(".video-player__stage")!;
      const plays = root.querySelectorAll<HTMLButtonElement>("[data-play]");
      const mute = root.querySelector<HTMLButtonElement>("[data-mute]")!;
      const seek = root.querySelector<HTMLInputElement>(".video-player__seek")!;
      const volume = root.querySelector<HTMLInputElement>(
        ".video-player__volume",
      )!;
      const speed = root.querySelector<HTMLSelectElement>(
        ".video-player__speed",
      )!;
      const fullscreen =
        root.querySelector<HTMLButtonElement>("[data-fullscreen]")!;
      const elapsed = root.querySelector<HTMLElement>("[data-elapsed]")!;
      const duration = root.querySelector<HTMLElement>("[data-duration]")!;
      const notice = root.querySelector<HTMLElement>(".video-player__notice")!;
      const status = root.querySelector<HTMLElement>("[data-status]")!;
      const retry = root.querySelector<HTMLButtonElement>("[data-retry]")!;
      const settings = root.querySelector<HTMLDetailsElement>(
        ".video-player__settings",
      )!;
      const settingsToggle = settings.querySelector<HTMLElement>("summary")!;
      let message = "";
      let hideControlsTimer: ReturnType<typeof setTimeout> | undefined;
      let isInteracting = false;

      const inFullscreen = () => document.fullscreenElement === root;
      const showControls = () => {
        clearTimeout(hideControlsTimer);
        root.dataset.controlsHidden = "false";
        if (
          inFullscreen() &&
          !video.paused &&
          !video.ended &&
          !isInteracting
        ) {
          hideControlsTimer = setTimeout(() => {
            root.dataset.controlsHidden = "true";
          }, 2500);
        }
      };
      signal.addEventListener("abort", () => clearTimeout(hideControlsTimer), {
        once: true,
      });

      // Preserve article-specific width limits while giving the controls their own box.
      const maxWidth = getComputedStyle(video).maxWidth;
      root.style.setProperty(
        "--video-max-width",
        maxWidth === "none" ? "100%" : maxWidth,
      );
      video.before(root);
      stage.prepend(video);
      if (
        matchMedia("(prefers-reduced-motion: reduce)").matches &&
        video.autoplay
      ) {
        video.autoplay = false;
        video.pause();
      }

      const sync = () => {
        const playing = !video.paused && !video.ended;
        const muted = video.muted || video.volume === 0;
        const hasDuration =
          Number.isFinite(video.duration) && video.duration > 0;
        root.dataset.state = video.error
          ? "error"
          : playing
            ? "playing"
            : "paused";
        root.dataset.muted = String(muted);
        if (video.videoWidth && video.videoHeight) {
          root.style.setProperty(
            "--video-ratio",
            String(video.videoWidth / video.videoHeight),
          );
        }
        plays.forEach((button) => {
          button.hidden = !!video.error;
          button.setAttribute(
            "aria-label",
            playing ? labels.pause : labels.play,
          );
          button.title = playing ? labels.pause : labels.play;
        });
        mute.setAttribute("aria-label", muted ? labels.unmute : labels.mute);
        mute.title = muted ? labels.unmute : labels.mute;
        volume.value = String(muted ? 0 : video.volume);
        volume.style.setProperty(
          "--progress",
          `${Number(volume.value) * 100}%`,
        );
        speed.value = String(video.playbackRate);
        elapsed.textContent = formatTime(video.currentTime);
        duration.textContent = formatTime(video.duration);
        seek.disabled = !hasDuration || !!video.error;
        seek.max = String(hasDuration ? video.duration : 0);
        seek.value = String(video.currentTime);
        seek.style.setProperty(
          "--progress",
          `${hasDuration ? (video.currentTime / video.duration) * 100 : 0}%`,
        );
        seek.setAttribute(
          "aria-valuetext",
          `${formatTime(video.currentTime)} ${labels.of} ${formatTime(video.duration)}`,
        );
        const inFullscreen = document.fullscreenElement === root;
        fullscreen.setAttribute(
          "aria-label",
          inFullscreen ? labels.exitFullscreen : labels.fullscreen,
        );
        fullscreen.title = inFullscreen
          ? labels.exitFullscreen
          : labels.fullscreen;
        const loading =
          video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA &&
          video.networkState === HTMLMediaElement.NETWORK_LOADING;
        const text = video.error
          ? labels.error
          : message || (loading ? labels.loading : "");
        if (status.textContent !== text) status.textContent = text;
        notice.hidden = !text;
        retry.hidden = !video.error;
      };

      const togglePlayback = async () => {
        message = "";
        if (!video.paused) {
          video.pause();
          return;
        }
        try {
          if (video.error) video.load();
          await video.play();
        } catch (error) {
          if (
            signal.aborted ||
            (error instanceof DOMException && error.name === "AbortError")
          )
            return;
          message = labels.playError;
        }
        sync();
      };

      plays.forEach((button) =>
        button.addEventListener("click", togglePlayback, { signal }),
      );
      video.addEventListener(
        "click",
        (event) => {
          // In fullscreen, a touch on a playing video reveals its controls instead of pausing it.
          if (
            inFullscreen() &&
            !video.paused &&
            (event.pointerType === "touch" ||
              matchMedia("(hover: none)").matches)
          ) {
            if (root.dataset.controlsHidden === "true") showControls();
            else {
              clearTimeout(hideControlsTimer);
              root.dataset.controlsHidden = "true";
            }
          } else {
            void togglePlayback();
          }
        },
        { signal },
      );
      root.addEventListener(
        "pointerdown",
        (event) => {
          if (
            event.target instanceof Element &&
            event.target.closest(
              ".video-player__controls, .video-player__center-play",
            )
          ) {
            isInteracting = true;
            showControls();
          }
        },
        { signal },
      );
      for (const event of ["pointerup", "pointercancel"]) {
        document.addEventListener(
          event,
          () => {
            if (isInteracting) {
              isInteracting = false;
              showControls();
            }
          },
          { signal },
        );
      }
      root.addEventListener(
        "pointermove",
        (event) => {
          if (event.pointerType === "mouse") showControls();
        },
        { signal },
      );
      root.addEventListener(
        "pointerleave",
        (event) => {
          if (
            inFullscreen() &&
            event.pointerType === "mouse" &&
            !isInteracting
          ) {
            clearTimeout(hideControlsTimer);
            root.dataset.controlsHidden = "true";
          }
        },
        { signal },
      );
      settings.addEventListener("toggle", showControls, { signal });
      for (const event of ["play", "pause", "ended"]) {
        video.addEventListener(event, showControls, { signal });
      }
      mute.addEventListener(
        "click",
        () => {
          if (video.volume === 0) {
            video.volume = 1;
            video.muted = false;
          } else {
            video.muted = !video.muted;
          }
        },
        { signal },
      );
      volume.addEventListener(
        "input",
        () => {
          video.volume = Number(volume.value);
          video.muted = video.volume === 0;
        },
        { signal },
      );
      seek.addEventListener(
        "input",
        () => {
          if (!seek.disabled) video.currentTime = Number(seek.value);
          sync();
        },
        { signal },
      );
      speed.addEventListener(
        "change",
        () => {
          video.playbackRate = Number(speed.value);
        },
        { signal },
      );
      retry.addEventListener(
        "click",
        () => {
          message = "";
          video.load();
          sync();
          plays[0].focus({ preventScroll: true });
        },
        { signal },
      );
      fullscreen.hidden =
        !(document.fullscreenEnabled && root.requestFullscreen) &&
        !video.webkitEnterFullscreen;
      fullscreen.addEventListener(
        "click",
        async () => {
          try {
            if (document.fullscreenElement === root)
              await document.exitFullscreen();
            else if (document.fullscreenEnabled && root.requestFullscreen)
              await root.requestFullscreen();
            else video.webkitEnterFullscreen?.();
          } catch {
            message = labels.fullscreenError;
            sync();
          }
        },
        { signal },
      );
      document.addEventListener(
        "fullscreenchange",
        () => {
          if (document.fullscreenElement === root) showControls();
          else {
            clearTimeout(hideControlsTimer);
            root.dataset.controlsHidden = "false";
          }
          sync();
        },
        { signal },
      );
      document.addEventListener(
        "pointerdown",
        (event) => {
          if (event.target instanceof Node && !settings.contains(event.target))
            settings.open = false;
        },
        { signal },
      );
      settings.addEventListener(
        "keydown",
        (event) => {
          if (event.key === "Escape" && settings.open) {
            event.preventDefault();
            settings.open = false;
            settingsToggle.focus();
          }
        },
        { signal },
      );
      for (const event of [
        "play",
        "pause",
        "ended",
        "timeupdate",
        "loadedmetadata",
        "loadeddata",
        "durationchange",
        "volumechange",
        "ratechange",
        "waiting",
        "canplay",
        "error",
        "progress",
        "suspend",
        "emptied",
      ]) {
        video.addEventListener(event, sync, { signal });
      }
      for (const event of ["loadstart", "playing"]) {
        video.addEventListener(
          event,
          () => {
            message = "";
            sync();
          },
          { signal },
        );
      }

      sync();
      showControls();
      video.controls = false;
    });
}

document.addEventListener("astro:page-load", initVideoPlayers);
document.addEventListener("astro:before-swap", () => {
  pageEvents.abort();
  document
    .querySelectorAll<HTMLVideoElement>(".video-player video")
    .forEach((video) => video.pause());
  pageEvents = new AbortController();
});
