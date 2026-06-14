"use client";

import type { CSSProperties, ReactNode } from "react";

import "./segment-slider.css";

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
  /** Optional icon shown before the label. */
  icon?: ReactNode;
}

export interface SegmentSliderProps<T extends string> {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name for the control group. */
  ariaLabel: string;
  className?: string;
  /** Slightly smaller segments for 3–4 options on mobile. */
  compact?: boolean;
}

/**
 * Pill segment control with a sliding thumb — extracted from the sign-in role
 * picker. Use for any binary-or-N choice across the web app.
 */
export function SegmentSlider<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className = "",
  compact = false,
}: SegmentSliderProps<T>) {
  const activeIndex = Math.max(
    0,
    options.findIndex((opt) => opt.value === value),
  );

  const style = {
    "--segment-count": options.length,
    "--segment-index": activeIndex,
  } as CSSProperties;

  return (
    <div
      className={`spinshare-segment-slider ${compact ? "spinshare-segment-slider--compact" : ""} ${className}`.trim()}
      style={style}
      role="tablist"
      aria-label={ariaLabel}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={`spinshare-segment-slider__option ${active ? "spinshare-segment-slider__option--active" : ""}`}
            onClick={() => onChange(opt.value)}
          >
            {opt.icon}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
