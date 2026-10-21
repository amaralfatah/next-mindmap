import type { Metadata } from "next";
import { DemoRoute } from "@/components/editor/editor";
import { dictionaries } from "@/lib/i18n";
import { requestLocale } from "@/lib/locale-server";

export async function generateMetadata(): Promise<Metadata> {
  const t = dictionaries[await requestLocale()];
  return { title: t.home.tryFirst };
}

export default function DemoPage() {
  return <DemoRoute />;
}
