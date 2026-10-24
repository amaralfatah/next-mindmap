import { redirect } from "next/navigation";
import { Home } from "@/components/home/home";
import { auth } from "@/lib/auth/server";

export default async function HomePage() {
  const { data: session } = await auth.getSession();
  if (session?.user) redirect("/maps");
  return <Home view="landing" />;
}
