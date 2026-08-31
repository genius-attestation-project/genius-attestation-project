export function getAuthErrorMessage(error: string | null) {
  if (error === "CredentialsSignin") {
    return "Invalid email or password.";
  }

  if (error === "AccessDenied") {
    return "Access denied. Only admin accounts can Google login.";
  }

  if (error === "AuthCallbackFailure" || error === "CallbackRouteError") {
    return "Sign-in could not be completed. Please try again in a moment.";
  }

  if (error === "Configuration") {
    return "Authentication is not configured correctly. Please contact support.";
  }

  if (error) {
    return "We could not sign you in. Please try again.";
  }

  return "";
}
