import { Geist_Mono, Inter } from "next/font/google";

// Inter carries all text and headings, as in Notion. Weight 600 doubles as the Sararia family's
// lockup face (sararia-logo/FAMILY.md). Geist Mono is only the fallback after the system monospace.
const mono = Geist_Mono({ variable: "--font-mono-face", subsets: ["latin"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const fontVariables = `${mono.variable} ${inter.variable}`;
