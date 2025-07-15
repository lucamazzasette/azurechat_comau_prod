"use client";

import { useSearchParams } from "next/navigation";
import { Button } from "@/features/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/features/ui/card";
import Link from "next/link";

const errorMessages: Record<string, string> = {
  Configuration: "There is a problem with the server configuration.",
  AccessDenied: "You do not have permission to sign in.",
  Verification: "The verification token has expired or has already been used.",
  Default: "An error occurred during authentication.",
  Signin: "Error occurred during sign in process.",
  OAuthSignin: "Error in constructing an authorization URL.",
  OAuthCallback: "Error in handling the response from OAuth provider.",
  OAuthProfile: "Error when requesting user profile from OAuth provider.",
  EmailCreateAccount: "Could not create email provider user in the database.",
  Callback: "Error in the OAuth callback handler route.",
  OAuthAccountNotLinked: "The email on the account is already linked, but not with this OAuth account.",
  EmailSignin: "Sending the verification email failed.",
  CredentialsSignin: "The credentials provided were incorrect.",
  SessionRequired: "You must be signed in to view this page.",
};

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  
  const errorMessage = error && errorMessages[error] 
    ? errorMessages[error] 
    : errorMessages.Default;

  const getErrorDetails = (errorType: string | null) => {
    switch (errorType) {
      case "Configuration":
        return "Please check your Azure AD configuration and environment variables.";
      case "AccessDenied":
        return "Contact your administrator if you believe this is an error.";
      case "OAuthAccountNotLinked":
        return "Try signing in with a different method or contact support.";
      case "CredentialsSignin":
        return "Please check your username and password.";
      default:
        return "Please try signing in again or contact support if the problem persists.";
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-red-600 dark:text-red-400">
            Authentication Error
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-300 mb-2">
              {errorMessage}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {getErrorDetails(error)}
            </p>
          </div>
          
          {error && (
            <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Error Code: <code className="font-mono">{error}</code>
              </p>
            </div>
          )}
          
          <div className="flex flex-col space-y-2">
            <Button asChild>
              <Link href="/">
                Try Again
              </Link>
            </Button>
            
            <Button variant="outline" asChild>
              <Link href="/support">
                Contact Support
              </Link>
            </Button>
          </div>
          
          {process.env.NODE_ENV === "development" && (
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
              <p className="text-xs text-yellow-800 dark:text-yellow-200">
                <strong>Development Mode:</strong> Check the console for detailed error logs.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
