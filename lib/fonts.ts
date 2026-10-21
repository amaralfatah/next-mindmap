import { Fredoka, Geist_Mono, Inter, Nunito } from "next/font/google";

// Round, friendly faces: Fredoka for headings, Nunito for body text.
const display = Fredoka({ variable: "--font-display-face", subsets: ["latin"] });
const body = Nunito({ variable: "--font-body", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-mono-face", subsets: ["latin"] });
// Inter SemiBold is the Sararia family's lockup face (sararia-logo/FAMILY.md), used only there.
const brand = Inter({ variable: "--font-brand-face", subsets: ["latin"], weight: "600" });

export const fontVariables = `${display.variable} ${body.variable} ${mono.variable} ${brand.variable}`;
