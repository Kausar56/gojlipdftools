"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dancing_Script,
  Great_Vibes,
  Sacramento,
  Alex_Brush,
  Pacifico,
  Satisfy,
  Allura,
  Petit_Formal_Script,
  Herr_Von_Muellerhoff,
  Kristi,
  Meddon,
  Parisienne,
} from "next/font/google";
import { ToolIcon } from "./icons";

const dancingScript = Dancing_Script({ subsets: ["latin"], weight: "700" });
const greatVibes = Great_Vibes({ subsets: ["latin"], weight: "400" });
const sacramento = Sacramento({ subsets: ["latin"], weight: "400" });
const alexBrush = Alex_Brush({ subsets: ["latin"], weight: "400" });
const pacifico = Pacifico({ subsets: ["latin"], weight: "400" });
const satisfy = Satisfy({ subsets: ["latin"], weight: "400" });
const allura = Allura({ subsets: ["latin"], weight: "400" });
const petitFormalScript = Petit_Formal_Script({ subsets: ["latin"], weight: "400" });
const herrVonMuellerhoff = Herr_Von_Muellerhoff({ subsets: ["latin"], weight: "400" });
const kristi = Kristi({ subsets: ["latin"], weight: "400" });
const meddon = Meddon({ subsets: ["latin"], weight: "400" });
const parisienne = Parisienne({ subsets: ["latin"], weight: "400" });

// .style.fontFamily is next/font's actual usable family name (its own
// .className applies the @font-face, but canvas text rendering needs the
// name string directly, not a CSS class).
const SIGNATURE_FONTS = [
  dancingScript,
  greatVibes,
  sacramento,
  alexBrush,
  pacifico,
  satisfy,
  allura,
  petitFormalScript,
  herrVonMuellerhoff,
  kristi,
  meddon,
  parisienne,
];

const SIGNATURE_COLORS = ["#7c93d1", "#1f3a93", "#4b3fd6", "#1414c9", "#5a5a5a", "#2b2b2b", "#000000"];

type Tab = "type" | "draw" | "upload" | "camera";

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 200;

export function SignaturePad({
  onConfirm,
  onCancel,
}: {
  onConfirm: (dataUrl: string, remember?: boolean) => void;
  onCancel: () => void;
}) {
  const [tab, setTab] = useState<Tab>("type");
  const [remember, setRemember] = useState(true);

  // Type tab
  const [typedName, setTypedName] = useState("Your Name");
  const [typedColor, setTypedColor] = useState(SIGNATURE_COLORS[SIGNATURE_COLORS.length - 1]);
  const [fontIndex, setFontIndex] = useState(0);

  // Draw tab
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [drawColor, setDrawColor] = useState(SIGNATURE_COLORS[SIGNATURE_COLORS.length - 1]);

  // Upload Image tab
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [uploadedDataUrl, setUploadedDataUrl] = useState<string | null>(null);

  // Camera tab
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState("");
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (tab !== "camera" || capturedDataUrl) return;
    let cancelled = false;
    setCameraError("");
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "user" } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => setCameraError("Couldn't access the camera — check your browser's permission settings."));

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [tab, capturedDataUrl]);

  function getPos(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function onPointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = drawCanvasRef.current?.getContext("2d");
    if (!ctx) return;
    drawingRef.current = true;
    const { x, y } = getPos(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function onPointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const ctx = drawCanvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(event);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = drawColor;
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  }

  function onPointerUp() {
    drawingRef.current = false;
  }

  function clearDrawing() {
    const canvas = drawCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  }

  async function handleUploadFile(file: File) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    setUploadedDataUrl(dataUrl);
  }

  function captureFromCamera() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    setCapturedDataUrl(canvas.toDataURL("image/png"));
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function retakePhoto() {
    setCapturedDataUrl(null);
  }

  // Renders the currently typed name, in the chosen font/color, onto an
  // off-screen canvas — this is what actually turns a "Type" selection into
  // the same kind of PNG data URL the other three tabs already produce.
  async function renderTypedSignature(): Promise<string | null> {
    const trimmed = typedName.trim();
    if (!trimmed) return null;
    const font = SIGNATURE_FONTS[fontIndex];
    const fontFamily = font.style.fontFamily;

    // Canvas text rendering only picks up a webfont once the browser has
    // actually finished loading it — without waiting here, the very first
    // signature generated after the page loads can silently fall back to a
    // system font instead of the one the user picked.
    try {
      await document.fonts.load(`64px ${fontFamily}`);
      await document.fonts.ready;
    } catch {
      // Best-effort — worst case the fallback font renders instead.
    }

    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = typedColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    let fontSize = 64;
    ctx.font = `${fontSize}px ${fontFamily}`;
    // Shrinks to fit — a long typed name in a wide script font can otherwise
    // run past the canvas edges and get clipped.
    while (ctx.measureText(trimmed).width > canvas.width - 40 && fontSize > 20) {
      fontSize -= 2;
      ctx.font = `${fontSize}px ${fontFamily}`;
    }
    ctx.fillText(trimmed, canvas.width / 2, canvas.height / 2);
    return canvas.toDataURL("image/png");
  }

  const canSave =
    (tab === "type" && typedName.trim().length > 0) ||
    (tab === "draw" && hasDrawn) ||
    (tab === "upload" && Boolean(uploadedDataUrl)) ||
    (tab === "camera" && Boolean(capturedDataUrl));

  async function handleSave() {
    if (tab === "type") {
      const dataUrl = await renderTypedSignature();
      if (dataUrl) onConfirm(dataUrl, remember);
    } else if (tab === "draw") {
      const canvas = drawCanvasRef.current;
      if (canvas && hasDrawn) onConfirm(canvas.toDataURL("image/png"), remember);
    } else if (tab === "upload") {
      if (uploadedDataUrl) onConfirm(uploadedDataUrl, remember);
    } else if (tab === "camera") {
      if (capturedDataUrl) onConfirm(capturedDataUrl, remember);
    }
  }

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: "type", label: "Type", icon: "text-tool" },
    { id: "draw", label: "Draw", icon: "pen" },
    { id: "upload", label: "Upload Image", icon: "file" },
    { id: "camera", label: "Camera", icon: "image-tool" },
  ];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-base-300 bg-base-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-base-300 bg-base-200 px-5 py-3">
          <p className="font-semibold text-base-content">Create signature</p>
          <button type="button" onClick={onCancel} aria-label="Close" className="btn btn-ghost btn-xs btn-square">
            <ToolIcon name="close" className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 border-b border-base-300 px-5">
          <div className="flex flex-wrap">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm ${
                  tab === t.id
                    ? "border-primary font-medium text-primary"
                    : "border-transparent text-base-content/60 hover:text-base-content"
                }`}
              >
                <ToolIcon name={t.icon} className="h-4 w-4" />
                {t.label}
              </button>
            ))}
          </div>
          <label className="flex shrink-0 items-center gap-1.5 py-2.5 text-xs text-base-content/70">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
              className="checkbox checkbox-xs"
            />
            Save signature
          </label>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === "type" && (
            <div>
              {/* Fixed white, not bg-base-100 — a signature is ink on a page, which
                  is white regardless of whether the app itself is in dark mode, and
                  several of the ink colors below (navy, dark gray, black) are
                  unreadable against this modal's own dark-mode background. */}
              <input
                type="text"
                value={typedName}
                onChange={(event) => setTypedName(event.target.value)}
                placeholder="Type your name"
                className="input input-bordered w-full bg-white text-center text-lg placeholder:text-black/40"
                style={{ color: typedColor }}
              />
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                {SIGNATURE_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setTypedColor(color)}
                    aria-label={`Use ${color}`}
                    className={`h-6 w-6 rounded-full ${typedColor === color ? "ring-2 ring-base-content/50 ring-offset-2 ring-offset-base-100" : ""}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {SIGNATURE_FONTS.map((font, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setFontIndex(index)}
                    className={`truncate rounded-lg border bg-white p-3 text-2xl ${
                      fontIndex === index ? "border-primary ring-2 ring-primary/40" : "border-base-300 hover:border-base-content/30"
                    } ${font.className}`}
                    style={{ color: typedColor }}
                    title={typedName || "Your Name"}
                  >
                    {typedName.trim() || "Your Name"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === "draw" && (
            <div>
              {/* Fixed white, same reasoning as the Type tab — the stroke is drawn
                  in a fixed dark ink color, which used to sit on bg-base-200 (a
                  dark gray in dark mode), making the drawn line barely visible. */}
              <canvas
                ref={drawCanvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
                className="w-full touch-none rounded-lg border border-base-300 bg-white"
              />
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button type="button" onClick={clearDrawing} className="btn btn-outline btn-sm">
                  Clear
                </button>
                <div className="flex items-center gap-2">
                  {SIGNATURE_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setDrawColor(color)}
                      aria-label={`Draw in ${color}`}
                      title={color}
                      className={`h-6 w-6 rounded-full ${drawColor === color ? "ring-2 ring-base-content/50 ring-offset-2 ring-offset-base-100" : ""}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "upload" && (
            <div className="flex flex-col items-center gap-3">
              {uploadedDataUrl ? (
                <div className="flex h-48 w-full items-center justify-center rounded-lg border border-base-300 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={uploadedDataUrl} alt="Uploaded signature" className="max-h-full max-w-full object-contain" />
                </div>
              ) : (
                <div className="flex h-48 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-base-300 bg-white text-center text-sm text-black/50">
                  <ToolIcon name="upload" className="h-6 w-6" />
                  Upload an image of your signature — a clear background works best.
                </div>
              )}
              <div className="flex gap-2">
                <button type="button" onClick={() => uploadInputRef.current?.click()} className="btn btn-outline btn-sm">
                  {uploadedDataUrl ? "Choose a different image" : "Choose Image"}
                </button>
                {uploadedDataUrl && (
                  <button type="button" onClick={() => setUploadedDataUrl(null)} className="btn btn-ghost btn-sm text-error">
                    Remove
                  </button>
                )}
              </div>
              <input
                ref={uploadInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) handleUploadFile(file);
                }}
              />
            </div>
          )}

          {tab === "camera" && (
            <div className="flex flex-col items-center gap-3">
              {cameraError ? (
                <p className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{cameraError}</p>
              ) : capturedDataUrl ? (
                <div className="flex h-56 w-full items-center justify-center rounded-lg border border-base-300 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={capturedDataUrl} alt="Captured signature" className="max-h-full max-w-full object-contain" />
                </div>
              ) : (
                <video ref={videoRef} autoPlay playsInline muted className="h-56 w-full rounded-lg bg-black object-cover" />
              )}
              <div className="flex gap-2">
                {capturedDataUrl ? (
                  <button type="button" onClick={retakePhoto} className="btn btn-outline btn-sm">
                    Retake
                  </button>
                ) : (
                  !cameraError && (
                    <button type="button" onClick={captureFromCamera} className="btn btn-outline btn-sm">
                      Capture
                    </button>
                  )
                )}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-base-300 px-5 py-3">
          <p className="text-center text-xs text-base-content/50">
            Gojli doesn&apos;t guarantee that a signature created with this tool is legally binding.
          </p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={onCancel} className="btn btn-ghost btn-sm flex-1">
              Cancel
            </button>
            <button type="button" onClick={handleSave} disabled={!canSave} className="btn btn-primary btn-sm flex-1">
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
