import { redirect } from "next/navigation";

export default function AdminDriversPage() {
  redirect("/admin/users?tab=drivers");
}
