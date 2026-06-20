"use client";

import { useRef, useState, type CSSProperties, type ReactNode } from "react";

/**
 * Interactive 3D tilt surface — the same parallax-on-hover treatment used by the
 * marketing home page ({@link HeroDashboardCard} and the "How it pays" cards),
 * generalised so the dashboards can share it.
 *
 * On hover the card tilts toward the cursor and a soft radial "glare" follows the
 * pointer. Children that opt in with the `tilt-pop` class lift toward the viewer
 * (via `translateZ`) because the card establishes a `preserve-3d` context.
 *
 * The effect is suppressed for coarse pointers (touch) and when the visitor has
 * requested reduced motion; in those cases the card renders as a plain container
 * and only the CSS hover treatment (lift + shadow) applies.
 */
export interface TiltCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "style"> {
  children: ReactNode;
  /** Maximum tilt angle, in degrees, at the card's edges. */
  intensity?: number;
  /** Scale applied while hovered. */
  scale?: number;
  /** RGB triplet (no `rgb()` wrapper) for the cursor glare, e.g. "16, 185, 129". */
  glow?: string;
  /** Radius of the glare circle, in px. */
  glareRadius?: number;
  /**
   * Box-shadow when at rest. Required if you also supply `hoverShadow` so the
   * browser has a starting value to interpolate from (avoids an abrupt jump).
   */
  restShadow?: string;
  /**
   * Box-shadow applied while the cursor is over the card. Both `restShadow`
   * and `hoverShadow` are driven as inline styles so the existing
   * `chromeTransition` actually animates the change.
   */
  hoverShadow?: string;
  /** Extra inline styles merged after the computed transform. */
  style?: CSSProperties;
}

interface TiltState {
  rx: number;
  ry: number;
  x: number;
  y: number;
  isHovered: boolean;
}

const REST: TiltState = { rx: 0, ry: 0, x: 50, y: 50, isHovered: false };

export function TiltCard({
  children,
  className = "",
  intensity = 12,
  scale = 1.015,
  glow = "16, 185, 129",
  glareRadius = 320,
  restShadow,
  hoverShadow,
  style,
  ...rest
}: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<TiltState>(REST);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (card === null) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const rect = card.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setCoords({
      ry: (mouseX / rect.width - 0.5) * intensity,
      rx: (0.5 - mouseY / rect.height) * intensity,
      x: (mouseX / rect.width) * 100,
      y: (mouseY / rect.height) * 100,
      isHovered: true,
    });
  };

  const handleMouseLeave = () => {
    setCoords((prev) => ({ ...prev, rx: 0, ry: 0, isHovered: false }));
  };

  const transformTransition = coords.isHovered
    ? "transform 0.1s cubic-bezier(0.25, 1, 0.5, 1)"
    : "transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)";
  const chromeTransition =
    "box-shadow 0.42s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.32s ease, background 0.32s ease, background-color 0.32s ease";

  const shadowValue =
    restShadow !== undefined || hoverShadow !== undefined
      ? coords.isHovered
        ? (hoverShadow ?? restShadow)
        : restShadow
      : undefined;

  const computedStyle: CSSProperties = {
    transform: `perspective(1100px) rotateX(${coords.rx}deg) rotateY(${coords.ry}deg) scale3d(${
      coords.isHovered ? scale : 1
    }, ${coords.isHovered ? scale : 1}, 1)`,
    transition: `${transformTransition}, ${chromeTransition}`,
    transformStyle: "preserve-3d",
    ...(shadowValue !== undefined ? { boxShadow: shadowValue } : {}),
    ...style,
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={computedStyle}
      className={`tilt-card group ${className}`}
      {...rest}
    >
      <span
        aria-hidden
        className="tilt-card-glare"
        style={{
          opacity: coords.isHovered ? 1 : 0,
          background: `radial-gradient(circle ${glareRadius}px at ${coords.x}% ${coords.y}%, rgba(${glow}, 0.16), transparent 75%)`,
        }}
      />
      {children}
    </div>
  );
}
