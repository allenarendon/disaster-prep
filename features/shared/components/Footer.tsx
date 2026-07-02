import { FlagStripe } from "@/features/shared/components/FlagStripe";

const OFFICIAL_SOURCES = [
  { label: "PAGASA", href: "https://www.pagasa.dost.gov.ph/" },
  { label: "PHIVOLCS", href: "https://www.phivolcs.dost.gov.ph/" },
] as const;

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-ph-blue/10 bg-white">
      <FlagStripe />
      <div className="mx-auto max-w-2xl space-y-3 px-4 py-6 text-xs text-slate-600 sm:text-sm">
        <p>
          This app provides informational guidance only. It is not a substitute
          for official emergency services. In an emergency, call{" "}
          <strong className="font-semibold text-slate-800">911</strong> or
          contact your local DRRM office.
        </p>
        <p>
          Official hazard bulletins:{" "}
          {OFFICIAL_SOURCES.map((source, index) => (
            <span key={source.href}>
              {index > 0 && " · "}
              <a
                href={source.href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-ph-blue underline-offset-2 hover:underline"
              >
                {source.label}
              </a>
            </span>
          ))}
        </p>
        <p className="text-slate-500">
          © {year} PH Disaster Preparedness Guide
        </p>
      </div>
    </footer>
  );
}
