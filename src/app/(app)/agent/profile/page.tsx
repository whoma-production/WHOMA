import { redirect } from "next/navigation";

export default function AgentProfileIndexPage(): never {
  redirect("/agent/profile/edit");
}
