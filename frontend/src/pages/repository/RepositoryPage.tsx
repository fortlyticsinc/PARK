/**
 * PARK — Repository Search Page (Module 5) — PUBLIC route.
 */
import { RepositorySearch } from "@/components/repository/RepositorySearch";

export function RepositoryPage() {
  return (
    <div className="min-h-screen bg-stone-950 px-4 sm:px-6">
      <RepositorySearch />
    </div>
  );
}
