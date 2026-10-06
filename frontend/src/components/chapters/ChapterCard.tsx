import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Chapter } from "@/hooks/useChapters";
import { cn } from "@/lib/utils";

interface ChapterCardProps {
  chapter: Chapter;
  onClick?: () => void;
  showStudent?: boolean;
}

export function ChapterCard({ chapter, onClick, showStudent = false }: ChapterCardProps) {
  const statusConfig = {
    submitted: { variant: "pending" as const, label: "Submitted", icon: "📝" },
    under_review: { variant: "pending" as const, label: "Under Review", icon: "👀" },
    revision_requested: { variant: "suspended" as const, label: "Revision Needed", icon: "🔧" },
    resubmitted: { variant: "pending" as const, label: "Resubmitted", icon: "🔄" },
    approved: { variant: "active" as const, label: "Approved", icon: "✅" },
    rejected: { variant: "default" as const, label: "Rejected", icon: "❌" },
  };

  const config = statusConfig[chapter.status];

  return (
    <Card isInteractive onClick={onClick} className="group">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{config.icon}</span>
            <h3 className="font-serif text-base text-stone-100">
              Chapter {chapter.chapter_number}
            </h3>
            <Badge variant={config.variant}>{config.label}</Badge>
          </div>
          <p className="text-sm text-stone-400 truncate">
            {chapter.title || "No title provided"}
          </p>
          {showStudent && chapter.student_name && (
            <p className="text-xs text-stone-500 mt-1">{chapter.student_name}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-stone-600">
            {new Date(chapter.submitted_at).toLocaleDateString("en-NG", {
              day: "numeric",
              month: "short",
            })}
          </p>
          <p className="text-xs text-stone-700 mt-0.5">v{chapter.version}</p>
        </div>
      </div>

      {/* Progress indicator for pending reviews */}
      {(chapter.status === "submitted" || chapter.status === "resubmitted") && (
        <div className="mt-3 flex items-center gap-2">
          <div className="h-1.5 flex-1 rounded-full bg-stone-800 overflow-hidden">
            <div className="h-full w-1/3 rounded-full bg-sage-600/60 animate-pulse" />
          </div>
          <span className="text-xs text-stone-600">Awaiting review</span>
        </div>
      )}
    </Card>
  );
}
