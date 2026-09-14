import { StoreAdminLogin } from "./StoreAdminLogin";

interface AdminLoginProps {
  onBack: () => void;
  onSuccess?: () => void;
  onGoToSuperAdmin?: () => void;
}

export function AdminLogin(props: AdminLoginProps) {
  return <StoreAdminLogin {...props} />;
}
