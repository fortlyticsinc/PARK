/**
 * Full project detail with abstract, metadata, and chapter download.
 * Signed download URL expires in 15 min — we fetch it on-demand.
 */
import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useRepository } from "@/hooks/useRepository";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const { projectDetail, loading, error, getProject, getDownloadUrl } = useRepository();
  const [downloadLoading, setDownloadLoading] = useState(false);
  const viewedProjectId = useRef<string | null>(null);

  useEffect(() => {
    if (projectId && viewedProjectId.current !== projectId) {
      viewedProjectId.current = projectId;
      getProject(projectId);
    }
  }, [projectId, getProject]);

  if (loading) return <div className="text-center py-12 text-sage-500">Loading...</div>;
  if (error || !projectDetail) return <div className="text-center py-12 text-red-400">Project not found.</div>;

  const handleDownload = async () => {
    setDownloadLoading(true);
    try {
      const { download_url } = await getDownloadUrl(projectDetail.id);
      window.open(download_url, "_blank");
    } finally {
      setDownloadLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl text-sage-500 leading-tight mb-2">
          {projectDetail.title}
        </h1>
        <p className="text-stone-400">
          {projectDetail.student_name} ({projectDetail.student_matric}) · {projectDetail.academic_year}
        </p>
        <p className="text-sm text-stone-400 mt-1">
          Supervisor: {projectDetail.supervisor_name}
        </p>
      </div>

      {/* Abstract */}
      {projectDetail.abstract && (
        <div className="bg-stone-900/80 rounded-xl p-4">
          <h2 className="text-sm font-medium text-sage-500 mb-2">Abstract</h2>
          <p className="text-sm leading-relaxed text-stone-400/90">{projectDetail.abstract}</p>
        </div>
      )}

      {/* Keywords */}
      {projectDetail.keywords && (
        <div className="flex flex-wrap gap-2">
          {projectDetail.keywords.map((kw: string) => (
            <Badge key={kw} variant="warning">{kw}</Badge>
          ))}
        </div>
      )}

      {/* Final copy download only */}
      <div className="bg-stone-900/80 rounded-xl p-4">
        <h2 className="text-sm font-medium text-sage-500 mb-2">Complete final project copy</h2>
        <p className="mb-3 text-xs text-stone-400">Individual chapter files are not available from the public repository.</p>
        <Button variant="secondary" className="w-full justify-between" onClick={handleDownload} disabled={downloadLoading || !projectDetail.final_copy_url}>
          <span>{projectDetail.final_copy_url ? "Download final copy" : "Final copy unavailable"}</span>
          <span className="text-xs text-stone-400">{downloadLoading ? "Preparing..." : projectDetail.final_copy_url ? "Download" : "Pending"}</span>
        </Button>
      </div>

      {/* Stats */}
      <div className="text-xs text-stone-400 text-center">
        {projectDetail.view_count} views · {projectDetail.download_count} downloads
      </div>
    </div>
  );
}
