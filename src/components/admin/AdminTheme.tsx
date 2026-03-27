import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";

type AdminPageHeroProps = {
  eyebrow?: string;
  title: string;
  description: string;
  badge?: string;
  children?: ReactNode;
};

type AdminSurfaceProps = {
  children: ReactNode;
  className?: string;
};

export function AdminPageHero({
  eyebrow = "Admin Workspace",
  title,
  description,
  badge,
  children,
}: AdminPageHeroProps) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_48%,#60a5fa_100%)] p-6 text-white shadow-[0_35px_120px_-50px_rgba(37,99,235,0.8)] sm:p-8">
      <div className="absolute -right-16 top-0 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute bottom-0 left-0 h-44 w-44 rounded-full bg-amber-300/20 blur-3xl" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-white/90 backdrop-blur-md">
            <Sparkles className="h-4 w-4 text-amber-300" />
            {eyebrow}
          </div>
          <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-100 sm:text-base">{description}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {badge ? (
            <div className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white/90 backdrop-blur-md">
              {badge}
            </div>
          ) : null}
          {children}
        </div>
      </div>
    </section>
  );
}

export function AdminSurface({ children, className = "" }: AdminSurfaceProps) {
  return (
    <div
      className={`rounded-[2rem] border border-white/70 bg-white/90 shadow-[0_30px_90px_-55px_rgba(15,23,42,0.28)] backdrop-blur-xl ${className}`.trim()}
    >
      {children}
    </div>
  );
}
