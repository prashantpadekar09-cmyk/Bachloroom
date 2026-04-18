import type { ReactNode } from "react";
import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import { Home, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

type DashboardShellProps = {
  children: ReactNode;
};

type DashboardHeroProps = {
  eyebrow?: string;
  title: string;
  description: string;
  badge?: string;
  actions?: ReactNode;
  className?: string;
  style?: CSSProperties;
};

type DashboardSurfaceProps = {
  children: ReactNode;
  className?: string;
};

type DashboardStatCardProps = {
  icon: LucideIcon;
  label: string;
  value: string | number;
  accent?: "blue" | "emerald" | "amber" | "indigo" | "rose";
  hint?: string;
};

type DashboardToastProps = {
  message: string;
  type?: "success" | "error" | "info";
};

const accentStyles = {
  blue: {
    iconWrap: "bg-amber-100 text-[#b48845]",
    pill: "bg-amber-50 text-[#b48845] border-amber-100",
  },
  emerald: {
    iconWrap: "bg-emerald-100 text-emerald-700",
    pill: "bg-emerald-50 text-emerald-700 border-emerald-100",
  },
  amber: {
    iconWrap: "bg-amber-100 text-amber-700",
    pill: "bg-amber-50 text-amber-700 border-amber-100",
  },
  indigo: {
    iconWrap: "bg-indigo-100 text-indigo-700",
    pill: "bg-indigo-50 text-indigo-700 border-indigo-100",
  },
  rose: {
    iconWrap: "bg-rose-100 text-rose-700",
    pill: "bg-rose-50 text-rose-700 border-rose-100",
  },
};

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mb-6 flex items-center justify-end">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-2xl border border-amber-200/40 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white shadow-sm backdrop-blur-md transition hover:bg-white/20"
        >
          <Home className="h-4 w-4" />
          Go Home
        </Link>
      </div>
      {children}
    </div>
  );
}

export function DashboardHero({
  eyebrow = "Workspace",
  title,
  description,
  badge,
  actions,
  className = "",
  style,
}: DashboardHeroProps) {
  return (
    <section
      className={`relative overflow-hidden rounded-[2rem] border border-amber-200/25 bg-[linear-gradient(135deg,#16120d_0%,#24190f_22%,#3a2919_54%,#f6ead6_140%)] p-6 text-white shadow-[0_35px_120px_-55px_rgba(36,25,15,0.88)] sm:p-8 ${className}`.trim()}
      style={style}
    >
      <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(255,248,235,0.2),transparent_55%)]" />
      <div className="absolute -left-10 top-0 h-40 w-40 rounded-full bg-amber-100/20 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-48 w-48 rounded-full bg-amber-300/20 blur-3xl" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/35 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.28em] text-amber-100 backdrop-blur-md">
            <Sparkles className="h-4 w-4 text-amber-300" />
            {eyebrow}
          </div>
          <h1 className="mt-5 text-3xl font-black tracking-tight text-white sm:text-4xl">{title}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-amber-50/82 sm:text-base">{description}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          {badge ? (
            <div className="inline-flex items-center rounded-full border border-amber-200/35 bg-white/10 px-4 py-2 text-sm font-semibold text-amber-50 shadow-sm backdrop-blur-md">
              {badge}
            </div>
          ) : null}
          {actions}
        </div>
      </div>
    </section>
  );
}

export function DashboardSurface({ children, className = "" }: DashboardSurfaceProps) {
  return (
    <section
      className={`rounded-[2rem] border border-amber-100/70 bg-[linear-gradient(180deg,rgba(255,253,248,0.96)_0%,rgba(250,245,237,0.94)_100%)] p-6 shadow-[0_30px_90px_-60px_rgba(36,25,15,0.32)] backdrop-blur-xl sm:p-7 ${className}`.trim()}
    >
      {children}
    </section>
  );
}

export function DashboardStatCard({
  icon: Icon,
  label,
  value,
  accent = "amber",
  hint,
}: DashboardStatCardProps) {
  const styles = accentStyles[accent];

  return (
    <div className="rounded-[1.75rem] border border-amber-100/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(249,244,235,0.94)_100%)] p-5 shadow-[0_24px_60px_-48px_rgba(36,25,15,0.34)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4">
        <div className={`rounded-2xl p-3 ${styles.iconWrap}`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] ${styles.pill}`}>
          {label}
        </span>
      </div>
      <div className="mt-5 text-3xl font-black tracking-tight text-slate-900">{value}</div>
      {hint ? <p className="mt-2 text-sm text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function DashboardToast({ message, type = "info" }: DashboardToastProps) {
  const palette =
    type === "success"
      ? "bg-emerald-600"
      : type === "error"
        ? "bg-rose-600"
        : "bg-[#8a6431]";

  return (
    <div className={`fixed right-4 top-4 z-50 rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-2xl ${palette}`}>
      {message}
    </div>
  );
}

export function DashboardLoading({ label = "Loading dashboard..." }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4 py-16">
      <div className="rounded-[2rem] border border-amber-100/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(249,244,235,0.94)_100%)] px-8 py-7 text-center shadow-[0_25px_80px_-50px_rgba(36,25,15,0.35)] backdrop-blur-xl">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-[3px] border-amber-100 border-t-amber-600" />
        <p className="text-sm font-semibold text-slate-600">{label}</p>
      </div>
    </div>
  );
}
