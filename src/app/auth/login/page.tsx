import { redirect } from "next/navigation";

export default function AuthLoginAliasPage(): never {
  redirect("/sign-in");
}
