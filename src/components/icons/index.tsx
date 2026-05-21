export function StyleGlyph({ kind }: { kind: string }) {
  return (
    <span className={`style-art ${kind}`} aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

export function LogoConceptArt({ kind }: { kind: string }) {
  return (
    <span className={`logo-concept-art ${kind}`} aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
    </span>
  );
}

export function KitArt({ kind }: { kind: string }) {
  if (kind === "spark") {
    return <LogoConceptArt kind="spark" />;
  }

  return (
    <span className={`kit-art ${kind}`} aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
    </span>
  );
}

export function GradientRibbon({ variant }: { variant: "top" | "bottom" }) {
  return (
    <svg
      className={`ribbon ${variant}-ribbon`}
      viewBox="0 0 720 220"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`fluid-ribbon-${variant}`} x1="0" x2="1" y1="0.45" y2="0.55">
          <stop offset="0" stopColor="#31d5b5" />
          <stop offset="0.34" stopColor="#83caff" />
          <stop offset="0.63" stopColor="#f597c8" />
          <stop offset="1" stopColor="#ff8d28" />
        </linearGradient>
      </defs>
      <path
        d="M-18 152C71 157 108 113 156 65C225 -5 317 2 393 55C477 114 535 155 613 129C666 112 699 74 739 30V106C695 158 654 191 590 199C510 210 443 170 374 124C309 81 250 87 197 139C138 197 83 218 -18 202V152Z"
        fill={`url(#fluid-ribbon-${variant})`}
      />
    </svg>
  );
}

export function SidebarWave() {
  return (
    <svg
      className="sidebar-wave"
      viewBox="0 0 260 228"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sidebar-wave-gradient" x1="0" x2="1" y1="0.75" y2="0.08">
          <stop offset="0" stopColor="#33d7a4" />
          <stop offset="0.48" stopColor="#4fd6de" />
          <stop offset="1" stopColor="#a5d5ff" />
        </linearGradient>
      </defs>
      <path
        d="M-22 120C42 132 96 107 136 59C171 18 210 4 282 -2V102C239 105 216 129 188 164C144 220 87 239 -23 212V120Z"
        fill="url(#sidebar-wave-gradient)"
        opacity="0.88"
      />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg className="close-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6.5 6.5L17.5 17.5M17.5 6.5L6.5 17.5" />
    </svg>
  );
}

export function CloseSmallIcon() {
  return (
    <svg className="chip-x" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M4.5 4.5L11.5 11.5M11.5 4.5L4.5 11.5" />
    </svg>
  );
}

export function PlusIcon() {
  return (
    <svg className="plus-icon" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M10 4.25V15.75M4.25 10H15.75" />
    </svg>
  );
}

export function ArrowRightIcon() {
  return (
    <svg className="arrow-icon" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4.25 10H15.25M11.25 5.75L15.5 10L11.25 14.25" />
    </svg>
  );
}

export function ArrowLeftIcon() {
  return (
    <svg className="arrow-icon" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M15.75 10H4.75M8.75 5.75L4.5 10L8.75 14.25" />
    </svg>
  );
}

export function SparkleIcon() {
  return (
    <svg className="sparkle-icon" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M10 2.8L11.65 7.65L16.5 9.3L11.65 10.95L10 15.8L8.35 10.95L3.5 9.3L8.35 7.65L10 2.8Z" />
      <path d="M15.2 2.7L15.9 4.6L17.8 5.3L15.9 6L15.2 7.9L14.5 6L12.6 5.3L14.5 4.6L15.2 2.7Z" />
    </svg>
  );
}

export function ChevronDownIcon() {
  return (
    <svg className="chevron-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 9.5L12 14.5L17 9.5" />
    </svg>
  );
}

export function HeartIcon() {
  return (
    <svg className="heart-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 20.2C8.1 16.8 5.4 14.2 4.35 11.75C3.4 9.5 4.15 6.9 6.45 5.95C8.2 5.2 10.15 5.8 11.25 7.2L12 8.15L12.75 7.2C13.85 5.8 15.8 5.2 17.55 5.95C19.85 6.9 20.6 9.5 19.65 11.75C18.6 14.2 15.9 16.8 12 20.2Z" />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg className="check-icon" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M5.4 10.25L8.35 13.05L14.6 6.95" />
    </svg>
  );
}

export function RefreshIcon() {
  return (
    <svg className="refresh-icon" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M15.3 6.45A6 6 0 0 0 4.7 8.7M15.3 6.45V3.6M15.3 6.45H12.45M4.7 13.55A6 6 0 0 0 15.3 11.3M4.7 13.55V16.4M4.7 13.55H7.55" />
    </svg>
  );
}

export function EditIcon() {
  return (
    <svg className="tool-icon" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4.4 14.95L5.2 11.55L12.85 3.9C13.45 3.3 14.4 3.3 15 3.9L16.1 5C16.7 5.6 16.7 6.55 16.1 7.15L8.45 14.8L5.05 15.6C4.65 15.7 4.3 15.35 4.4 14.95Z" />
      <path d="M11.8 4.95L15.05 8.2" />
    </svg>
  );
}

export function EyeIcon() {
  return (
    <svg className="tool-icon" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M2.75 10C4.6 6.95 7.05 5.45 10 5.45C12.95 5.45 15.4 6.95 17.25 10C15.4 13.05 12.95 14.55 10 14.55C7.05 14.55 4.6 13.05 2.75 10Z" />
      <path d="M8.15 10A1.85 1.85 0 1 0 11.85 10A1.85 1.85 0 0 0 8.15 10Z" />
    </svg>
  );
}

export function DownloadIcon() {
  return (
    <svg className="tool-icon" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M10 3.4V12.2M6.45 8.95L10 12.5L13.55 8.95" />
      <path d="M4.25 15.8H15.75" />
    </svg>
  );
}

export function TeamIcon() {
  return (
    <svg className="tool-icon" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M7.4 9.35A2.55 2.55 0 1 0 7.4 4.25A2.55 2.55 0 0 0 7.4 9.35Z" />
      <path d="M2.85 16C3.25 13.6 4.9 12.25 7.4 12.25C9.9 12.25 11.55 13.6 11.95 16" />
      <path d="M13.3 9.15A2.15 2.15 0 1 0 13.3 4.85" />
      <path d="M12.85 12.35C15.2 12.45 16.6 13.7 17 15.8" />
    </svg>
  );
}

export function ClipboardIcon() {
  return (
    <svg className="tool-icon" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M6.4 5.25H5.35C4.6 5.25 4 5.85 4 6.6V15.15C4 15.9 4.6 16.5 5.35 16.5H14.65C15.4 16.5 16 15.9 16 15.15V6.6C16 5.85 15.4 5.25 14.65 5.25H13.6" />
      <path d="M7 6.5H13V4.75C13 4.05 12.45 3.5 11.75 3.5H8.25C7.55 3.5 7 4.05 7 4.75V6.5Z" />
    </svg>
  );
}

export function HomeIcon() {
  return (
    <svg className="icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M3.7 9.25L10 4.2L16.3 9.25V16H12.2V11.9H7.8V16H3.7V9.25Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function GridIcon() {
  return (
    <svg className="icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="4.6" height="4.6" rx="1" stroke="currentColor" />
      <rect x="11.4" y="4" width="4.6" height="4.6" rx="1" stroke="currentColor" />
      <rect x="4" y="11.4" width="4.6" height="4.6" rx="1" stroke="currentColor" />
      <rect x="11.4" y="11.4" width="4.6" height="4.6" rx="1" stroke="currentColor" />
    </svg>
  );
}

export function StackIcon() {
  return (
    <svg className="icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 3.8L16 7L10 10.2L4 7L10 3.8Z" stroke="currentColor" strokeLinejoin="round" />
      <path
        d="M4 10L10 13.2L16 10M4 13L10 16.2L16 13"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TemplateIcon() {
  return (
    <svg className="icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="4" y="3.8" width="12" height="12.4" rx="2" stroke="currentColor" />
      <path d="M7.2 7H10.4M7.2 10H12.8M7.2 13H10.4" stroke="currentColor" strokeLinecap="round" />
      <path
        d="M13.2 6.7L15.2 8.7L13.2 10.7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function GuideIcon() {
  return (
    <svg className="icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="3.4" height="12" rx="1" stroke="currentColor" />
      <rect x="8.3" y="4" width="3.4" height="12" rx="1" stroke="currentColor" />
      <rect x="12.6" y="4" width="3.4" height="12" rx="1" stroke="currentColor" />
    </svg>
  );
}

export function GearIcon() {
  return (
    <svg className="icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 12.75A2.75 2.75 0 1 0 10 7.25A2.75 2.75 0 0 0 10 12.75Z" stroke="currentColor" />
      <path
        d="M10 3.5L11.05 5.3L13.1 5.6L13.85 7.45L12.55 9.05L12.55 10.95L13.85 12.55L13.1 14.4L11.05 14.7L10 16.5L8.95 14.7L6.9 14.4L6.15 12.55L7.45 10.95L7.45 9.05L6.15 7.45L6.9 5.6L8.95 5.3L10 3.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
      />
    </svg>
  );
}
