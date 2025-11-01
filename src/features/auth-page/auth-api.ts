import NextAuth, { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import { Provider } from "next-auth/providers/index";

const configureIdentityProvider = () => {
  const providers: Array<Provider> = [];

  const adminEmails = process.env.ADMIN_EMAIL_ADDRESS?.split(",").map((email) =>
    email.toLowerCase().trim()
  );

  // Check if we're in build mode (no NEXTAUTH_URL typically means build time)
  const isBuildTime = typeof window === 'undefined' && !process.env.NEXTAUTH_URL;

  // Only Azure AD provider is supported
  if (
    process.env.AZURE_AD_CLIENT_ID &&
    process.env.AZURE_AD_CLIENT_SECRET &&
    process.env.AZURE_AD_TENANT_ID
  ) {
    providers.push(
      AzureADProvider({
        clientId: process.env.AZURE_AD_CLIENT_ID!,
        clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
        tenantId: process.env.AZURE_AD_TENANT_ID!,
        authorization: {
          params: {
            scope: "openid profile email User.Read",
            response_type: "code",
            response_mode: "query",
          },
        },
        async profile(profile, tokens) {
          console.log("Azure AD profile received:", { 
            email: profile.email, 
            preferred_username: profile.preferred_username,
            sub: profile.sub 
          });
          
          const email = profile.email || profile.preferred_username || "";
          
          // Don't block authentication on profile picture fetching
          let profileImage = "";
          try {
            // Fetch profile picture asynchronously without blocking
            fetchProfilePicture(`https://graph.microsoft.com/v1.0/me/photos/48x48/$value`, tokens.access_token)
              .then((image) => {
                if (image) {
                  console.log("Profile picture fetched successfully (async)");
                }
              })
              .catch((error) => {
                console.warn("Profile picture fetch failed (non-blocking):", error.message);
              });
          } catch (error) {
            console.warn("Profile picture fetch error (non-blocking):", error);
          }
          
          const newProfile = {
            ...profile,
            email,
            id: profile.sub,
            isAdmin:
              adminEmails?.includes(profile.email?.toLowerCase()) ||
              adminEmails?.includes(profile.preferred_username?.toLowerCase()),
            image: profileImage, // Start with empty, will be updated async
          };
          
          console.log("Azure AD profile processed:", {
            id: newProfile.id,
            email: newProfile.email,
            isAdmin: newProfile.isAdmin
          });
          
          return newProfile;
        },
      })
    );
  } else if (!isBuildTime) {
    // Only warn at runtime, not during build
    console.warn("Azure AD configuration missing. Please ensure AZURE_AD_CLIENT_ID, AZURE_AD_CLIENT_SECRET, and AZURE_AD_TENANT_ID are set in your environment variables.");
    console.warn("Authentication will not work without these environment variables.");
  }

  return providers;
};

export const fetchProfilePicture = async (profilePictureUrl: string, accessToken: any): Promise<string | null> => {
  if (!accessToken) {
    console.warn("No access token provided for profile picture fetch");
    return null;
  }

  try {
    console.log("Fetching profile picture...");
    
    const response = await fetch(profilePictureUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      // Don't treat 404 as an error - user might not have a profile picture
      if (response.status === 404) {
        console.log("No profile picture found (404) - this is normal");
        return null;
      }
      
      console.warn(`Profile picture fetch failed: ${response.status} ${response.statusText}`);
      return null;
    }

    const pictureBuffer = await response.arrayBuffer();
    
    if (pictureBuffer.byteLength === 0) {
      console.warn("Profile picture is empty");
      return null;
    }

    const pictureBase64 = Buffer.from(pictureBuffer).toString("base64");
    const image = `data:image/jpeg;base64,${pictureBase64}`;
    
    console.log("Profile picture fetched successfully");
    return image;
    
  } catch (error: any) {
    // Handle different types of errors gracefully
    if (error.name === 'TimeoutError') {
      console.warn("Profile picture fetch timeout - continuing without image");
    } else if (error.name === 'AbortError') {
      console.warn("Profile picture fetch aborted - continuing without image");
    } else {
      console.warn("Profile picture fetch error:", error.message);
    }
    return null;
  }
};


export const options: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [...configureIdentityProvider()],
  callbacks: {
    async jwt({ token, user, account }) {
      try {
        if (user?.isAdmin) {
          token.isAdmin = user.isAdmin;
        }
        
        // Add account information for debugging
        if (account) {
          console.log("JWT callback - Account provider:", account.provider);
          
          // Log OAuth callback debugging info for production
          if (account.provider === "azure-ad") {
            console.log("Azure AD OAuth callback details:", {
              provider: account.provider,
              type: account.type,
              providerAccountId: account.providerAccountId,
              tokenType: account.token_type,
              scope: account.scope,
              accessTokenExpires: account.expires_at,
              environment: process.env.NODE_ENV,
              nextAuthUrl: process.env.NEXTAUTH_URL
            });
          }
        }
        
        return token;
      } catch (error) {
        console.error("JWT callback error:", error);
        return token;
      }
    },
    async session({ session, token }) {
      try {
        session.user.isAdmin = token.isAdmin as boolean;
        
        // Add user ID to session
        if (token.sub) {
          session.user.id = token.sub;
        }
        
        console.log("Session created for user:", session.user.email);
        return session;
      } catch (error) {
        console.error("Session callback error:", error);
        return session;
      }
    },
    async signIn({ user, account, profile }) {
      try {
        console.log("Sign-in attempt:", {
          provider: account?.provider,
          email: user.email,
          userId: user.id,
          environment: process.env.NODE_ENV,
          nextAuthUrl: process.env.NEXTAUTH_URL
        });
        
        // Only Azure AD provider is allowed
        if (account?.provider === "azure-ad") {
          // Validate that we have required profile data
          if (!user.email && !user.name) {
            console.error("Azure AD sign-in failed: Missing required user profile data");
            return false;
          }
          
          // Log success for production debugging
          console.log("Azure AD sign-in successful:", {
            email: user.email,
            name: user.name,
            timestamp: new Date().toISOString()
          });
          
          return true;
        }
        
        console.warn("Sign-in rejected: Only Azure AD provider is supported, received:", account?.provider);
        return false;
      } catch (error) {
        console.error("Sign-in callback error:", error);
        return false;
      }
    },
    async redirect({ url, baseUrl }) {
      try {
        console.log("Redirect callback:", { url, baseUrl, nextAuthUrl: process.env.NEXTAUTH_URL });
        
        // Handle production redirect properly
        const nextAuthUrl = process.env.NEXTAUTH_URL || baseUrl;
        
        // If url is relative, make it absolute using the correct base URL
        if (url.startsWith("/")) {
          const redirectUrl = new URL(url, nextAuthUrl).toString();
          console.log("Redirecting to relative URL:", redirectUrl);
          return redirectUrl;
        }
        
        // If url is absolute and matches our domain, allow it
        if (url.startsWith(nextAuthUrl)) {
          console.log("Redirecting to same-origin URL:", url);
          return url;
        }
        
        // Default to base URL for safety
        console.log("Redirecting to base URL for security:", nextAuthUrl);
        return nextAuthUrl;
      } catch (error) {
        console.error("Redirect callback error:", error);
        return baseUrl;
      }
    },
  },
  pages: {
    signIn: "/",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  debug: process.env.NODE_ENV === "development" || process.env.DEBUG === "true",
  logger: {
    error(code, metadata) {
      console.error("NextAuth Error:", code, metadata);
      
      // Enhanced logging for OAuth callback errors
      if (code === "OAUTH_CALLBACK_ERROR" || code === "OAUTH_CALLBACK_HANDLER_ERROR") {
        console.error("OAuth Callback Error Details:", {
          error: code,
          metadata,
          nextAuthUrl: process.env.NEXTAUTH_URL,
          environment: process.env.NODE_ENV,
          timestamp: new Date().toISOString()
        });
      }
    },
    warn(code) {
      console.warn("NextAuth Warning:", code);
    },
    debug(code, metadata) {
      if (process.env.DEBUG === "true" || process.env.NODE_ENV === "development") {
        console.log("NextAuth Debug:", code, metadata);
      }
    },
  },
  // Add specific configuration for production
  useSecureCookies: process.env.NODE_ENV === "production",
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" 
        ? `__Secure-next-auth.session-token` 
        : `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === "production"
      }
    }
  }
};

export const handlers = NextAuth(options);
