// frontend/src/components/certificate/CertificateView.tsx
/**
 * PARK — Certificate of Completion (visual)
 * ================================================
 * A standalone, printable HTML certificate — not a PDF file, just
 * well-structured HTML/CSS. That means: no extra PDF-rendering
 * dependency on the backend for the MVP, it always looks crisp at any
 * zoom level, and "download as PDF" is just the browser's native
 * Print → Save as PDF, styled via the @media print block below.
 *
 * The "PARK APPROVED" watermark is a large, rotated, low-opacity
 * text layer behind the content — the standard way real certificates
 * signal authenticity without obscuring the readable text in front.
 */
import { Certificate } from "@/hooks/useCertificate";

interface CertificateViewProps {
  certificate: Certificate;
}

export function CertificateView({ certificate }: CertificateViewProps) {
  const issuedDate = new Date(certificate.issued_at).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div
      id="certificate-print-area"
      className="relative mx-auto aspect-[1.414/1] w-full max-w-3xl overflow-hidden rounded-lg border-[3px] border-double border-emerald-700/60 bg-[#fdfbf6] p-6 text-stone-800 shadow-2xl sm:p-10"
    >
      {/* Watermark layer — sits behind everything, doesn't interfere
          with text selection or printing since it's just rotated text
          at low opacity, not an image. */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden select-none"
        aria-hidden="true"
      >
        <div
          className="whitespace-nowrap font-serif text-[clamp(3rem,12vw,7rem)] font-bold uppercase text-emerald-700/[0.12]"
          style={{ transform: "rotate(-28deg)" }}
        >
          PARK APPROVED &nbsp; PARK APPROVED
        </div>
        <div
          className="absolute whitespace-nowrap font-serif text-[clamp(2rem,8vw,5rem)] font-bold uppercase text-emerald-700/[0.08]"
          style={{ transform: "rotate(28deg)" }}
        >
          PARK CERTIFICATE
        </div>
      </div>

      {/* Corner ornaments — cheap way to make it read as "a certificate"
          rather than "a card with text on it" */}
      <div className="pointer-events-none absolute left-3 top-3 h-8 w-8 border-l-2 border-t-2 border-sage-600/40 sm:h-12 sm:w-12" />
      <div className="pointer-events-none absolute right-3 top-3 h-8 w-8 border-r-2 border-t-2 border-sage-600/40 sm:h-12 sm:w-12" />
      <div className="pointer-events-none absolute bottom-3 left-3 h-8 w-8 border-b-2 border-l-2 border-sage-600/40 sm:h-12 sm:w-12" />
      <div className="pointer-events-none absolute bottom-3 right-3 h-8 w-8 border-b-2 border-r-2 border-sage-600/40 sm:h-12 sm:w-12" />

      {/* Content layer */}
      <div className="relative flex h-full flex-col items-center justify-between text-center">
        <div>
          <p className="font-serif text-2xl font-semibold tracking-wide text-sage-800 sm:text-3xl">PARK</p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500 sm:text-xs">
            Project Approval and Resolution Kit
          </p>
        </div>

        <div className="my-4 flex flex-1 flex-col items-center justify-center gap-3 sm:my-6 sm:gap-4">
          <p className="text-[10px] uppercase tracking-[0.3em] text-stone-500 sm:text-xs">
            Certificate of Completion
          </p>

          <p className="text-xs text-stone-600 sm:text-sm">This is to certify that</p>

          <p className="font-serif text-2xl font-bold text-stone-900 sm:text-4xl">
            {certificate.student_name}
          </p>
          {certificate.student_matric && (
            <p className="-mt-2 text-xs text-stone-500 sm:text-sm">{certificate.student_matric}</p>
          )}

          <p className="max-w-lg text-xs leading-relaxed text-stone-600 sm:text-sm">
            has satisfactorily completed all required chapters of the final year project
            titled
          </p>

          <p className="max-w-xl font-serif text-base italic text-stone-800 sm:text-xl">
            "{certificate.project_title}"
          </p>

          <p className="max-w-lg text-xs leading-relaxed text-stone-600 sm:text-sm">
            under the supervision of <span className="font-semibold text-stone-800">{certificate.supervisor_name}</span>,
            {" "}for the {certificate.academic_year} academic session at
          </p>

          <p className="font-serif text-sm font-semibold text-sage-800 sm:text-lg">
            {certificate.department_name}, {certificate.institution_name}
          </p>
        </div>

        <div className="flex w-full items-end justify-between gap-4 border-t border-stone-300/70 pt-3 text-left sm:pt-4">
          <div>
            <p className="text-[10px] text-stone-500 sm:text-xs">Certificate No.</p>
            <p className="font-mono text-xs font-semibold text-stone-800 sm:text-sm">{certificate.certificate_number}</p>
          </div>
          <div className="text-center">
            <div className="mb-1 h-8 w-8 rounded-full border-2 border-sage-700/50 sm:h-10 sm:w-10" />
            <p className="text-[9px] text-stone-500 sm:text-[10px]">PARK Verified</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-stone-500 sm:text-xs">Issued</p>
            <p className="text-xs font-semibold text-stone-800 sm:text-sm">{issuedDate}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
