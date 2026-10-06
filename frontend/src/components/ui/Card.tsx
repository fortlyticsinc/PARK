// frontend/src/components/ui/Card.tsx
/**
 * PARK — Design System: Card
 * Subtle noise texture, dark ink canvas, amber accent on hover.
 */
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  isInteractive?: boolean;
}

export function Card({
  children,
  className,
  onClick,
  isInteractive = false,
}: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-xl border border-stone-800/60 bg-stone-900/80 p-5",
        "backdrop-blur-sm",
        "transition-all duration-200",
        isInteractive &&
          "cursor-pointer hover:border-sage-800/40 hover:bg-stone-800/60",
        className
      )}
    >
      {children}
    </div>
  );
}
