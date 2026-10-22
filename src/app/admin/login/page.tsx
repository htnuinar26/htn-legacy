import { getConfiguredAdminNames } from "@/lib/auth";
import { LoginView } from "@/components/views/login-view";

export default function AdminLoginPage() {
  return (
    <LoginView
      initialMode="admin"
      showModeTabs={false}
      adminNames={getConfiguredAdminNames()}
    />
  );
}
