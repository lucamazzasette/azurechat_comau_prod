import { redirectIfAuthenticated } from "@/features/auth-page/helpers";
import { LogIn } from "@/features/auth-page/login";

export default async function Home() {
  await redirectIfAuthenticated();
  return (
    <main className="container max-w-lg flex items-center">
      <LogIn
        azureAdEnabled={!!(
          process.env.AZURE_AD_CLIENT_ID &&
          process.env.AZURE_AD_CLIENT_SECRET &&
          process.env.AZURE_AD_TENANT_ID
        )}
      />
    </main>
  );
}
