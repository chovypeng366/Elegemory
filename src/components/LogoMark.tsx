import { cn } from "../lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cn("size-6 shrink-0", className)}
    >
      <rect
        x="7.5"
        y="9"
        width="17"
        height="19"
        rx="3.4"
        fill="#FFF5DF"
        stroke="#B8895A"
        strokeOpacity="0.38"
      />
      <rect x="11" y="16.5" width="10" height="1.5" rx="0.75" fill="#B8895A" opacity="0.48" />
      <rect x="11" y="20" width="7" height="1.5" rx="0.75" fill="#8D7E6D" opacity="0.34" />
      <circle cx="16" cy="8.6" r="4.6" fill="#829D97" />
      <circle cx="14.1" cy="6.9" r="1.35" fill="#FFFFFF" opacity="0.42" />
    </svg>
  );
}
