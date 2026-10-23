import { LoginView } from "@/components/views/login-view";

export default function AdminLoginPage() {
  return (
    <LoginView
      initialMode="admin"
      showModeTabs={false}
    />
  );
}
