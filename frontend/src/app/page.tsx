'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Layers,
  Lock,
  LogIn,
  Mail,
  MapPin,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';
import { PublicStats } from '@/components/public/PublicStats';
import { OrganizationDirectory } from '@/components/public/OrganizationDirectory';

const MODULE_CATEGORIES = [
  'Semua Modul',
  'Program Kerja',
  'Keuangan & LPJ',
  'Tata Kelola & Review',
  'Inventaris & Anggota',
  'Keamanan',
] as const;

const PROJECT_MODULES = [
  {
    id: 'proker-proposal',
    category: 'Program Kerja',
    badge: 'Workflow Inti',
    orgScope: 'ORMAWA · HMJ · HIMA',
    title: 'Program Kerja & Proposal Digital',
    description:
      'Penyusunan rencana program kerja, pengunggahan dokumen proposal PDF tervalidasi (maks. 10MB), serta pelacakan status pelaksanaan dari Draf, Diajukan, Disetujui, Berjalan, hingga Selesai.',
    pills: ['Proposal PDF ≤ 10MB', 'Tracking Status Proker'],
    metric: '5 Tahap Status',
    location: 'Siklus Kegiatan Terpadu',
    href: '/login',
    cta: 'Kelola Proker',
    icon: FileText,
  },
  {
    id: 'review-berjenjang',
    category: 'Tata Kelola & Review',
    badge: 'Verifikasi HMJ',
    orgScope: 'HIMA → HMJ Induk',
    title: 'Alur Reviewer Berjenjang',
    description:
      'Setiap pengajuan program kerja, kebutuhan, dan anggaran HIMA wajib ditinjau oleh HMJ Induk pada jurusan terkait. Reviewer dapat menyetujui, meminta revisi dengan catatan wajib, atau menolak.',
    pills: ['Catatan Revisi Wajib', 'Persetujuan Berjenjang'],
    metric: 'HMJ & Super Admin',
    location: 'Otorisasi Sesuai Hierarki',
    href: '/login',
    cta: 'Buka Portal Review',
    icon: ClipboardCheck,
  },
  {
    id: 'keuangan-lpj',
    category: 'Keuangan & LPJ',
    badge: 'Transparansi Kas',
    orgScope: 'Multi-Tenant Finance',
    title: 'Tata Kelola Keuangan & LPJ',
    description:
      'Pencatatan pemasukan dan pengeluaran kas organisasi, pengajuan anggaran kegiatan per item rincian biaya, hingga pelaporan realisasi LPJ secara transparan dan akuntabel.',
    pills: ['Pengajuan Dana', 'Buku Kas & Realisasi'],
    metric: '100% Teraudit',
    location: 'Pelaporan Keuangan',
    href: '/login',
    cta: 'Pantau Anggaran',
    icon: Wallet,
  },
  {
    id: 'anggota-kepengurusan',
    category: 'Inventaris & Anggota',
    badge: 'Struktur & Peran',
    orgScope: 'Periode Kepengurusan',
    title: 'Anggota & Struktur Organisasi',
    description:
      'Pengelolaan database mahasiswa pengurus aktif, pembagian jabatan per periode kepengurusan, serta pengaturan hak akses berbasis peran (Admin Tenant, Pengurus/Officer, dan Anggota).',
    pills: ['Periode Aktif', 'RBAC 4 Role'],
    metric: '27 Permission',
    location: 'Manajemen Keanggotaan',
    href: '/login',
    cta: 'Lihat Struktur',
    icon: Users,
  },
  {
    id: 'inventaris-alat',
    category: 'Inventaris & Anggota',
    badge: 'Manajemen Aset',
    orgScope: 'Inventaris Tenant',
    title: 'Inventaris & Kebutuhan Alat',
    description:
      'Pendataan aset dan peralatan milik masing-masing organisasi, pemantauan jumlah serta kondisi barang (Baik, Rusak Ringan, Rusak Berat), dan pengajuan kebutuhan kegiatan.',
    pills: ['Pelacakan Kondisi', 'Pengajuan Kebutuhan'],
    metric: 'Data Real-Time',
    location: 'Aset Kemahasiswaan',
    href: '/login',
    cta: 'Cek Inventaris',
    icon: PackageCheck,
  },
  {
    id: 'isolasi-audit',
    category: 'Keamanan',
    badge: 'Keamanan Sistem',
    orgScope: 'Isolasi Ketat',
    title: 'Multi-Tenant & Audit Log SHA-256',
    description:
      'Menjamin setiap ORMAWA, HMJ, dan HIMA hanya dapat mengakses data organisasinya sendiri. Seluruh perubahan status, kas, dan dokumen dicatat secara append-only pada Audit Log.',
    pills: ['Isolasi Data Tenant', 'Audit Log Append-Only'],
    metric: '37 Tabel MySQL',
    location: 'Keamanan Tingkat Server',
    href: '/login',
    cta: 'Pelajari Sistem',
    icon: ShieldCheck,
  },
];

const TENANT_TIERS = [
  {
    role: 'Institusi / Kemahasiswaan',
    title: 'Super Admin',
    badge: 'Tingkat Politeknik',
    description:
      'Memverifikasi pendaftaran akun ORMAWA dan HMJ, mengelola data master 8 jurusan & 43 program studi, serta memonitor audit log seluruh sistem.',
    pills: ['Verifikasi ORMAWA & HMJ', 'Master Akademik', 'Monitoring Audit'],
    footerLeft: 'Otoritas Tertinggi',
    footerSub: 'Kemahasiswaan Polinela',
    href: '/login',
    cta: 'Masuk Admin',
  },
  {
    role: 'Unit Kegiatan Mahasiswa',
    title: 'ORMAWA / UKM',
    badge: 'Tenant Mandiri',
    description:
      'Organisasi mahasiswa tingkat politeknik yang bersifat mandiri (sejajar dengan HMJ) untuk mengelola anggota, proker, anggaran, dan inventaris UKM.',
    pills: ['Tenant Mandiri', 'Proker & Keuangan', 'Inventaris UKM'],
    footerLeft: 'Tingkat Kampus',
    footerSub: 'Persetujuan Super Admin',
    href: '/daftar/ormawa',
    cta: 'Daftar ORMAWA',
  },
  {
    role: 'Himpunan Mahasiswa Jurusan',
    title: 'HMJ (8 Jurusan)',
    badge: 'Tenant Induk Jurusan',
    description:
      'Satu HMJ mewakili satu jurusan resmi di Polinela. Berwenang menyetujui pendaftaran HIMA di bawah jurusannya serta mereview pengajuan proker HIMA.',
    pills: ['Induk HIMA Prodi', 'Reviewer Pengajuan', 'Komunikasi HMJ–HIMA'],
    footerLeft: '8 Jurusan Resmi',
    footerSub: 'Membawahi HIMA Prodi',
    href: '/daftar/hmj',
    cta: 'Daftar HMJ',
  },
  {
    role: 'Himpunan Mahasiswa Prodi',
    title: 'HIMA (Program Studi)',
    badge: 'Tenant Anak HMJ',
    description:
      'Mewakili program studi di bawah koordinasi HMJ induk. Mengelola kepengurusan HIMA serta mengajukan program kerja, proposal, dan anggaran ke HMJ induk.',
    pills: ['43 Program Studi', 'Pengajuan ke HMJ', 'Ruang Pesan Resmi'],
    footerLeft: 'Tingkat Prodi',
    footerSub: 'Verifikasi oleh HMJ Induk',
    href: '/daftar/hima',
    cta: 'Daftar HIMA',
  },
];

const POLINELA_DEPARTMENTS = [
  {
    code: 'BTP',
    name: 'Budidaya Tanaman Pangan',
    count: '5 Program Studi',
    degrees: 'D3 · D4 · S2',
    highlights: ['Hortikultura', 'Teknologi Perbenihan', 'Ketahanan Pangan (S2)'],
  },
  {
    code: 'BTKB',
    name: 'Budidaya Tanaman Perkebunan',
    count: '4 Program Studi',
    degrees: 'D3 · D4',
    highlights: ['Produksi Tanaman Perkebunan', 'Pengelolaan Perkebunan Kopi', 'PMIP'],
  },
  {
    code: 'TP',
    name: 'Teknologi Pertanian',
    count: '7 Program Studi',
    degrees: 'D3 · D4',
    highlights: ['Mekanisasi Pertanian', 'Teknologi Pangan', 'Kimia Terapan', 'Gizi Klinis'],
  },
  {
    code: 'PTR',
    name: 'Peternakan',
    count: '5 Program Studi',
    degrees: 'D3 · D4',
    highlights: ['Produksi Ternak', 'Teknologi Pakan Ternak', 'Agribisnis Peternakan'],
  },
  {
    code: 'EB',
    name: 'Ekonomi dan Bisnis',
    count: '11 Program Studi',
    degrees: 'D2 · D3 · D4 · S2',
    highlights: ['Agribisnis Pangan', 'Akuntansi Perpajakan', 'Bisnis Digital', 'Perhotelan'],
  },
  {
    code: 'TK',
    name: 'Teknik',
    count: '4 Program Studi',
    degrees: 'D3 · D4',
    highlights: ['Konstruksi Jalan & Jembatan', 'Rekayasa Kimia Industri', 'Rekayasa Otomotif'],
  },
  {
    code: 'PK',
    name: 'Perikanan dan Kelautan',
    count: '5 Program Studi',
    degrees: 'D2 · D3 · D4',
    highlights: ['Budidaya Perikanan', 'Teknologi Akuakultur', 'Perikanan Tangkap'],
  },
  {
    code: 'TI',
    name: 'Teknologi Informasi',
    count: '5 Program Studi',
    degrees: 'D2 · D3 · D4',
    highlights: [
      'Teknologi Rekayasa Perangkat Lunak',
      'Teknologi Rekayasa Internet',
      'Sains Data Terapan',
    ],
  },
];

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] =
    useState<(typeof MODULE_CATEGORIES)[number]>('Semua Modul');

  const filteredModules =
    selectedCategory === 'Semua Modul'
      ? PROJECT_MODULES
      : PROJECT_MODULES.filter((item) => item.category === selectedCategory);

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden text-white selection:bg-emerald-500 selection:text-white">
      {/* =====================================================================
          FIXED CAMPUS PHOTO BACKGROUND + ATMOSPHERIC VIGNETTE OVERLAY
         ===================================================================== */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-[1.02] transition-transform duration-1000"
          style={{ backgroundImage: "url('/kampus-polinela.jpg')" }}
        />
        {/* Natural dark glass tint so the campus photo remains clearly visible while text stays crisp */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-slate-950/55 to-slate-950/85" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_15%,rgba(4,12,8,0.55)_100%)]" />
      </div>

      {/* =====================================================================
          STICKY GLOSSY NAVBAR
         ===================================================================== */}
      <header className="sticky top-0 z-50 px-4 pt-4 sm:px-6 lg:px-8">
        <nav
          aria-label="Navigasi utama"
          className="glass-card-vikram mx-auto flex max-w-7xl items-center justify-between rounded-2xl px-4 py-3 sm:px-6"
        >
          {/* Brand */}
          <Link href="/" className="flex items-center gap-3">
            <span className="glass-chip grid size-10 place-items-center rounded-xl text-emerald-300">
              <Building2 className="size-5" />
            </span>
            <div className="leading-tight">
              <span className="block font-heading text-base font-bold tracking-tight text-white">
                SIM ORMAWA &amp; HMJ
              </span>
              <span className="block text-[11px] font-medium text-white/65">
                Politeknik Negeri Lampung
              </span>
            </div>
          </Link>

          {/* Center Anchor Links */}
          <div className="hidden items-center gap-1 md:flex">
            {[
              { label: 'Tentang Sistem', href: '#tentang' },
              { label: 'Modul & Fitur', href: '#modul' },
              { label: 'Hierarki & Alur', href: '#hierarki' },
              { label: '8 Jurusan', href: '#jurusan' },
              { label: 'Direktori', href: '#direktori' },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-xl px-3.5 py-2 text-xs font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2.5">
            <Link
              href="/status-pengajuan"
              className="hidden rounded-xl px-3 py-2 text-xs font-medium text-white/75 transition hover:bg-white/10 hover:text-white lg:inline-block"
            >
              Cek Status
            </Link>
            <Link
              href="/daftar"
              className="glass-chip hidden items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-white/20 sm:inline-flex"
            >
              <UserPlus className="size-3.5" />
              Ajukan Akun
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300/40 bg-emerald-500/85 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-950/40 backdrop-blur-md transition hover:bg-emerald-500"
            >
              <LogIn className="size-3.5" />
              Masuk Portal
            </Link>
          </div>
        </nav>
      </header>

      {/* =====================================================================
          SLIDE 1: HERO SECTION (IMAGE-2 GLOSSY CARD + CAMPUS BACKGROUND)
         ===================================================================== */}
      <main className="relative z-10">
        <section className="mx-auto max-w-7xl px-4 pt-10 pb-14 sm:px-6 lg:px-8 lg:pt-16 lg:pb-20">
          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
            {/* Left Column: Clear Project Introduction & Quick Actions */}
            <div className="lg:col-span-7 space-y-6">
              <div className="glass-chip inline-flex items-center gap-2.5 rounded-full px-4 py-1.5">
                <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-medium tracking-wide text-white/90">
                  Portal Resmi Kemahasiswaan · Politeknik Negeri Lampung
                </span>
              </div>

              <h1 className="font-heading text-4xl font-extrabold leading-[1.12] tracking-tight text-white sm:text-5xl lg:text-[54px]">
                Sistem Informasi Manajemen{' '}
                <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-amber-200 bg-clip-text text-transparent">
                  ORMAWA, HMJ &amp; HIMA
                </span>
              </h1>

              <p className="max-w-2xl text-base leading-relaxed text-white/85 sm:text-lg">
                Satu portal web terpusat berbasis <strong>Multi-Tenant</strong> untuk mengelola
                kepengurusan, pengajuan program kerja, proposal kegiatan, anggaran keuangan,
                realisasi LPJ, hingga inventaris organisasi mahasiswa di lingkungan{' '}
                <strong>Politeknik Negeri Lampung</strong> secara tertib, transparan, dan mudah
                diaudit.
              </p>

              {/* Feature Pills */}
              <div className="flex flex-wrap gap-2.5 pt-1">
                {[
                  'Isolasi Data Multi-Tenant',
                  'Workflow Review HMJ & Admin',
                  'Keuangan & LPJ Terintegrasi',
                  'Audit Log SHA-256',
                ].map((pill) => (
                  <span
                    key={pill}
                    className="glass-chip rounded-xl px-3.5 py-1.5 text-xs font-medium text-white/90"
                  >
                    {pill}
                  </span>
                ))}
              </div>

              {/* Primary CTA Buttons */}
              <div className="flex flex-wrap items-center gap-3.5 pt-3">
                <Link
                  href="/login"
                  className="glass-button-glow inline-flex items-center gap-2.5 rounded-2xl border border-emerald-300/50 bg-emerald-600/90 px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-emerald-950/50 backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-emerald-500"
                >
                  Masuk ke Portal
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/daftar"
                  className="glass-card-vikram inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/15"
                >
                  Ajukan Akun Organisasi
                  <ArrowUpRight className="size-4 text-emerald-300" />
                </Link>
                <a
                  href="#tentang"
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white/80 transition hover:text-white"
                >
                  Pelajari Sistem
                  <ChevronDown className="size-4" />
                </a>
              </div>
            </div>

            {/* Right Column: Featured Glossy Transparent Card (Matching Uploaded Reference Image 2) */}
            <div className="lg:col-span-5">
              <div className="glass-card-vikram mx-auto max-w-md rounded-[32px] p-7 sm:p-8">
                {/* Top Header Row: Circular Logo Emblem + Saved/Status Pill */}
                <div className="flex items-center justify-between">
                  <div className="glass-chip grid size-14 place-items-center rounded-full border border-white/25 shadow-inner">
                    <GraduationCap className="size-7 text-emerald-300" />
                  </div>
                  <span className="glass-chip inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-semibold text-white">
                    Multi-Tenant
                    <Sparkles className="size-3.5 text-amber-300" />
                  </span>
                </div>

                {/* Subtitle & Main Card Title */}
                <div className="mt-8">
                  <p className="text-base font-medium text-white/70">
                    <span className="font-semibold text-white">Polinela</span> · Portal Terpadu 2026
                  </p>
                  <h2 className="mt-1.5 font-heading text-2xl font-bold tracking-tight text-white sm:text-3xl">
                    SIM ORMAWA &amp; HMJ
                  </h2>
                </div>

                {/* Frosted Glass Pills (like "Full-Time" / "Flexible Schedule" in Image 2) */}
                <div className="mt-5 flex flex-wrap gap-2.5">
                  <span className="glass-chip rounded-xl px-4 py-2 text-xs font-medium text-white/95">
                    ORMAWA / UKM
                  </span>
                  <span className="glass-chip rounded-xl px-4 py-2 text-xs font-medium text-white/95">
                    HMJ &amp; HIMA
                  </span>
                  <span className="glass-chip rounded-xl px-4 py-2 text-xs font-medium text-white/95">
                    Proker &amp; LPJ
                  </span>
                </div>

                {/* Brief Project Highlights inside Card */}
                <div className="mt-6 space-y-2.5 rounded-2xl border border-white/12 bg-black/25 p-4 text-xs text-white/80">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">Verifikasi HIMA</span>
                    <span className="font-semibold text-emerald-300">Ditinjau HMJ Induk</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">Verifikasi ORMAWA &amp; HMJ</span>
                    <span className="font-semibold text-amber-300">Ditinjau Super Admin</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">Dokumen Proposal &amp; Bukti</span>
                    <span className="font-semibold text-white">PDF Privat Tervalidasi</span>
                  </div>
                </div>

                {/* Subtle Horizontal Divider */}
                <div className="my-6 border-t border-white/15" />

                {/* Bottom Row: Key Metric + Glossy Action Button (exact Image 2 layout) */}
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-heading text-xl font-bold text-white">
                      8 Jurusan · 43 Prodi
                    </p>
                    <p className="text-xs text-white/60">Bandar Lampung, Indonesia</p>
                  </div>
                  <Link
                    href="/login"
                    className="glass-chip rounded-2xl px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/25"
                  >
                    Buka Portal
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================================
            PUBLIC STATS BAR (4 GLOSSY CARDS)
           ===================================================================== */}
        <PublicStats />

        {/* =====================================================================
            SLIDE 2: TENTANG WEBSITE PROJEK & LATAR BELAKANG SISTEM
           ===================================================================== */}
        <section id="tentang" className="py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="glass-card-vikram rounded-[32px] p-8 sm:p-12">
              <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
                <div className="lg:col-span-7 space-y-4">
                  <span className="glass-chip inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-300">
                    Tentang Website Projek
                  </span>
                  <h2 className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
                    Mengapa SIM ORMAWA &amp; HMJ Polinela Dibangun?
                  </h2>
                  <p className="text-base leading-relaxed text-white/80">
                    Administrasi organisasi mahasiswa sebelumnya sering tersebar di berbagai dokumen
                    terpisah, spreadsheet, dan aplikasi pesan. Akibatnya, data kepengurusan tidak
                    konsisten, status persetujuan program kerja sulit dipantau, serta pencatatan
                    keuangan dan inventaris tidak terintegrasi.
                  </p>
                  <p className="text-base leading-relaxed text-white/80">
                    Melalui proyek <strong>SIM ORMAWA &amp; HMJ berbasis Multi-Tenant</strong> ini,
                    seluruh aktivitas administrasi organisasi mahasiswa Politeknik Negeri Lampung
                    disatukan dalam satu portal modern dengan <strong>batas kewenangan</strong> dan{' '}
                    <strong>isolasi data</strong> yang tetap terjaga ketat antar organisasi.
                  </p>
                </div>

                <div className="lg:col-span-5 grid gap-4 sm:grid-cols-2">
                  {[
                    {
                      icon: Lock,
                      title: 'Isolasi Multi-Tenant',
                      desc: 'Setiap ORMAWA, HMJ, dan HIMA memiliki ruang kerja terpisah tanpa kebocoran data lintas tenant.',
                    },
                    {
                      icon: FileSpreadsheet,
                      title: 'Administrasi Tertib',
                      desc: 'Proposal kegiatan, rincian anggaran, dan LPJ tersimpan rapi dalam satu alur kerja baku.',
                    },
                    {
                      icon: CheckCircle2,
                      title: 'Persetujuan Jelas',
                      desc: 'Setiap pengajuan memiliki riwayat status (Draft, Submitted, Revisi, Approved, Completed).',
                    },
                    {
                      icon: BookOpen,
                      title: 'Jejak Audit Lengkap',
                      desc: 'Seluruh keputusan reviewer dan transaksi kas tercatat otomatis beserta waktu dan aktornya.',
                    },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.title}
                        className="rounded-2xl border border-white/15 bg-white/[0.06] p-5 backdrop-blur-md"
                      >
                        <span className="glass-chip inline-flex size-10 items-center justify-center rounded-xl text-emerald-300">
                          <Icon className="size-5" />
                        </span>
                        <h3 className="mt-3 font-heading text-base font-bold text-white">
                          {item.title}
                        </h3>
                        <p className="mt-1.5 text-xs leading-relaxed text-white/70">{item.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================================
            SLIDE 3: MODUL & FITUR UTAMA (IMAGE-2 GLOSSY CARDS + FILTER)
           ===================================================================== */}
        <section id="modul" className="py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div className="max-w-2xl">
                <span className="glass-chip inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-300">
                  Modul Utama Sistem
                </span>
                <h2 className="mt-4 font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Fitur Terintegrasi sesuai Kebutuhan Organisasi
                </h2>
                <p className="mt-3 text-base text-white/75">
                  Pilih kategori di bawah ini untuk melihat modul yang tersedia di dalam dashboard
                  SIM ORMAWA &amp; HMJ setelah Anda masuk ke portal.
                </p>
              </div>

              {/* Filter Pills */}
              <div className="flex flex-wrap gap-2">
                {MODULE_CATEGORIES.map((category) => {
                  const active = selectedCategory === category;
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setSelectedCategory(category)}
                      className={`cursor-pointer rounded-xl px-4 py-2 text-xs font-semibold transition ${
                        active
                          ? 'border border-white/40 bg-white/25 text-white shadow-sm backdrop-blur-md'
                          : 'glass-chip text-white/75 hover:bg-white/15 hover:text-white'
                      }`}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cards Grid styled after Image 2 */}
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredModules.map((mod) => {
                const Icon = mod.icon;
                return (
                  <div
                    key={mod.id}
                    className="glass-card-vikram group flex flex-col justify-between rounded-[30px] p-7 transition-all duration-300 hover:-translate-y-1.5 hover:border-white/35"
                  >
                    <div>
                      {/* Top row: Icon circle + Badge pill */}
                      <div className="flex items-center justify-between gap-4">
                        <span className="glass-chip grid size-12 place-items-center rounded-full text-emerald-300">
                          <Icon className="size-5" />
                        </span>
                        <span className="glass-chip rounded-xl px-3.5 py-1.5 text-xs font-semibold text-white/90">
                          {mod.badge}
                        </span>
                      </div>

                      {/* Subtitle & Title */}
                      <p className="mt-6 text-sm font-medium text-white/65">
                        <span className="font-semibold text-white">{mod.category}</span> ·{' '}
                        {mod.orgScope}
                      </p>
                      <h3 className="mt-1.5 font-heading text-2xl font-bold leading-snug text-white">
                        {mod.title}
                      </h3>

                      {/* Pills */}
                      <div className="mt-4 flex flex-wrap gap-2">
                        {mod.pills.map((pill) => (
                          <span
                            key={pill}
                            className="glass-chip rounded-xl px-3.5 py-1.5 text-xs font-medium text-white/90"
                          >
                            {pill}
                          </span>
                        ))}
                      </div>

                      {/* Description */}
                      <p className="mt-4 text-sm leading-relaxed text-white/75">
                        {mod.description}
                      </p>
                    </div>

                    {/* Divider & Bottom Action Row */}
                    <div className="mt-6 border-t border-white/15 pt-5 flex items-center justify-between gap-4">
                      <div>
                        <p className="font-heading text-base font-bold text-white">{mod.metric}</p>
                        <p className="text-xs text-white/55">{mod.location}</p>
                      </div>
                      <Link
                        href={mod.href}
                        className="glass-chip inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-white/25"
                      >
                        {mod.cta}
                        <ArrowUpRight className="size-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* =====================================================================
            SLIDE 4: STRUKTUR HIERARKI MULTI-TENANT & ALUR PERSETUJUAN
           ===================================================================== */}
        <section id="hierarki" className="py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <span className="glass-chip inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-300">
                Arsitektur Aktor &amp; Tenant
              </span>
              <h2 className="mt-4 font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
                4 Aktor Utama &amp; Alur Verifikasi Berjenjang
              </h2>
              <p className="mt-3 text-base text-white/75">
                Sistem mengatur batas akses dan wewenang secara terstruktur antara Super Admin,
                ORMAWA/UKM mandiri, HMJ sebagai induk jurusan, serta HIMA program studi.
              </p>
            </div>

            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {TENANT_TIERS.map((tier, index) => (
                <div
                  key={tier.title}
                  className="glass-card-vikram flex flex-col justify-between rounded-[28px] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/35"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="glass-chip flex size-10 items-center justify-center rounded-full font-heading text-sm font-bold text-emerald-300">
                        0{index + 1}
                      </span>
                      <span className="glass-chip rounded-xl px-3 py-1 text-[11px] font-semibold text-white/85">
                        {tier.badge}
                      </span>
                    </div>

                    <p className="mt-5 text-xs font-medium text-white/65">{tier.role}</p>
                    <h3 className="mt-1 font-heading text-xl font-bold text-white">{tier.title}</h3>
                    <p className="mt-3 text-xs leading-relaxed text-white/75">{tier.description}</p>

                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {tier.pills.map((pill) => (
                        <span
                          key={pill}
                          className="glass-chip rounded-lg px-2.5 py-1 text-[11px] text-white/85"
                        >
                          {pill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 border-t border-white/15 pt-4 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold text-white">{tier.footerLeft}</p>
                      <p className="text-[11px] text-white/55">{tier.footerSub}</p>
                    </div>
                    <Link
                      href={tier.href}
                      className="glass-chip inline-flex items-center gap-1 rounded-xl px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-white/25"
                    >
                      {tier.cta}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* =====================================================================
            SLIDE 5: CAKUPAN MASTER 8 JURUSAN & 43 PROGRAM STUDI POLINELA
           ===================================================================== */}
        <section id="jurusan" className="py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div className="max-w-2xl">
                <span className="glass-chip inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-300">
                  Data Master Akademik Polinela
                </span>
                <h2 className="mt-4 font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  8 Jurusan Resmi &amp; 43 Program Studi
                </h2>
                <p className="mt-3 text-base text-white/75">
                  Basis data SIM ORMAWA &amp; HMJ telah terintegrasi langsung dengan struktur
                  akademik resmi Politeknik Negeri Lampung untuk menaungi setiap HMJ dan HIMA.
                </p>
              </div>
              <div className="glass-chip rounded-2xl px-4 py-2.5 text-xs font-medium text-white/85">
                Total Cakupan: <strong>8 Jurusan</strong> · <strong>43 Prodi (D2/D3/D4/S2)</strong>
              </div>
            </div>

            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {POLINELA_DEPARTMENTS.map((dept) => (
                <div
                  key={dept.code}
                  className="glass-card-vikram flex flex-col justify-between rounded-[26px] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/35"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="glass-chip rounded-xl px-3 py-1 font-heading text-xs font-bold text-emerald-300">
                        {dept.code}
                      </span>
                      <span className="text-xs font-medium text-white/60">{dept.degrees}</span>
                    </div>
                    <h3 className="mt-4 font-heading text-lg font-bold text-white">{dept.name}</h3>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {dept.highlights.map((prodi) => (
                        <span
                          key={prodi}
                          className="rounded-lg border border-white/12 bg-white/[0.06] px-2.5 py-1 text-[11px] text-white/80"
                        >
                          {prodi}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 border-t border-white/15 pt-3.5 flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">{dept.count}</span>
                    <a
                      href="#direktori"
                      className="font-medium text-emerald-300 hover:text-emerald-200"
                    >
                      Lihat HMJ/HIMA →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* =====================================================================
            SLIDE 6: DIREKTORI ORGANISASI PUBLIK INTERAKTIF
           ===================================================================== */}
        <OrganizationDirectory />

        {/* =====================================================================
            SLIDE 7: CALL TO ACTION SEBELUM LOGIN / PENDAFTARAN
           ===================================================================== */}
        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="glass-card-vikram rounded-[32px] p-8 sm:p-12 text-center">
              <span className="glass-chip inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold text-emerald-300">
                Siap Mengelola Organisasi Mahasiswa?
              </span>
              <h2 className="mx-auto mt-4 max-w-2xl font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Akses Portal SIM ORMAWA &amp; HMJ Sekarang
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-base text-white/75">
                Masuk menggunakan akun organisasi yang telah terdaftar atau ajukan pendaftaran akun
                tenant baru untuk ORMAWA, HMJ, maupun HIMA Program Studi Anda.
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-2xl border border-emerald-300/50 bg-emerald-600 px-7 py-3.5 text-sm font-bold text-white shadow-xl shadow-emerald-950/50 transition hover:bg-emerald-500"
                >
                  <LogIn className="size-4" />
                  Masuk ke Portal (/login)
                </Link>
                <Link
                  href="/daftar"
                  className="glass-chip inline-flex items-center gap-2 rounded-2xl px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-white/25"
                >
                  <UserPlus className="size-4" />
                  Ajukan Akun Tenant (/daftar)
                </Link>
                <Link
                  href="/status-pengajuan"
                  className="glass-chip inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-semibold text-white/85 transition hover:bg-white/20 hover:text-white"
                >
                  Cek Status Pengajuan
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* =====================================================================
          GLOSSY TRANSPARENT FOOTER
         ===================================================================== */}
      <footer className="relative z-10 border-t border-white/15 bg-black/45 backdrop-blur-2xl">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <div className="flex items-center gap-3">
                <span className="glass-chip grid size-10 place-items-center rounded-xl text-emerald-300">
                  <Building2 className="size-5" />
                </span>
                <div>
                  <p className="font-heading text-base font-bold text-white">
                    SIM ORMAWA &amp; HMJ
                  </p>
                  <p className="text-xs text-white/60">Politeknik Negeri Lampung</p>
                </div>
              </div>
              <p className="mt-4 text-xs leading-relaxed text-white/70">
                Sistem Informasi Manajemen Organisasi Mahasiswa berbasis web untuk mengelola tenant
                ORMAWA/UKM, HMJ, dan HIMA dalam satu portal terpusat dengan isolasi data yang ketat.
              </p>
            </div>

            <div>
              <h3 className="font-heading text-sm font-bold text-white">Akses Cepat Portal</h3>
              <ul className="mt-3 space-y-2 text-xs text-white/75">
                <li>
                  <Link href="/login" className="hover:text-emerald-300 transition">
                    → Masuk ke Portal (Login)
                  </Link>
                </li>
                <li>
                  <Link href="/daftar" className="hover:text-emerald-300 transition">
                    → Pendaftaran Akun Organisasi Baru
                  </Link>
                </li>
                <li>
                  <Link href="/status-pengajuan" className="hover:text-emerald-300 transition">
                    → Cek Status Pengajuan Akun
                  </Link>
                </li>
                <li>
                  <a href="#direktori" className="hover:text-emerald-300 transition">
                    → Direktori Publik ORMAWA, HMJ &amp; HIMA
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-heading text-sm font-bold text-white">
                Kontak &amp; Institusi
              </h3>
              <div className="mt-3 space-y-2.5 text-xs text-white/75">
                <p className="flex items-start gap-2">
                  <MapPin className="size-4 shrink-0 text-emerald-300 mt-0.5" />
                  <span>
                    Jl. Soekarno Hatta No.10, Rajabasa Raya, Kec. Rajabasa, Kota Bandar Lampung,
                    Lampung 35144
                  </span>
                </p>
                <p className="flex items-center gap-2">
                  <Mail className="size-4 shrink-0 text-emerald-300" />
                  <a
                    href="mailto:kemahasiswaan@polinela.ac.id"
                    className="hover:text-emerald-300 underline underline-offset-2"
                  >
                    kemahasiswaan@polinela.ac.id
                  </a>
                </p>
                <p className="flex items-center gap-2">
                  <Layers className="size-4 shrink-0 text-emerald-300" />
                  <span>8 Jurusan Resmi · 43 Program Studi Terakreditasi</span>
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-white/10 pt-6 flex flex-col items-center justify-between gap-4 text-xs text-white/55 sm:flex-row">
            <p>© {new Date().getFullYear()} Politeknik Negeri Lampung · SIM ORMAWA &amp; HMJ.</p>
            <p>Project Based Learning (PBL) — Multi-Tenant Portal</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
