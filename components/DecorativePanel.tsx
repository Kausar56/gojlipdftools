"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ToolIcon } from "./icons";

const chips = [
  { icon: "merge", accent: "bg-primary text-primary-content" },
  { icon: "compress", accent: "bg-secondary text-secondary-content" },
  { icon: "watermark-pdf", accent: "bg-accent text-accent-content" },
];

export function DecorativePanel({ className }: { className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const card = cardRef.current;
    if (!root || !card) return;

    let cleanupMouse: (() => void) | undefined;

    // Deliberately no entrance "pop in" animation here — that pattern (start
    // at opacity:0, animate to visible) kept leaving the chips/badge stuck
    // invisible in dev under React Strict Mode's setup→cleanup→setup-again,
    // regardless of how the cleanup was written. Idle float and the cursor
    // tilt below only ever apply a transform to already-visible elements, so
    // there's no hidden state that can get abandoned mid-transition.
    const floatTween = gsap.to(root, { y: -10, duration: 3.2, ease: "sine.inOut", repeat: -1, yoyo: true });

    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const onMove = (event: MouseEvent) => {
        const rect = root.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width - 0.5;
        const py = (event.clientY - rect.top) / rect.height - 0.5;
        gsap.to(card, {
          rotateY: px * 8,
          rotateX: -py * 8,
          duration: 0.6,
          ease: "power2.out",
          transformPerspective: 800,
        });
      };
      const onLeave = () => {
        gsap.to(card, { rotateY: 0, rotateX: 0, duration: 0.6, ease: "power2.out" });
      };
      root.addEventListener("mousemove", onMove);
      root.addEventListener("mouseleave", onLeave);
      cleanupMouse = () => {
        root.removeEventListener("mousemove", onMove);
        root.removeEventListener("mouseleave", onLeave);
      };
    }

    return () => {
      cleanupMouse?.();
      floatTween.kill();
      gsap.set([root, card], { clearProps: "all" });
    };
  }, []);

  return (
    <div ref={rootRef} className={`relative ${className ?? ""}`}>
      <div
        ref={cardRef}
        className="relative rounded-3xl bg-base-100 bg-linear-to-br from-primary/15 via-secondary/10 to-accent/15 p-6 sm:p-8"
        style={{ transformStyle: "preserve-3d" }}
      >
        <div className="rounded-2xl border border-base-300 bg-base-100 shadow-xl">
          <div className="flex items-center gap-1.5 border-b border-base-300 px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-error/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
            <span className="ml-3 h-2 w-28 rounded-full bg-base-300" />
          </div>
          <div className="space-y-3 p-5">
            <div className="h-3 w-2/3 rounded-full bg-base-300" />
            <div className="h-3 w-1/2 rounded-full bg-base-300" />
            <div className="mt-4 grid grid-cols-3 gap-3">
              {chips.map((chip) => (
                <div
                  key={chip.icon}
                  className={`flex h-14 items-center justify-center rounded-xl ${chip.accent}`}
                >
                  <ToolIcon name={chip.icon} className="h-5 w-5" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-5 -left-5 flex items-center gap-2 rounded-xl border border-base-300 bg-base-100 px-4 py-2.5 shadow-lg">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-success/15 text-success">
          <ToolIcon name="check" className="h-4 w-4" />
        </span>
        <div className="text-xs">
          <p className="font-semibold text-base-content">File ready</p>
          <p className="text-base-content/60">Processed in your browser</p>
        </div>
      </div>
    </div>
  );
}
