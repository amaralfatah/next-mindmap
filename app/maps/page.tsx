import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Home } from "@/components/home/home";
import { auth } from "@/lib/auth/server";
import { dictionaries } from "@/lib/i18n";
import { requestLocale } from "@/lib/locale-server";

export async function generateMetadata(): Promise<Metadata> {
  const t = dictionaries[await requestLocale()];
  return { title: t.home.yourMaps };
}

export default async function MapsPage() {
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect("/");
  return <Home view="maps" />;
}
