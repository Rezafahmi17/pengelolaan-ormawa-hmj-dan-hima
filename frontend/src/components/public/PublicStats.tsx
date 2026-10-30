"use client";

import { Building2, GraduationCap, Layers, ShieldCheck } from "lucide-react";
import { useApiResource } from "@/hooks/useApiResource";

type PublicStatsData = {
  organizations: Record<string, number>;
  departments: number;
  studyPrograms: number;
};

export function PublicStats() {
  const stats = useApiResource<PublicStatsData>("/public/stats");

  const activeOrgsCount = stats.data
    ? Object.values(stats.data.organizations).reduce((total, count) => total + count, 0)
    : null;
  const departmentsCount = stats.data?.departments ?? 8;
  const studyProgramsCount = stats.data?.studyPrograms ?? 43;

  const items = [
    {
      value: `${departmentsCount}`,
      label: "Jurusan Resmi",
      sub: "Politeknik Negeri Lampung",
      icon: Building2,
    },
    {
      value: `${studyProgramsCount}`,
      label: "Program Studi",
      sub: "Jenjang D2, D3, D4 & S2",
      icon: GraduationCap,
    },
    {
      value: activeOrgsCount !== null && activeOrgsCount > 0 ? `${activeOrgsCount}` : "3 Tier",
      label: activeOrgsCount !== null && activeOrgsCount > 0 ? "Organisasi Aktif" : "Tingkat Organisasi",
      sub: "ORMAWA / UKM · HMJ · HIMA",
      icon: Layers,
    },
    {
      value: "SHA-256",
      label: "Audit & Isolasi Data",
      sub: "Multi-Tenant Terverifikasi",
      icon: ShieldCheck,
    },
  ];

  return (
    <section aria-label="Statistik cakupan sistem" className="relative z-10 py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="glass-card-vikram group rounded-[26px] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/35"
              >
                <div className="flex items-center justify-between">
                  <span className="glass-chip inline-flex size-11 items-center justify-center rounded-2xl text-emerald-300">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="glass-chip rounded-full px-3 py-1 text-[11px] font-medium text-white/75">
                    Terdata
                  </span>
                </div>
                <p className="mt-5 font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  {item.value}
                </p>
                <p className="mt-1 text-sm font-semibold text-white/90">{item.label}</p>
                <p className="mt-1 text-xs text-white/55">{item.sub}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
