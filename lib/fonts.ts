import { Fredoka, Geist_Mono, Nunito } from "next/font/google";

// Round, friendly faces: Fredoka for headings and the wordmark, Nunito for body text.
const display = Fredoka({ variable: "--font-display-face", subsets: ["latin"] });
const body = Nunito({ variable: "--font-body", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-mono-face", subsets: ["latin"] });

export const fontVariables = `${display.variable} ${body.variable} ${mono.variable}`;
