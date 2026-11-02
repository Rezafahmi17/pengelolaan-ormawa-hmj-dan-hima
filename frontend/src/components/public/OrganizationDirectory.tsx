"use client";

import { useDeferredValue, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Building2, CheckCircle2, Search } from "lucide-react";
import { apiClient } from "@/lib/api-client";

type Organization = {
  id: string;
  type: "ORMAWA" | "HMJ" | "HIMA";
  code: string;
  name: string;
  slug: string;
  description?: string | null;
  department?: { name: string } | null;
  studyProgram?: { name: string } | null;
  parent?: { name: string } | null;
};
type Department = { id: string; name: string };
type StudyProgram = { id: string; departmentId: string; name: string; degreeLevel: string };

const FILTERS = [
  { label: "Semua Organisasi", value: "" },
  { label: "ORMAWA / UKM", value: "ORMAWA" },
  { label: "HMJ Jurusan", value: "HMJ" },
  { label: "HIMA Prodi", value: "HIMA" },
] as const;

const FALLBACK_DEPARTMENTS: Department[] = [
  { id: "BTP", name: "Budidaya Tanaman Pangan" },
  { id: "BTKB", name: "Budidaya Tanaman Perkebunan" },
  { id: "TP", name: "Teknologi Pertanian" },
  { id: "PTR", name: "Peternakan" },
  { id: "EB", name: "Ekonomi dan Bisnis" },
  { id: "TK", name: "Teknik" },
  { id: "PK", name: "Perikanan dan Kelautan" },
  { id: "TI", name: "Teknologi Informasi" },
];

const FALLBACK_STUDY_PROGRAMS: StudyProgram[] = [
  // 1. Budidaya Tanaman Pangan
  { id: "BTP-D3-HTK", departmentId: "BTP", name: "Hortikultura", degreeLevel: "D3" },
  { id: "BTP-D4-TBN", departmentId: "BTP", name: "Teknologi Perbenihan", degreeLevel: "S1 Terapan" },
  { id: "BTP-D4-TPP", departmentId: "BTP", name: "Teknologi Produksi Tanaman Pangan", degreeLevel: "S1 Terapan" },
  { id: "BTP-D4-TPH", departmentId: "BTP", name: "Teknologi Produksi Tanaman Hortikultura", degreeLevel: "S1 Terapan" },
  { id: "BTP-S2-KP", departmentId: "BTP", name: "Ketahanan Pangan", degreeLevel: "S2 Terapan" },
  // 2. Budidaya Tanaman Perkebunan
  { id: "BTKB-D3-PTP", departmentId: "BTKB", name: "Produksi Tanaman Perkebunan", degreeLevel: "D3" },
  { id: "BTKB-D4-PMIP", departmentId: "BTKB", name: "Produksi dan Manajemen Industri Perkebunan", degreeLevel: "S1 Terapan" },
  { id: "BTKB-D4-PPK", departmentId: "BTKB", name: "Pengelolaan Perkebunan Kopi", degreeLevel: "S1 Terapan" },
  { id: "BTKB-D4-TPTP", departmentId: "BTKB", name: "Teknologi Produksi Tanaman Perkebunan", degreeLevel: "S1 Terapan" },
  // 3. Teknologi Pertanian
  { id: "TP-D3-MP", departmentId: "TP", name: "Mekanisasi Pertanian", degreeLevel: "D3" },
  { id: "TP-D3-TPN", departmentId: "TP", name: "Teknologi Pangan", degreeLevel: "D3" },
  { id: "TP-D4-PPA", departmentId: "TP", name: "Pengembangan Produk Agroindustri", degreeLevel: "S1 Terapan" },
  { id: "TP-D4-KT", departmentId: "TP", name: "Kimia Terapan", degreeLevel: "S1 Terapan" },
  { id: "TP-D4-TPH", departmentId: "TP", name: "Teknologi Pangan Halal", degreeLevel: "S1 Terapan" },
  { id: "TP-D4-GK", departmentId: "TP", name: "Gizi Klinis", degreeLevel: "S1 Terapan" },
  // 4. Peternakan
  { id: "PTR-D4-TPT", departmentId: "PTR", name: "Teknologi Pakan Ternak", degreeLevel: "S1 Terapan" },
  { id: "PTR-D4-TPRT", departmentId: "PTR", name: "Teknologi Produksi Ternak", degreeLevel: "S1 Terapan" },
  { id: "PTR-D4-AP", departmentId: "PTR", name: "Agribisnis Peternakan", degreeLevel: "S1 Terapan" },
  // 5. Ekonomi dan Bisnis
  { id: "EB-D3-PW", departmentId: "EB", name: "Perjalanan Wisata", degreeLevel: "D3" },
  { id: "EB-D4-AGP", departmentId: "EB", name: "Agribisnis Pangan", degreeLevel: "S1 Terapan" },
  { id: "EB-D4-PA", departmentId: "EB", name: "Pengelolaan Agribisnis", degreeLevel: "S1 Terapan" },
  { id: "EB-D4-AKP", departmentId: "EB", name: "Akuntansi Perpajakan", degreeLevel: "S1 Terapan" },
  { id: "EB-D4-ABD", departmentId: "EB", name: "Akuntansi Bisnis Digital", degreeLevel: "S1 Terapan" },
  { id: "EB-D4-PPH", departmentId: "EB", name: "Pengelolaan Perhotelan", degreeLevel: "S1 Terapan" },
  { id: "EB-D4-PKA", departmentId: "EB", name: "Pengelolaan Konvensi dan Acara", degreeLevel: "S1 Terapan" },
  { id: "EB-D4-BIKBP", departmentId: "EB", name: "Bahasa Inggris untuk Komunikasi Bisnis dan Profesional", degreeLevel: "S1 Terapan" },
  { id: "EB-D4-PM", departmentId: "EB", name: "Produksi Media", degreeLevel: "S1 Terapan" },
  { id: "EB-D4-BD", departmentId: "EB", name: "Bisnis Digital", degreeLevel: "S1 Terapan" },
  { id: "EB-S2-MIA", departmentId: "EB", name: "Manajemen Inovasi Agribisnis", degreeLevel: "S2 Terapan" },
  // 6. Teknik
  { id: "TK-D3-TSLL", departmentId: "TK", name: "Teknik Sumberdaya Lahan dan Lingkungan", degreeLevel: "D3" },
  { id: "TK-D4-TRKJJ", departmentId: "TK", name: "Teknologi Rekayasa Konstruksi Jalan dan Jembatan", degreeLevel: "S1 Terapan" },
  { id: "TK-D4-TRKI", departmentId: "TK", name: "Teknologi Rekayasa Kimia Industri", degreeLevel: "S1 Terapan" },
  { id: "TK-D4-TRO", departmentId: "TK", name: "Teknologi Rekayasa Otomotif", degreeLevel: "S1 Terapan" },
  // 7. Perikanan dan Kelautan
  { id: "PK-D3-BP", departmentId: "PK", name: "Budidaya Perikanan", degreeLevel: "D3" },
  { id: "PK-D3-PT", departmentId: "PK", name: "Perikanan Tangkap", degreeLevel: "D3" },
  { id: "PK-D4-TPI", departmentId: "PK", name: "Teknologi Pembenihan Ikan", degreeLevel: "S1 Terapan" },
  { id: "PK-D4-TAK", departmentId: "PK", name: "Teknologi Akuakultur", degreeLevel: "S1 Terapan" },
  { id: "PK-D4-TCPI", departmentId: "PK", name: "Teknologi Cerdas Penangkapan Ikan", degreeLevel: "S1 Terapan" },
  // 8. Teknologi Informasi
  { id: "TI-D3-MI", departmentId: "TI", name: "Manajemen Informatika", degreeLevel: "D3" },
  { id: "TI-D4-TRI", departmentId: "TI", name: "Teknologi Rekayasa Internet", degreeLevel: "S1 Terapan" },
  { id: "TI-D4-TRPL", departmentId: "TI", name: "Teknologi Rekayasa Perangkat Lunak", degreeLevel: "S1 Terapan" },
  { id: "TI-D4-TRE", departmentId: "TI", name: "Teknologi Rekayasa Elektronika", degreeLevel: "S1 Terapan" },
  { id: "TI-D4-SDT", departmentId: "TI", name: "Sains Data Terapan", degreeLevel: "S1 Terapan" },
];

const FALLBACK_ORGANIZATIONS: Organization[] = [
  {
    id: "fallback-1",
    type: "ORMAWA",
    code: "UKM-POLINELA",
    name: "Unit Kegiatan Mahasiswa Tingkat Politeknik",
    slug: "ukm-polinela",
    description:
      "Tenant mandiri tingkat institusi untuk pengelolaan program kerja, proposal kegiatan, anggaran kas, dan inventaris UKM/ORMAWA.",
    department: { name: "Tingkat Institusi Polinela" },
  },
  {
    id: "fallback-2",
    type: "HMJ",
    code: "HMJ-TI",
    name: "Himpunan Mahasiswa Jurusan Teknologi Informasi",
    slug: "hmj-ti",
    description:
      "Tenant induk pada Jurusan Teknologi Informasi yang menaungi 5 program studi serta meninjau program kerja dan pengajuan HIMA.",
    department: { name: "Teknologi Informasi" },
  },
  {
    id: "fallback-3",
    type: "HMJ",
    code: "HMJ-EB",
    name: "Himpunan Mahasiswa Jurusan Ekonomi dan Bisnis",
    slug: "hmj-eb",
    description:
      "Mengelola kegiatan kemahasiswaan, verifikasi proposal proker HIMA, dan pelaporan keuangan di Jurusan Ekonomi dan Bisnis.",
    department: { name: "Ekonomi dan Bisnis" },
  },
  {
    id: "fallback-4",
    type: "HMJ",
    code: "HMJ-BTP",
    name: "Himpunan Mahasiswa Jurusan Budidaya Tanaman Pangan",
    slug: "hmj-btp",
    description:
      "Wadah koordinasi aktivitas akademik, kepengurusan mahasiswa, dan pembinaan HIMA di lingkungan Jurusan Budidaya Tanaman Pangan.",
    department: { name: "Budidaya Tanaman Pangan" },
  },
  {
    id: "fallback-5",
    type: "HIMA",
    code: "HIMA-TRPL",
    name: "HIMA Teknologi Rekayasa Perangkat Lunak",
    slug: "hima-trpl",
    description:
      "Organisasi mahasiswa tingkat Program Studi Sarjana Terapan (S1) TRPL yang menyusun program kerja, proposal, dan realisasi kegiatan berjenjang ke HMJ TI.",
    department: { name: "Teknologi Informasi" },
    studyProgram: { name: "Sarjana Terapan (S1) Teknologi Rekayasa Perangkat Lunak" },
    parent: { name: "HMJ Teknologi Informasi" },
  },
  {
    id: "fallback-6",
    type: "HMJ",
    code: "HMJ-TK",
    name: "Himpunan Mahasiswa Jurusan Teknik",
    slug: "hmj-tk",
    description:
      "Mengintegrasikan administrasi anggota, inventaris alat teknik, dan persetujuan kegiatan mahasiswa Jurusan Teknik Polinela.",
    department: { name: "Teknik" },
  },
];

export function OrganizationDirectory() {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [type, setType] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [studyProgramId, setStudyProgramId] = useState("");
  const [departments, setDepartments] = useState<Department[]>(FALLBACK_DEPARTMENTS);
  const [studyPrograms, setStudyPrograms] = useState<StudyProgram[]>(FALLBACK_STUDY_PROGRAMS);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    Promise.all([
      apiClient.get<Department[]>("/references/departments"),
      apiClient.get<StudyProgram[]>("/references/study-programs"),
    ])
      .then(([departmentItems, studyProgramItems]) => {
        if (departmentItems.length > 0) setDepartments(departmentItems);
        if (studyProgramItems.length > 0) setStudyPrograms(studyProgramItems);
      })
      .catch(() => {
        setDepartments(FALLBACK_DEPARTMENTS);
        setStudyPrograms(FALLBACK_STUDY_PROGRAMS);
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const search = new URLSearchParams();
    if (deferredQuery) search.set("q", deferredQuery);
    if (type) search.set("type", type);
    if (departmentId) search.set("departmentId", departmentId);
    if (studyProgramId) search.set("studyProgramId", studyProgramId);

    apiClient
      .get<Organization[]>(`/public/organizations?${search.toString()}`)
      .then((items) => {
        if (!cancelled) {
          if (items.length > 0 || deferredQuery || type || departmentId || studyProgramId) {
            setOrganizations(items);
            setUsingFallback(false);
          } else {
            setOrganizations(FALLBACK_ORGANIZATIONS);
            setUsingFallback(true);
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUsingFallback(true);
          const filtered = FALLBACK_ORGANIZATIONS.filter((org) => {
            const matchType = !type || org.type === type;
            const matchQuery =
              !deferredQuery ||
              org.name.toLowerCase().includes(deferredQuery.toLowerCase()) ||
              org.code.toLowerCase().includes(deferredQuery.toLowerCase());
            const selectedDept = departments.find((d) => d.id === departmentId);
            const matchDept =
              !departmentId ||
              !selectedDept ||
              org.department?.name.toLowerCase() === selectedDept.name.toLowerCase();
            return matchType && matchQuery && matchDept;
          });
          setOrganizations(filtered);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [deferredQuery, type, departmentId, studyProgramId, departments]);

  return (
    <section id="direktori" className="relative z-10 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <span className="glass-chip inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold tracking-wider text-emerald-300 uppercase">
              Direktori Organisasi Kampus
            </span>
            <h2 className="mt-4 font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Eksplorasi ORMAWA, HMJ &amp; HIMA Polinela
            </h2>
            <p className="mt-3 text-base text-white/75">
              Cari dan telusuri organisasi mahasiswa aktif berdasarkan kategori tenant, jurusan,
              maupun program studi di Politeknik Negeri Lampung.
            </p>
          </div>
          <Link
            href="/daftar"
            className="glass-chip inline-flex w-fit items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            Daftarkan Organisasi Baru
            <ArrowUpRight className="size-4" />
          </Link>
        </div>

        {/* Glossy Search & Filter Bar */}
        <div className="glass-card-vikram mt-10 rounded-[28px] p-6 sm:p-7">
          <div className="grid gap-4 lg:grid-cols-3">
            <label className="relative block flex-1">
              <span className="sr-only">Cari organisasi</span>
              <Search
                aria-hidden="true"
                className=" absolute left-4 top-1/2 size-4 -translate-y-1/2 text-white/50"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari nama atau kode organisasi (mis. HMJ-TI)…"
                className="h-12 w-full rounded-2xl border border-white/20 bg-black/35 pl-11 pr-4 text-sm text-white placeholder-white/45 outline-none backdrop-blur-md transition focus:border-emerald-400/70 focus:ring-2 focus:ring-emerald-400/20"
              />
            </label>

            <label>
              <span className="sr-only">Filter jurusan</span>
              <select
                value={departmentId}
                onChange={(event) => {
                  setDepartmentId(event.target.value);
                  setStudyProgramId("");
                }}
                className="h-12 w-full rounded-2xl border border-white/20 bg-black/35 px-4 text-sm text-white/90 outline-none backdrop-blur-md transition focus:border-emerald-400/70 focus:ring-2 focus:ring-emerald-400/20"
              >
                <option value="" className="bg-slate-900 text-white">
                  Semua Jurusan (8 Jurusan)
                </option>
                {departments.map((department) => (
                  <option
                    key={department.id}
                    value={department.id}
                    className="bg-slate-900 text-white"
                  >
                    {department.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="sr-only">Filter program studi</span>
              <select
                value={studyProgramId}
                onChange={(event) => setStudyProgramId(event.target.value)}
                className="h-12 w-full rounded-2xl border border-white/20 bg-black/35 px-4 text-sm text-white/90 outline-none backdrop-blur-md transition focus:border-emerald-400/70 focus:ring-2 focus:ring-emerald-400/20"
              >
                <option value="" className="bg-slate-900 text-white">
                  Semua Program Studi (43 Prodi)
                </option>
                {studyPrograms
                  .filter((program) => !departmentId || program.departmentId === departmentId)
                  .map((program) => (
                    <option key={program.id} value={program.id} className="bg-slate-900 text-white">
                      {program.degreeLevel} {program.name}
                    </option>
                  ))}
              </select>
            </label>
          </div>

          <div
            className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-5"
            role="group"
            aria-label="Filter jenis organisasi"
          >
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setType(filter.value)}
                  className={`cursor-pointer rounded-xl px-4 py-2 text-xs font-semibold transition duration-200 ${
                    type === filter.value
                      ? "border border-white/40 bg-white/25 text-white shadow-sm backdrop-blur-md"
                      : "glass-chip text-white/75 hover:bg-white/15 hover:text-white"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            {usingFallback && (
              <span className="text-xs text-white/55">
                Menampilkan pratinjau struktur organisasi Polinela
              </span>
            )}
          </div>
        </div>

        {/* Organization Cards in Image-2 Glossy Transparent Style */}
        {organizations.length === 0 ? (
          <div className="glass-card-vikram mt-8 rounded-[28px] p-12 text-center text-white/70">
            Tidak ada organisasi yang sesuai dengan filter pencarian.
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {organizations.map((organization) => (
              <div
                key={organization.id}
                className="glass-card-vikram group flex flex-col justify-between rounded-[28px] p-7 transition-all duration-300 hover:-translate-y-1.5 hover:border-white/35"
              >
                <div>
                  {/* Top row: Icon Circle + Saved/Type Pill (matching Image 2) */}
                  <div className="flex items-center justify-between gap-4">
                    <span className="glass-chip grid size-12 place-items-center rounded-full text-emerald-300">
                      <Building2 className="size-5" aria-hidden="true" />
                    </span>
                    <span className="glass-chip inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold text-white/90">
                      <CheckCircle2 className="size-3.5 text-emerald-400" />
                      {organization.type}
                    </span>
                  </div>

                  {/* Organization Code & Name */}
                  <p className="mt-6 text-sm font-medium text-white/70">
                    <span className="font-semibold text-white">{organization.code}</span> ·{" "}
                    {organization.department?.name || "Politeknik Negeri Lampung"}
                  </p>
                  <h3 className="mt-1.5 font-heading text-xl font-bold leading-snug text-white">
                    {organization.name}
                  </h3>

                  {/* Pills */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="glass-chip rounded-xl px-3 py-1.5 text-xs font-medium text-white/85">
                      {organization.studyProgram?.name ||
                        organization.department?.name ||
                        "Institusi Polinela"}
                    </span>
                    {organization.parent && (
                      <span className="glass-chip rounded-xl px-3 py-1.5 text-xs font-medium text-white/75">
                        Induk: {organization.parent.name}
                      </span>
                    )}
                  </div>

                  <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-white/70">
                    {organization.description ||
                      "Organisasi kemahasiswaan resmi di lingkungan Politeknik Negeri Lampung."}
                  </p>
                </div>

                {/* Divider & Bottom Action Row (matching Image 2) */}
                <div className="mt-6 border-t border-white/15 pt-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-white">Tenant Aktif</p>
                    <p className="text-xs text-white/55">Polinela · Bandar Lampung</p>
                  </div>
                  <Link
                    href={
                      usingFallback ? "/login" : `/organisasi/${organization.slug}`
                    }
                    className="glass-chip inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-white/25"
                  >
                    {usingFallback ? "Akses Portal" : "Lihat Profil"}
                    <ArrowUpRight className="size-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
