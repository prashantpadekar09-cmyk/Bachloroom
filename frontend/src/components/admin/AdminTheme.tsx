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
    <section className="relative overflow-hidden rounded-[2rem] border border-amber-200/35 bg-[linear-gradient(135deg,#16120d_0%,#2a1c11_28%,#8a6431_78%,#f6ead6_140%)] p-6 text-white shadow-[0_35px_120px_-50px_rgba(84,56,21,0.7)] sm:p-8">
      <div className="absolute -right-16 top-0 h-52 w-52 rounded-full bg-amber-50/15 blur-3xl" />
      <div className="absolute bottom-0 left-0 h-44 w-44 rounded-full bg-amber-300/25 blur-3xl" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/30 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-amber-50/95 backdrop-blur-md">
            <Sparkles className="h-4 w-4 text-[#f4deb1]" />
            {eyebrow}
          </div>
          <h1 className="mt-5 text-3xl font-black tracking-tight text-[#f8e7bf] sm:text-4xl">{title}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-amber-50/85 sm:text-base">{description}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {badge ? (
            <div className="inline-flex items-center rounded-full border border-amber-200/30 bg-white/10 px-4 py-2 text-sm font-semibold text-[#f8e7bf] backdrop-blur-md">
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
