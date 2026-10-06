import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useChapters, Chapter } from "@/hooks/useChapters";
import { cn } from "@/lib/utils";

interface ChapterReviewProps {
  chapter: Chapter;
  onReviewed?: () => void;
}

export function ChapterReview({ chapter, onReviewed }: ChapterReviewProps) {
  const { reviewChapter, addComment, isLoading, error } = useChapters();
  const [comment, setComment] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  const statusOptions = [
    {
      value: "approved",
      label: "Approve",
      description: "Chapter meets requirements",
      color: "bg-emerald-900/30 text-emerald-300 border-emerald-800/50 hover:bg-emerald-900/50",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
    {
      value: "revision_requested",
      label: "Request Revision",
      description: "Changes needed before approval",
      color: "bg-sage-900/30 text-sage-300 border-sage-800/50 hover:bg-sage-900/50",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
    },
    {
      value: "rejected",
      label: "Reject",
      description: "Does not meet standards",
      color: "bg-red-900/30 text-red-300 border-red-800/50 hover:bg-red-900/50",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
    },
  ];

  const handleReview = async () => {
    if (!selectedStatus) return;
    const result = await reviewChapter(chapter.id, {
      status: selectedStatus,
      comment: comment || undefined,
    });
    if (result) {
      onReviewed?.();
    }
  };

  const statusVariant =
    chapter.status === "approved"
      ? "active"
      : chapter.status === "revision_requested"
      ? "suspended"
      : chapter.status === "rejected"
      ? "pending"
      : "default";

  return (
    <div className="space-y-5">
      {/* Chapter Info */}
      <Card>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-lg text-stone-100">
                Chapter {chapter.chapter_number}
              </h3>
              <Badge variant={statusVariant}>{chapter.status.replace("_", " ")}</Badge>
            </div>
            <p className="mt-1 text-sm text-stone-400">
              {chapter.title || "No title"}
            </p>
            <p className="mt-0.5 text-xs text-stone-600">
              by {chapter.student_name} · Version {chapter.version}
            </p>
          </div>
          <a
            href={chapter.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-stone-800 p-2 text-stone-400 transition-colors hover:bg-stone-700 hover:text-stone-200"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </a>
        </div>
      </Card>

      {/* Previous Comments */}
      {chapter.comments.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-stone-400">Previous Comments</h4>
          {chapter.comments.map((c) => (
            <Card key={c.id} className="border-l-2 border-l-sage-700/50">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-sage-500">{c.author_name || c.author_role}</span>
                <span className="text-xs text-stone-600">
                  {new Date(c.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}
                </span>
                {c.page_number && (
                  <span className="text-xs text-stone-600">· Page {c.page_number}</span>
                )}
              </div>
              <p className="text-sm text-stone-300">{c.content}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Review Actions */}
      {chapter.status !== "approved" && chapter.status !== "rejected" && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-stone-400">Your Review</h4>

          {/* Status Selection */}
          <div className="grid gap-3">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSelectedStatus(option.value)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-4 text-left transition-all",
                  selectedStatus === option.value
                    ? option.color
                    : "border-stone-800 bg-stone-900/50 text-stone-400 hover:border-stone-700 hover:bg-stone-800/30"
                )}
              >
                <div className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                  selectedStatus === option.value ? "bg-white/10" : "bg-stone-800"
                )}>
                  {option.icon}
                </div>
                <div>
                  <p className={cn(
                    "font-medium",
                    selectedStatus === option.value ? "text-stone-100" : "text-stone-300"
                  )}>
                    {option.label}
                  </p>
                  <p className="text-xs text-stone-500">{option.description}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Comment Input */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-300">
              Comment (Optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Feedback for the student..."
              rows={4}
              className={cn(
                "w-full rounded-lg border bg-stone-900 px-3.5 py-2.5 text-sm text-stone-100",
                "placeholder:text-stone-600",
                "focus:border-sage-500/50 focus:outline-none focus:ring-1 focus:ring-sage-500/30",
                "border-stone-800 hover:border-stone-700 transition-colors resize-none"
              )}
            />
          </div>

          {/* Submit */}
          <Button
            onClick={handleReview}
            isLoading={isLoading}
            disabled={!selectedStatus}
            className="w-full"
          >
            Submit Review
          </Button>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
      )}

      {/* Terminal State Display */}
      {(chapter.status === "approved" || chapter.status === "rejected") && (
        <Card className={cn(
          "border-l-4",
          chapter.status === "approved" ? "border-l-emerald-600 bg-emerald-950/10" : "border-l-red-600 bg-red-950/10"
        )}>
          <p className={cn(
            "text-sm font-medium",
            chapter.status === "approved" ? "text-emerald-300" : "text-red-300"
          )}>
            This chapter has been {chapter.status}.
          </p>
          {chapter.supervisor_comment && (
            <p className="mt-2 text-sm text-stone-400">{chapter.supervisor_comment}</p>
          )}
        </Card>
      )}
    </div>
  );
}
