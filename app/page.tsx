import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export default async function Home() {
  redirect((await getSession()) ? "/data/campaigns" : "/auth/login");
}
