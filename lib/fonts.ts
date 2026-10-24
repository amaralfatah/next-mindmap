import { Geist_Mono, Inter } from "next/font/google";

// Text and headings use the platform's system face (SF Pro on Apple devices), set in globals.css.
// Geist Mono is only the fallback after the system monospace face.
const mono = Geist_Mono({ variable: "--font-mono-face", subsets: ["latin"] });
// Inter SemiBold is the Sararia family's lockup face (sararia-logo/FAMILY.md), used only there.
const brand = Inter({ variable: "--font-brand-face", subsets: ["latin"], weight: "600" });

export const fontVariables = `${mono.variable} ${brand.variable}`;
