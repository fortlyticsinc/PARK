import { Link } from "react-router-dom";

type LegalSection = { title: string; paragraphs: string[]; bullets?: string[] };

function LegalPage({ title, intro, sections }: { title: string; intro: string; sections: LegalSection[] }) {
  return (
    <main className="min-h-screen bg-stone-950 px-4 py-8 text-stone-200 sm:px-6 sm:py-12">
      <article className="mx-auto max-w-3xl">
        <header className="mb-10 border-b border-stone-800 pb-7">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-sage-400 hover:text-sage-300">
            <span aria-hidden="true">←</span> PARK
          </Link>
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.16em] text-sage-500">Project Approval and Resolution Kit</p>
          <h1 className="mt-2 font-serif text-4xl text-stone-100">{title}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-400">{intro}</p>
          <p className="mt-4 text-xs text-stone-500">Effective October 6, 2026</p>
        </header>

        <div className="space-y-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="font-serif text-xl text-stone-100">{section.title}</h2>
              {section.paragraphs.map((paragraph) => <p key={paragraph} className="mt-3 text-sm leading-7 text-stone-400">{paragraph}</p>)}
              {section.bullets && <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-stone-400">{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}
            </section>
          ))}
        </div>

        <footer className="mt-12 border-t border-stone-800 pt-6 text-sm text-stone-400">
          Questions? Contact <a className="text-sage-400 hover:underline" href="mailto:hello@park.edu.ng">hello@park.edu.ng</a> or your institution administrator.
        </footer>
      </article>
    </main>
  );
}

export function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy notice"
      intro="This notice explains what PARK handles when students and academic staff use the platform to coordinate projects, review work, and maintain academic records. Your institution may also have privacy requirements that apply to your use."
      sections={[
        {
          title: "Information in PARK",
          paragraphs: ["PARK processes information needed to operate academic supervision and departmental workflows. The information depends on the features you use and what your institution provides."],
          bullets: ["Account and profile details such as name, email address, role, institution, department, and student number.", "Academic records such as student-supervisor pairings, project titles, chapter submissions, review status, comments, meetings, messages, and certificate applications.", "Files and project details submitted to the repository, including final project copies where provided.", "Technical and security information associated with sign-in, requests, and service operation."],
        },
        {
          title: "How information is used",
          paragraphs: ["PARK uses this information to authenticate accounts, display the correct role-specific workspace, coordinate supervision, store and review academic work, support institutional oversight, issue and verify completion certificates, and protect the service from misuse."],
        },
        {
          title: "Service providers",
          paragraphs: ["PARK relies on hosted services to operate. Supabase provides authentication and database services; Cloudinary stores uploaded documents; and Brevo sends transactional account and service emails. Those providers process information as needed to provide their services."],
        },
        {
          title: "Who can see academic records",
          paragraphs: ["Access within PARK depends on the user's role and academic relationship. Administrators and coordinators may have institution or department oversight; supervisors and students see records relevant to their assigned work. Published repository entries and public certificate-verification pages are available to visitors, so do not submit material for publication unless it is intended to be shared that way."],
        },
        {
          title: "Retention and requests",
          paragraphs: ["Academic records may be retained by PARK or your institution for administration, review, audit, and certificate verification. Retention periods depend on institutional requirements and deployment configuration. For access, correction, or deletion requests, contact your institution administrator or email PARK at hello@park.edu.ng with enough information to identify the account; do not send passwords."],
        },
        {
          title: "Updates and contact",
          paragraphs: ["This notice may change as PARK's features and institutional deployments change. The current version is published on this page. Questions can be sent to hello@park.edu.ng."],
        },
      ]}
    />
  );
}

export function TermsPage() {
  return (
    <LegalPage
      title="Terms of use"
      intro="These terms describe responsible use of PARK, an academic coordination platform for students, supervisors, coordinators, and administrators. Your institution's academic policies continue to apply alongside these terms."
      sections={[
        {
          title: "Accounts and access",
          paragraphs: ["Provide accurate account details, keep your sign-in credentials private, and use only the access assigned to you. Student self-registration is for student accounts; staff roles are provisioned by authorized institutional users. Access may be restricted or deactivated by the institution or PARK when required for security or administration."],
        },
        {
          title: "Academic work and conduct",
          paragraphs: ["Use PARK for legitimate academic coordination. You are responsible for having the right to upload and share submitted documents and for following your institution's academic-integrity, confidentiality, and research rules."],
          bullets: ["Do not upload unlawful, malicious, misleading, or unauthorized material.", "Do not access another user's account or records without permission.", "Do not misuse messages, comments, meetings, pairing records, or platform resources."],
        },
        {
          title: "Institutional decisions and published material",
          paragraphs: ["Institutions and their authorized staff manage roles, departments, supervision relationships, review outcomes, and academic records. PARK provides workflow and record-keeping tools; it does not replace institutional academic judgment or guarantee a project outcome. Repository entries marked as published and certificate-verification information may be publicly accessible."],
        },
        {
          title: "Files and platform operation",
          paragraphs: ["You retain responsibility for the content you submit and authorize PARK and its configured service providers to store, process, display, and transmit that content as needed to provide the requested academic workflows. Use the file formats and size limits presented in the application. PARK may change, suspend, or maintain features to protect the service or support institutional deployments."],
        },
        {
          title: "Availability and updates",
          paragraphs: ["PARK is provided as an operational platform and may be updated, unavailable, or changed during maintenance or service incidents. These terms may be revised as the product evolves; continued use after an update means the current version applies, subject to your institution's policies."],
        },
        {
          title: "Contact",
          paragraphs: ["For questions about these terms, email hello@park.edu.ng or contact your institution administrator."],
        },
      ]}
    />
  );
}