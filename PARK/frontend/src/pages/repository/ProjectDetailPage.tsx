/**
 * PARK — Project Detail Page — also PUBLIC (abstract always visible,
 * download itself requires login, matching SPEC.md).
 */
import { ProjectDetail } from "@/components/repository/ProjectDetail";

export function ProjectDetailPage() {
  return (
    <div className="min-h-screen bg-stone-950 px-4 py-6 sm:px-6">
      <ProjectDetail />
    </div>
  );
}
