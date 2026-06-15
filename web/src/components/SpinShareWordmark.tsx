import { cn } from "@/lib/utils";

type SpinShareWordmarkProps = {
  className?: string;
};

/** "SpinShare" wordmark — solid black text beside the logo icon. */
export function SpinShareWordmark({ className }: SpinShareWordmarkProps) {
  return (
    <span className={cn("font-black tracking-tight text-black", className)}>
      SpinShare
    </span>
  );
}
