type BrandLogoProps = {
  className?: string;
  markClassName?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  showWordmark?: boolean;
  subtitle?: string;
  showBackdrop?: boolean;
};

export default function BrandLogo({
  className = "",
  markClassName = "",
  titleClassName = "",
  subtitleClassName = "",
  showWordmark = true,
  subtitle = "Luxury room discovery",
  showBackdrop = false,
}: BrandLogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`.trim()}>
      <div
        className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[1.35rem] bg-[linear-gradient(145deg,#16120d_0%,#3b2918_42%,#8a6431_100%)] shadow-[0_18px_40px_-18px_rgba(54,36,17,0.55)] ${markClassName}`.trim()}
      >
        <svg
          viewBox="0 0 64 64"
          aria-hidden="true"
          className="h-8 w-8"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M32 6L50 16.5V35C50 46.1 42.6 55.9 32 58C21.4 55.9 14 46.1 14 35V16.5L32 6Z"
            fill="url(#brand-fill)"
            stroke="url(#brand-stroke)"
            strokeWidth="2"
          />
          <path
            d="M23 33.5L32 25L41 33.5"
            stroke="#F9E7C7"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M26 31.5V41.5C26 42.0523 26.4477 42.5 27 42.5H37C37.5523 42.5 38 42.0523 38 41.5V31.5"
            stroke="#FFF7E8"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M32 35.5V42.5"
            stroke="#D7A75B"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          <circle cx="32" cy="22" r="2.5" fill="#F0C987" />
          <defs>
            <linearGradient id="brand-fill" x1="14" y1="8" x2="54" y2="56" gradientUnits="userSpaceOnUse">
              <stop stopColor="#8A6431" />
              <stop offset="0.45" stopColor="#F0C987" />
              <stop offset="1" stopColor="#FFF1DA" />
            </linearGradient>
            <linearGradient id="brand-stroke" x1="18" y1="9" x2="47" y2="54" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FFF1DA" />
              <stop offset="1" stopColor="#B38144" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      {showWordmark ? (
        <div
          className={`min-w-0 ${showBackdrop ? "relative overflow-hidden rounded-[1.25rem] border border-amber-100/80 bg-[linear-gradient(135deg,rgba(255,253,249,0.96)_0%,rgba(247,239,228,0.96)_100%)] px-3 py-2.5 shadow-[0_14px_40px_-28px_rgba(36,25,15,0.28)]" : ""}`.trim()}
        >
          {showBackdrop ? (
            <>
              <div className="pointer-events-none absolute inset-y-0 right-0 w-28 bg-[radial-gradient(circle_at_top_right,rgba(240,201,135,0.22),transparent_72%)]" />
              <svg
                viewBox="0 0 180 64"
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-11 w-full opacity-30"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g fill="#C79956">
                  <path d="M0 64V40h16v24H0Z" />
                  <path d="M18 64V30h18v34H18Z" />
                  <path d="M40 64V36h12v28H40Z" />
                  <path d="M56 64V18h24v46H56Z" />
                  <path d="M84 64V26h16v38H84Z" />
                  <path d="M104 64V22h20v42h-20Z" />
                  <path d="M128 64V34h14v30h-14Z" />
                  <path d="M146 64V28h16v36h-16Z" />
                  <path d="M166 64V42h14v22h-14Z" />
                </g>
                <g fill="#F8E3BF" opacity="0.8">
                  <rect x="22" y="34" width="3" height="4" rx="1" />
                  <rect x="28" y="34" width="3" height="4" rx="1" />
                  <rect x="22" y="41" width="3" height="4" rx="1" />
                  <rect x="28" y="41" width="3" height="4" rx="1" />
                  <rect x="61" y="24" width="4" height="5" rx="1" />
                  <rect x="69" y="24" width="4" height="5" rx="1" />
                  <rect x="61" y="32" width="4" height="5" rx="1" />
                  <rect x="69" y="32" width="4" height="5" rx="1" />
                  <rect x="88" y="31" width="3" height="4" rx="1" />
                  <rect x="94" y="31" width="3" height="4" rx="1" />
                  <rect x="109" y="27" width="3" height="4" rx="1" />
                  <rect x="115" y="27" width="3" height="4" rx="1" />
                  <rect x="150" y="33" width="3" height="4" rx="1" />
                  <rect x="150" y="40" width="3" height="4" rx="1" />
                </g>
                <path d="M0 54H180" stroke="#8A6431" strokeOpacity="0.42" strokeWidth="2" />
                <path d="M57 18L68 12L79 18" stroke="#E8C48A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M108 22L114 16L120 22" stroke="#E8C48A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </>
          ) : null}
          <div className="relative min-w-0">
            <p
              className={`truncate text-xs font-black uppercase tracking-[0.22em] text-[#1e140d] sm:text-sm sm:tracking-[0.28em] ${titleClassName}`.trim()}
            >
              Bachloroom
            </p>
            {subtitle ? (
              <p
                className={`truncate text-xs font-medium text-[#7a6553] ${subtitleClassName}`.trim()}
              >
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
