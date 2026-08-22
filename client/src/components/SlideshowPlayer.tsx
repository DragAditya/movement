import type { GalleryImage } from "@/data/gallery";
import { nextSlideIndex } from "@/lib/gallery-utils";
import {
  ChevronLeft,
  ChevronRight,
  Expand,
  Minimize,
  Pause,
  Play,
  Settings2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type Transition = "crossfade" | "fade" | "slide" | "instant";
type FitMode = "contain" | "cover";

type SlideshowPlayerProps = {
  images: GalleryImage[];
  initialIndex?: number;
  mode?: "standard" | "immersive" | "kiosk";
  onExit: () => void;
};

const intervalOptions = [2, 3, 5, 8, 10, 15, 30, 60];

export default function SlideshowPlayer({
  images,
  initialIndex = 0,
  mode = "immersive",
  onExit,
}: SlideshowPlayerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const [index, setIndex] = useState(Math.min(initialIndex, Math.max(images.length - 1, 0)));
  const [playing, setPlaying] = useState(mode === "kiosk");
  const [controlsVisible, setControlsVisible] = useState(mode !== "kiosk");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [interval, setIntervalSeconds] = useState(5);
  const [transition, setTransition] = useState<Transition>("crossfade");
  const [fit, setFit] = useState<FitMode>("contain");
  const [showCounter, setShowCounter] = useState(true);
  const [showCaptions, setShowCaptions] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const showControls = useCallback(() => {
    if (mode === "kiosk" && !settingsOpen) return;
    setControlsVisible(true);
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      if (!settingsOpen) setControlsVisible(false);
    }, 2600);
  }, [mode, settingsOpen]);

  const move = useCallback(
    (direction: -1 | 1) => {
      if (!images.length) return;
      setIndex(current => nextSlideIndex(current, direction, images.length));
      showControls();
    },
    [images.length, showControls]
  );

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await rootRef.current?.requestFullscreen();
      }
    } catch {
      // The fixed viewport player is an intentional graceful fallback.
    }
  }, []);

  useEffect(() => {
    const handleFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handleFullscreen);
    return () => document.removeEventListener("fullscreenchange", handleFullscreen);
  }, []);

  useEffect(() => {
    if (!playing || images.length < 2) return;
    const timer = window.setInterval(() => move(1), interval * 1000);
    return () => window.clearInterval(timer);
  }, [images.length, interval, move, playing]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") move(-1);
      if (event.key === "ArrowRight") move(1);
      if (event.key === " ") {
        event.preventDefault();
        setPlaying(current => !current);
      }
      if (event.key === "Escape") {
        if (document.fullscreenElement) document.exitFullscreen();
        else onExit();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [move, onExit]);

  useEffect(() => {
    showControls();
    return () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [showControls]);

  const handlePointerUp = (event: React.PointerEvent) => {
    if (!pointerStart.current) return;
    const deltaX = event.clientX - pointerStart.current.x;
    const deltaY = event.clientY - pointerStart.current.y;
    pointerStart.current = null;
    if (Math.abs(deltaX) > 56 && Math.abs(deltaX) > Math.abs(deltaY) * 1.25) {
      move(deltaX < 0 ? 1 : -1);
    } else if (Math.abs(deltaX) < 12 && Math.abs(deltaY) < 12) {
      showControls();
    }
  };

  if (!images.length) return null;
  const image = images[index];
  const controlClass = controlsVisible || settingsOpen ? "slideshow-controls is-visible" : "slideshow-controls";

  return (
    <div
      className={`slideshow-player mode-${mode}`}
      ref={rootRef}
      onMouseMove={showControls}
      onPointerDown={event => {
        pointerStart.current = { x: event.clientX, y: event.clientY };
      }}
      onPointerUp={handlePointerUp}
      role="dialog"
      aria-modal="true"
      aria-label="Fullscreen slideshow"
    >
      <div className={`slideshow-image-stage transition-${transition}`}>
        <img key={image.id} className={`slideshow-image fit-${fit}`} src={image.src} alt={image.alt} draggable={false} />
      </div>

      <div className={`slideshow-shade ${controlsVisible || settingsOpen ? "is-visible" : ""}`} />

      <div className={`${controlClass} slideshow-topbar`}>
        <button className="slideshow-icon-button" onClick={onExit} aria-label="Exit slideshow">
          <X size={20} strokeWidth={1.7} />
        </button>
        <div className="slideshow-identity">GALLERY</div>
        <div className="slideshow-top-actions">
          <button className="slideshow-icon-button" onClick={() => setSettingsOpen(open => !open)} aria-label="Slideshow settings">
            <Settings2 size={19} strokeWidth={1.7} />
          </button>
          <button className="slideshow-icon-button" onClick={toggleFullscreen} aria-label="Toggle fullscreen">
            {isFullscreen ? <Minimize size={19} strokeWidth={1.7} /> : <Expand size={19} strokeWidth={1.7} />}
          </button>
        </div>
      </div>

      <button className={`${controlClass} slideshow-step previous`} onClick={() => move(-1)} aria-label="Previous image">
        <ChevronLeft size={28} strokeWidth={1.5} />
      </button>
      <button className={`${controlClass} slideshow-step next`} onClick={() => move(1)} aria-label="Next image">
        <ChevronRight size={28} strokeWidth={1.5} />
      </button>

      <div className={`${controlClass} slideshow-bottombar`}>
        <div className="slideshow-caption-block">
          {showCaptions && (
            <>
              <span className="slideshow-image-title">{image.title}</span>
              <span className="slideshow-image-caption">{image.caption}</span>
            </>
          )}
        </div>
        <button className="slideshow-play-button" onClick={() => setPlaying(current => !current)} aria-label={playing ? "Pause slideshow" : "Play slideshow"}>
          {playing ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}
          <span>{playing ? "Pause" : "Play"}</span>
        </button>
        {showCounter && <div className="slideshow-counter">{String(index + 1).padStart(2, "0")} / {String(images.length).padStart(2, "0")}</div>}
      </div>

      {settingsOpen && (
        <aside className="slideshow-settings-panel" onPointerDown={event => event.stopPropagation()}>
          <div className="settings-panel-heading">
            <span>Presentation</span>
            <button className="quiet-icon-button" onClick={() => setSettingsOpen(false)} aria-label="Close settings"><X size={17} /></button>
          </div>
          <label className="settings-label">Interval
            <select value={interval} onChange={event => setIntervalSeconds(Number(event.target.value))}>
              {intervalOptions.map(option => <option value={option} key={option}>{option} seconds</option>)}
            </select>
          </label>
          <label className="settings-label">Transition
            <select value={transition} onChange={event => setTransition(event.target.value as Transition)}>
              <option value="crossfade">Crossfade</option>
              <option value="fade">Fade</option>
              <option value="slide">Slide</option>
              <option value="instant">Instant</option>
            </select>
          </label>
          <label className="settings-label">Image fitting
            <select value={fit} onChange={event => setFit(event.target.value as FitMode)}>
              <option value="contain">Fit image</option>
              <option value="cover">Fill screen</option>
            </select>
          </label>
          <label className="setting-check"><input type="checkbox" checked={showCounter} onChange={event => setShowCounter(event.target.checked)} /> Show counter</label>
          <label className="setting-check"><input type="checkbox" checked={showCaptions} onChange={event => setShowCaptions(event.target.checked)} /> Show captions</label>
          <p className="settings-help">Use arrow keys to navigate, Space to play or pause, and Escape to exit.</p>
        </aside>
      )}
    </div>
  );
}
