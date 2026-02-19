import { redirect } from "next/navigation";

export default function BestAliasPage() {
  redirect("/feed?mode=BEST");
}
