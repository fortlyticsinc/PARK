/**
 * Minimal project card for search results — thumb-tappable, scannable.
 */
import { Badge } from "@/components/ui/Badge";
import { RepositoryProject } from "@/hooks/useRepository";

interface Props {
  project: RepositoryProject;
}

export function RepositoryProjectCard({ project }: Props) {
  return (
    <a
      href={`/repository/${project.id}`}
      className="block bg-stone-900/80 rounded-xl p-4 active:bg-stone-900/80/80 transition-colors"
    >
      <h3 className="font-serif text-lg text-sage-500 leading-snug mb-1">
        {project.title}
      </h3>
      <p className="text-sm text-stone-400 mb-2">
        {project.student_name} · {project.academic_year}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {project.keywords?.map((kw: string) => (
          <Badge key={kw} variant="muted" className="text-xs">{kw}</Badge>
        ))}
      </div>
      <div className="flex gap-4 mt-3 text-xs text-stone-400">
        <span>{project.view_count} views</span>
        <span>{project.download_count} downloads</span>
      </div>
    </a>
  );
}
