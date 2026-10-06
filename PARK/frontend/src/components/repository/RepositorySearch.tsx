/**
 * Public repository search — no auth required.
 * Mobile-first: large tap targets, minimal inputs, instant results.
 */
import { useState, useCallback, useEffect } from "react";
import { useRepository, RepositoryProject } from "@/hooks/useRepository";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { RepositoryProjectCard } from "./RepositoryProjectCard";
import { api } from "@/lib/api";

export function RepositorySearch() {
  const { searchResults, loading, error, search } = useRepository();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({
    academic_year: "",
    sort_by: "relevance",
  });
  const [academicYears, setAcademicYears] = useState<string[]>([]);

  useEffect(() => {
    api.get<{ academic_years: string[] }>("/v1/repository/academic-years")
      .then((response) => {
        if (response.data) setAcademicYears(response.data.academic_years);
      });
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      search({ q: query || undefined, ...filters });
    }, 300);
    return () => clearTimeout(timer);
  }, [query, filters, search]);

  return (
    <div className="space-y-4">
      {/* Search bar — thumb-reachable, single input */}
      <div className="sticky top-0 bg-stone-950 z-10 pb-2 pt-4">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search projects, topics, authors..."
          className="h-14 text-lg"
          autoFocus
        />
        <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
          <select
            value={filters.academic_year}
            onChange={(e) => setFilters(f => ({ ...f, academic_year: e.target.value }))}
            className="bg-stone-900/80 rounded-lg px-3 py-2 text-sm min-w-[120px]"
            style={{ color: "#e7e5e4", border: "1px solid #57534e" }}
          >
            <option value="">All Years</option>
            {academicYears.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
          <select
            value={filters.sort_by}
            onChange={(e) => setFilters(f => ({ ...f, sort_by: e.target.value }))}
            className="bg-stone-900/80 rounded-lg px-3 py-2 text-sm"
            style={{ color: "#e7e5e4", border: "1px solid #57534e" }}
          >
            <option value="relevance">Relevance</option>
            <option value="newest">Newest</option>
            <option value="most_viewed">Most Viewed</option>
          </select>
        </div>
      </div>

      {/* Results */}
      {loading && <div className="text-sage-500 text-center py-8">Searching...</div>}
      
      {error && (
        <div className="text-red-400 text-center py-8">
          {error === "OFFLINE" 
            ? "You're offline. Search will work when you reconnect." 
            : "Search failed. Please try again."}
        </div>
      )}

      {searchResults && (
        <div className="space-y-3">
          <div className="text-sm text-stone-400">
            {searchResults.total} result{searchResults.total !== 1 ? "s" : ""}
            {searchResults.query && ` for "${searchResults.query}"`}
          </div>
          {searchResults.items.map((project: RepositoryProject) => (
            <RepositoryProjectCard key={project.id} project={project} />
          ))}
          {/* Pagination */}
          {searchResults.total > searchResults.limit && (
            <div className="flex justify-center gap-2 py-4">
              <Button
                variant="secondary"
                disabled={searchResults.page === 1}
                onClick={() => search({ ...filters, q: query, page: searchResults.page - 1 })}
              >
                Previous
              </Button>
              <span className="self-center text-sm text-stone-400">
                Page {searchResults.page}
              </span>
              <Button
                variant="secondary"
                disabled={searchResults.page * searchResults.limit >= searchResults.total}
                onClick={() => search({ ...filters, q: query, page: searchResults.page + 1 })}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
