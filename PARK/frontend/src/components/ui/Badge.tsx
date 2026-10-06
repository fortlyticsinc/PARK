// frontend/src/components/ui/Badge.tsx
/**
 * PARK — Design System: Badge
 * Status indicators with semantic color mapping.
 */
import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "active" | "completed" | "suspended" | "pending" | "default" | "danger" | "warning" | "muted";
  className?: string;
}

// NOTE: "danger" and "warning" were added here during the frontend
// build-and-fix pass — several components (AtRisk, ProjectDetail)
// called variants that didn't exist yet on this shared component.
// "danger" is a genuine red status color (at-risk, overdue). "warning"
// intentionally keeps an amber/orange tone as a STATUS color (caution),
// which is distinct from the app's sage brand accent color — using
// amber for "pending/caution" state is a normal UI convention even
// though amber was removed as the brand color.
export function Badge({ children, variant = "default", className }: BadgeProps) {
  const variants = {
    active: "bg-emerald-900/40 text-emerald-300 border-emerald-800/50",
    completed: "bg-blue-900/40 text-blue-300 border-blue-800/50",
    suspended: "bg-sage-900/40 text-sage-300 border-sage-800/50",
    pending: "bg-stone-800 text-stone-400 border-stone-700",
    default: "bg-stone-800 text-stone-400 border-stone-700",
    danger: "bg-red-900/40 text-red-300 border-red-800/50",
    warning: "bg-orange-900/40 text-orange-300 border-orange-800/50",
    muted: "bg-stone-800/60 text-stone-500 border-stone-700/50",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
