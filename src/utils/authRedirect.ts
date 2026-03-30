export function getAuthRedirectPath(role: string) {
  if (role === "admin") {
    return "/admin/dashboard";
  }
  if (role === "owner") {
    return "/owner-dashboard";
  }
  if (role === "service_provider") {
    return "/service-provider-dashboard";
  }
  return "/dashboard";
}
