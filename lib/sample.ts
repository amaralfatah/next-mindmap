import { importMarkdown } from "@/lib/io";
import type { Locale } from "@/lib/i18n";
import type { MindMap } from "@/lib/model";

/** A small map of a crowded head, so a first-time user can poke at Mind Map before making their own. */
const SAMPLE_ID = `# Isi kepalaku

## Kerjaan
- **Laporan Q4**
  > Tenggat Jumat. Minta data penjualan dulu.
- Rapat Senin
  - Siapkan tiga poin
- Belum dibalas
  - Email klien
  - Revisi kontrak

## Keuangan
- Dana darurat
  - Target 6 bulan pengeluaran
- Cicilan
- Langganan yang jarang dipakai

## Nikah
- Cari gedung
  - Bandingkan tiga tempat
- Daftar tamu
- Tabungan nikah

## Belajar
- Kursus yang tertunda
- Buku yang belum selesai

## Kesehatan
- Tidur sebelum jam 11
- Jalan pagi
`;

const SAMPLE_EN = `# On my mind

## Work
- **Q4 report**
  > Due Friday. Ask for the sales numbers first.
- Monday sync
  - Prepare three points
- Still to reply
  - Client email
  - Contract revisions

## Money
- Savings
  - Six months of expenses
- Loan
- Subscriptions I barely use

## Wedding
- Book a venue
  - Compare three places
- Guest list
- Wedding savings

## Learning
- The course I paused
- Books I haven't finished

## Health
- Sleep before 11
- Morning walk
`;

const SAMPLES: Record<Locale, { markdown: string; title: string }> = {
  id: { markdown: SAMPLE_ID, title: "Isi kepalaku" },
  en: { markdown: SAMPLE_EN, title: "On my mind" },
};

/** The no-sign-in demo: the things that pile up once you start standing on your own. */
const DEMO_ID = `# Beranjak dewasa

## Tempat tinggal
- **Cari kontrakan dekat kantor**
  > Bandingkan harga sewa dengan ongkos ke kantor.
- Bayar sewa tiap bulan
- Perabot yang masih kurang

## Adik
- Uang kuliah semester depan
- Laptop buat tugas

## Diri sendiri
- Dana darurat
  - Target 6 bulan pengeluaran
- Tabungan nikah
- Cicilan motor

## Kerjaan
- Minta naik gaji
- Cari kerja sampingan

## Napas sebentar
- Tidur cukup
- Bilang tidak tanpa merasa bersalah
`;

const DEMO_EN = `# Growing up

## A place to live
- **Find a rental near work**
  > Weigh the rent against the commute.
- Monthly rent
- Furniture I still need

## Younger sibling
- Next semester's tuition
- A laptop for school

## Me
- Emergency fund
  - Six months of expenses
- Wedding savings
- Motorbike loan

## Work
- Ask for a raise
- Find a side gig

## Room to breathe
- Enough sleep
- Saying no without guilt
`;

const DEMOS: Record<Locale, { markdown: string; title: string }> = {
  id: { markdown: DEMO_ID, title: "Beranjak dewasa" },
  en: { markdown: DEMO_EN, title: "Growing up" },
};

export function createDemoMap(locale: Locale): MindMap {
  const demo = DEMOS[locale];
  return importMarkdown(demo.markdown, demo.title);
}

export function createSampleMap(locale: Locale): MindMap {
  const sample = SAMPLES[locale];
  return importMarkdown(sample.markdown, sample.title);
}
