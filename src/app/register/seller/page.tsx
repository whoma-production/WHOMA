import { redirect } from "next/navigation";

export default function RegisterSellerPage(): never {
  redirect("/auth/login?message=coming-soon");
}
