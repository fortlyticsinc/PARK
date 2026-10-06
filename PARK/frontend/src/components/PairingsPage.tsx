
// frontend/src/pages/PairingsPage.tsx

import { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { usePairings } from "@/hooks/usePairings";
import { PairingCard } from "@/components/PairingCard";
import { PairingDetail } from "@/components/PairingDetail";
import { CreatePairingModal } from "@/components/CreatePairingModal";
import { BulkImportModal } from "@/components/BulkImportModal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Pagination } from "@/components/ui/Pagination";
import { cn } from "@/lib/utils";

export function PairingsPage() {
  const { user } = useAuthStore();
  const {
    pairings,
    isLoading,
    error,
    listPairings,
  } = usePairings();

  const [selectedPairingId, setSelectedPairingId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const canCreate = user?.role === "coordinator" || user?.role === "admin";
  const canBulkImport = user?.role === "coordinator" || user?.role === "admin";

  useEffect(() => {
    listPairings({
      page: currentPage,
      limit: 20,
      status: statusFilter === "all" ? undefined : statusFilter,
      search: searchQuery || undefined,
    });
  }, [currentPage, statusFilter, searchQuery]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      listPairings({
        page: 1,
        limit: 20,
        status: statusFilter === "all" ? undefined : statusFilter,
        search: searchQuery || undefined,
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  if (selectedPairingId) {
    return (
      <div className="p-4 sm:p-6">
        <PairingDetail
          pairingId={selectedPairingId}
          onBack={() => setSelectedPairingId(null)}
        />
      </div>
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
                Pairing Registry
              </h1>
              <p className="mt-0.5 text-xs text-stone-500">
                {user?.role === "student"
                  ? "Your supervisor-student pairings"
                  : user?.role === "supervisor"
                  ? "Students under your supervision"
                  : "All department pairings"}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              {canBulkImport && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsBulkImportOpen(true)}
                  className="hidden sm:inline-flex"
                >
                  <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Import CSV
                </Button>
              )}
              {canCreate && (
                <Button size="sm" onClick={() => setIsCreateOpen(true)}>
                  <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Pairing
                </Button>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <svg
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <Input
                placeholder="Search by name, matric, or project title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              options={[
                { value: "all", label: "All Statuses" },
                { value: "active", label: "Active" },
                { value: "completed", label: "Completed" },
                { value: "suspended", label: "Suspended" },
              ]}
              className="w-full sm:w-40"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4 sm:px-6">
        {/* Error State */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-900/50 bg-red-950/20 p-4 text-center">
            <p className="text-sm text-red-300">{error}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => listPairings({ page: currentPage, limit: 20 })}
              className="mt-2 text-red-400 hover:text-red-300"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Loading Skeleton */}
        {isLoading && !pairings && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-xl border border-stone-800/40 bg-stone-900/50"
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && pairings?.items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-stone-900">
              <svg className="h-8 w-8 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="font-serif text-lg text-stone-300">No pairings found</h3>
            <p className="mt-1 max-w-xs text-sm text-stone-500">
              {canCreate
                ? "Get started by creating your first supervisor-student pairing."
                : "You don't have any active pairings at the moment."}
            </p>
            {canCreate && (
              <Button onClick={() => setIsCreateOpen(true)} className="mt-4">
                Create Pairing
              </Button>
            )}
          </div>
        )}

        {/* Pairings List */}
        {pairings && pairings.items.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-stone-600">
              Showing {pairings.items.length} of {pairings.total} pairings
            </p>
            {pairings.items.map((pairing) => (
              <PairingCard
                key={pairing.id}
                pairing={pairing}
                userRole={user?.role || "student"}
                onClick={() => setSelectedPairingId(pairing.id)}
              />
            ))}
            {pairings.pages > 1 && (
              <Pagination
                currentPage={pairings.page}
                totalPages={pairings.pages}
                onPageChange={setCurrentPage}
              />
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <CreatePairingModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => {
          listPairings({ page: 1, limit: 20 });
        }}
      />
      <BulkImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        onSuccess={() => {
          listPairings({ page: 1, limit: 20 });
        }}
      />
    </div>
  );
}
