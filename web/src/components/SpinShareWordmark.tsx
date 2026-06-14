import { cn } from "@/lib/utils";

type SpinShareWordmarkProps = {
  className?: string;
};

/** "SpinShare" wordmark — per-word vertical bevel gradients (matches logo 3D lighting). */
export function SpinShareWordmark({ className }: SpinShareWordmarkProps) {
  return (
    <span className={cn("font-black tracking-tight", className)}>
      <span className="spinshare-wordmark-spin">Spin</span>
      <span className="spinshare-wordmark-share">Share</span>
    </span>
  );
}
