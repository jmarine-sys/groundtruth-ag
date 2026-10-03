// Íconos SVG propios: sin dependencias, heredan el color del texto.

type IconProps = { className?: string };

export function LogoMark({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" fill="#2f7a3b" />
      <path d="M8 22c6 0 10-4 10-12-6 0-10 4-10 12z" fill="#d6ecd6" />
      <circle cx="21.5" cy="20.5" r="4.5" fill="none" stroke="#f3e6c8" strokeWidth="2" />
      <path d="M21.5 14v2.5M21.5 24.5V27M15 20.5h2.5M25.5 20.5H28" stroke="#f3e6c8" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function Base({ className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "h-5 w-5"}
      aria-hidden
    >
      {children}
    </svg>
  );
}

export const IconSprout = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 21v-9" />
    <path d="M12 12C12 7 9 4 4 4c0 5 3 8 8 8z" />
    <path d="M12 14c0-4 3-7 8-7 0 4-3 7-8 7z" />
  </Base>
);

export const IconBuilding = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 21V8l8-5 8 5v13" />
    <path d="M9 21v-6h6v6M3 21h18" />
  </Base>
);

export const IconWallet = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="6" width="18" height="13" rx="2.5" />
    <path d="M16 12.5h2M3 9.5h18" />
  </Base>
);

export const IconDrop = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" />
  </Base>
);

export const IconSun = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Base>
);

export const IconUsers = (p: IconProps) => (
  <Base {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20c.7-3.5 3.3-5.5 6.5-5.5s5.8 2 6.5 5.5" />
    <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c2 .7 3.2 2.5 3.6 5.2" />
  </Base>
);

export const IconAlert = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3 2 20h20L12 3z" />
    <path d="M12 10v4M12 17h.01" />
  </Base>
);

export const IconCheck = (p: IconProps) => (
  <Base {...p}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </Base>
);

export const IconExternal = (p: IconProps) => (
  <Base {...p}>
    <path d="M14 4h6v6M20 4l-9 9" />
    <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </Base>
);

export const IconClock = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Base>
);

export const IconShield = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6l-8-3z" />
    <path d="m9 12 2 2 4-4" />
  </Base>
);

export const IconNotEqual = (p: IconProps) => (
  <Base {...p}>
    <path d="M5 9h14M5 15h14M16 4 8 20" />
  </Base>
);

export const IconEqual = (p: IconProps) => (
  <Base {...p}>
    <path d="M5 9h14M5 15h14" />
  </Base>
);

export const IconArrowRight = (p: IconProps) => (
  <Base {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Base>
);

export const IconRefresh = (p: IconProps) => (
  <Base {...p}>
    <path d="M20 11a8 8 0 0 0-14.3-4.9L4 8" />
    <path d="M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16" />
    <path d="M20 20v-4h-4" />
  </Base>
);
