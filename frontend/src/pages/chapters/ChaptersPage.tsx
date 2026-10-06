import { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useChapters } from "@/hooks/useChapters";
import { ChapterCard } from "@/components/chapters/ChapterCard";
import { ChapterUpload } from "@/components/chapters/ChapterUpload";
import { ChapterReview } from "@/components/chapters/ChapterReview";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { usePairings } from "@/hooks/usePairings";
import { cn } from "@/lib/utils";

export function ChaptersPage() {
  const { user } = useAuthStore();
  const { chapters, currentChapter, isLoading, error, listChapters, getChapter } = useChapters();
  const { pairings, listPairings } = usePairings();

  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedPairingId, setSelectedPairingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");

  const isStudent = user?.role === "student";
  const isSupervisor = user?.role === "supervisor";

  useEffect(() => {
    listChapters({
      page: currentPage,
      limit: 20,
      status: statusFilter === "all" ? undefined : statusFilter,
    });
  }, [currentPage, statusFilter]);

  useEffect(() => {
    if (!isSupervisor) return;
    const refresh = window.setInterval(() => {
      listChapters({
        page: currentPage,
        limit: 20,
        status: statusFilter === "all" ? undefined : statusFilter,
      });
    }, 5000);
    return () => window.clearInterval(refresh);
  }, [isSupervisor, currentPage, statusFilter, listChapters]);

  useEffect(() => {
    if (isStudent) {
      listPairings({ page: 1, limit: 100 });
    }
  }, [isStudent]);

  useEffect(() => {
    if (selectedChapterId) {
      getChapter(selectedChapterId);
    }
  }, [selectedChapterId]);

  // Supervisor dashboard: "who needs me" — pending reviews first
  const pendingChapters = chapters?.items.filter(
    (c) => c.status === "submitted" || c.status === "resubmitted"
  ) || [];

  if (selectedChapterId && currentChapter) {
    return (
      <>
        <div className="p-4 sm:p-6 max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-5">
            <Button variant="ghost" size="sm" onClick={() => setSelectedChapterId(null)}>
              <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </Button>
          </div>

          {isSupervisor ? (
            <ChapterReview
              chapter={currentChapter}
              onReviewed={() => {
                setSelectedChapterId(null);
                listChapters({ page: 1 });
              }}
            />
          ) : (
            <div className="space-y-5">
            <div className="rounded-xl border border-stone-800 bg-stone-900/80 p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-serif text-xl text-stone-100">
                  Chapter {currentChapter.chapter_number}
                </h2>
                <span className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium",
                  currentChapter.status === "approved" ? "bg-emerald-900/40 text-emerald-300" :
                  currentChapter.status === "revision_requested" ? "bg-sage-900/40 text-sage-300" :
                  "bg-stone-800 text-stone-400"
                )}>
                  {currentChapter.status.replace("_", " ")}
                </span>
              </div>
              <p className="text-sm text-stone-400 mb-4">{currentChapter.title || "No title"}</p>

              {currentChapter.supervisor_comment && (
                <div className="rounded-lg bg-stone-800/50 p-4 mb-4">
                  <p className="text-xs font-medium text-sage-500 mb-1">Supervisor Feedback</p>
                  <p className="text-sm text-stone-300">{currentChapter.supervisor_comment}</p>
                </div>
              )}

              <a
                href={currentChapter.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-stone-800 px-4 py-2.5 text-sm text-stone-300 transition-colors hover:bg-stone-700"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                View Document
              </a>

              {(currentChapter.status === "revision_requested" || currentChapter.status === "rejected") && (
                <Button
                  onClick={() => setIsUploadOpen(true)}
                  className="ml-3"
                >
                  Resubmit Chapter
                </Button>
              )}
            </div>
            </div>
          )}
        </div>
        <Modal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          title="Resubmit Chapter"
          size="md"
        >
          <ChapterUpload
            pairingId={currentChapter.pairing_id}
            isResubmit
            previousChapterId={currentChapter.id}
            onSuccess={() => {
              setIsUploadOpen(false);
              setSelectedChapterId(null);
              listChapters({ page: 1 });
            }}
            onCancel={() => setIsUploadOpen(false)}
          />
        </Modal>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-stone-800 bg-stone-950/95 backdrop-blur-md">
        <div className="px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="font-serif text-xl text-stone-100 sm:text-2xl">
                {isSupervisor ? "Review Queue" : "My Chapters"}
              </h1>
              <p className="mt-0.5 text-xs text-stone-500">
                {isSupervisor
                  ? `${pendingChapters.length} pending review${pendingChapters.length !== 1 ? "s" : ""}`
                  : "Track your chapter submissions and feedback"}
              </p>
            </div>
            {isStudent && (
              <Button size="sm" onClick={() => setIsUploadOpen(true)}>
                <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Submit Chapter
              </Button>
            )}
          </div>

          {/* Status Filter */}
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
            {["all", "submitted", "under_review", "revision_requested", "rejected", "approved"].map((status) => (
              <button
                key={status}
                onClick={() => { setStatusFilter(status); setCurrentPage(1); }}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  statusFilter === status
                    ? "bg-sage-600 text-white"
                    : "bg-stone-800 text-stone-400 hover:bg-stone-700"
                )}
              >
                {status === "all" ? "All" : status.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4 sm:px-6">
        {/* Supervisor Priority Queue */}
        {isSupervisor && pendingChapters.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-sage-500">
              Needs Your Review
            </h2>
            <div className="space-y-3">
              {pendingChapters.map((chapter) => (
                <ChapterCard
                  key={chapter.id}
                  chapter={chapter}
                  showStudent
                  onClick={() => setSelectedChapterId(chapter.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-900/50 bg-red-950/20 p-4 text-center">
            <p className="text-sm text-red-300">{error}</p>
            <Button variant="ghost" size="sm" onClick={() => listChapters({ page: 1 })} className="mt-2">
              Retry
            </Button>
          </div>
        )}

        {/* Loading */}
        {isLoading && !chapters && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-stone-900/50" />
            ))}
          </div>
        )}

        {/* Empty */}
        {!isLoading && chapters?.items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-stone-900">
              <svg className="h-8 w-8 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="font-serif text-lg text-stone-300">
              {isSupervisor ? "No chapters to review" : "No chapters submitted yet"}
            </h3>
            <p className="mt-1 max-w-xs text-sm text-stone-500">
              {isSupervisor
                ? "When students submit chapters, they will appear here."
                : "Submit your first chapter to get started."}
            </p>
            {isStudent && (
              <Button onClick={() => setIsUploadOpen(true)} className="mt-4">
                Submit Chapter
              </Button>
            )}
          </div>
        )}

        {/* List */}
        {chapters && chapters.items.length > 0 && (
          <div className="space-y-3">
            {isSupervisor && <h2 className="text-xs font-medium uppercase tracking-wide text-stone-600">All Chapters</h2>}
            {chapters.items.map((chapter) => (
              <ChapterCard
                key={chapter.id}
                chapter={chapter}
                showStudent={isSupervisor}
                onClick={() => setSelectedChapterId(chapter.id)}
              />
            ))}
            {chapters.pages > 1 && (
              <Pagination
                currentPage={chapters.page}
                totalPages={chapters.pages}
                onPageChange={setCurrentPage}
              />
            )}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <Modal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        title={selectedChapterId ? "Resubmit Chapter" : "Submit New Chapter"}
        size="md"
      >
        {isStudent && pairings?.items && pairings.items.length > 0 ? (
          <ChapterUpload
            pairingId={selectedPairingId || pairings.items[0].id}
            onSuccess={() => {
              setIsUploadOpen(false);
              listChapters({ page: 1 });
            }}
            onCancel={() => setIsUploadOpen(false)}
            isResubmit={!!selectedChapterId}
            previousChapterId={selectedChapterId || undefined}
          />
        ) : (
          <div className="text-center py-8">
            <p className="text-stone-500">No active pairing found.</p>
            <p className="text-xs text-stone-600 mt-1">
              You need an active supervisor-student pairing to submit chapters.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
