export function getAuthErrorMessage(error: string | null) {
  if (error === "CredentialsSignin") {
    return "Invalid email or password.";
  }

  if (error === "AccessDenied") {
    return "Access denied. Only admin accounts can Google login.";
  }

  if (error) {
    return "We could not sign you in. Please try again.";
  }

  return "";
}
