import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";

export default async function AdminPage() {
  const admin = await getAdminSession();
  redirect(admin ? "/" : "/admin/login");
}
