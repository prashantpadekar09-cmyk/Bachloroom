import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Sparkles } from "lucide-react";

type DashboardShellProps = {
  children: ReactNode;
};

type DashboardHeroProps = {
  eyebrow?: string;
  title: string;
  description: string;
  badge?: string;
  actions?: ReactNode;
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
    iconWrap: "bg-blue-100 text-blue-700",
    pill: "bg-blue-50 text-blue-700 border-blue-100",
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
  return <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>;
}

export function DashboardHero({
  eyebrow = "Workspace",
  title,
  description,
  badge,
  actions,
}: DashboardHeroProps) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(135deg,#eff6ff_0%,#dbeafe_24%,#bfdbfe_55%,#f8fafc_100%)] p-6 shadow-[0_35px_120px_-55px_rgba(37,99,235,0.55)] sm:p-8">
      <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.72),transparent_55%)]" />
      <div className="absolute -left-10 top-0 h-40 w-40 rounded-full bg-white/60 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-48 w-48 rounded-full bg-amber-200/40 blur-3xl" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/70 px-4 py-2 text-xs font-bold uppercase tracking-[0.28em] text-blue-700 backdrop-blur-md">
            <Sparkles className="h-4 w-4 text-amber-500" />
            {eyebrow}
          </div>
          <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">{title}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">{description}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          {badge ? (
            <div className="inline-flex items-center rounded-full border border-white/80 bg-white/75 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-md">
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
      className={`rounded-[2rem] border border-white/70 bg-white/88 p-6 shadow-[0_30px_90px_-60px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:p-7 ${className}`.trim()}
    >
      {children}
    </section>
  );
}

export function DashboardStatCard({
  icon: Icon,
  label,
  value,
  accent = "blue",
  hint,
}: DashboardStatCardProps) {
  const styles = accentStyles[accent];

  return (
    <div className="rounded-[1.75rem] border border-white/70 bg-white/88 p-5 shadow-[0_24px_60px_-48px_rgba(15,23,42,0.45)] backdrop-blur-xl">
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
        : "bg-blue-600";

  return (
    <div className={`fixed right-4 top-4 z-50 rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-2xl ${palette}`}>
      {message}
    </div>
  );
}

export function DashboardLoading({ label = "Loading dashboard..." }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4 py-16">
      <div className="rounded-[2rem] border border-white/70 bg-white/90 px-8 py-7 text-center shadow-[0_25px_80px_-50px_rgba(37,99,235,0.45)] backdrop-blur-xl">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-[3px] border-blue-100 border-t-blue-600" />
        <p className="text-sm font-semibold text-slate-600">{label}</p>
      </div>
    </div>
  );
}
