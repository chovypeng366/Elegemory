import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/utils";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  size?: "sm" | "md";
  active?: boolean;
  children: ReactNode;
}

export function IconButton({
  label,
  size = "md",
  active = false,
  className,
  children,
  ...rest
}: IconButtonProps) {
  return (
    <button
      {...rest}
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "icon-button focus-ring",
        size === "sm" ? "size-7" : "size-8",
        active && "bg-ink/5 text-ink",
        className,
      )}
    >
      {children}
    </button>
  );
}
