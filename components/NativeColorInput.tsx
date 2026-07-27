"use client";

import { useEffect, useRef } from "react";

/**
 * A plain controlled `<input type="color" value={} onChange={}>` re-renders on
 * every native `input` event — which browsers fire *continuously* while the
 * user drags around inside the native color-picker dialog, not just once when
 * they land on their final choice. Pushing a new `value` back into the input
 * on every one of those intermediate re-renders, while the OS dialog is still
 * open, is what could make an in-between hue the cursor merely passed over
 * end up "stuck" instead of the one actually released on — and relying on
 * `change` alone to avoid that turned out to be its own problem: some
 * browsers don't fire it reliably for this input type (e.g. dismissing the
 * picker by clicking away rather than via its own confirm control), so a pick
 * could silently not apply at all.
 *
 * Fixed by listening to both events but keeping the DOM input itself
 * uncontrolled — `value` is only ever written back to it when it changes from
 * *outside* (e.g. a preset swatch click); a change that originated from this
 * input firing its own event is already reflected in the DOM, so the sync
 * effect is a no-op for it and never fights with an still-open picker.
 */
export function NativeColorInput({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (hex: string) => void;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    const handleChange = () => onChange(input.value);
    input.addEventListener("input", handleChange);
    input.addEventListener("change", handleChange);
    return () => {
      input.removeEventListener("input", handleChange);
      input.removeEventListener("change", handleChange);
    };
  }, [onChange]);

  useEffect(() => {
    if (inputRef.current && inputRef.current.value !== value) {
      inputRef.current.value = value;
    }
  }, [value]);

  return <input ref={inputRef} type="color" defaultValue={value} className={className} />;
}
