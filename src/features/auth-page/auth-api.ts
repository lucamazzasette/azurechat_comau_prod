import NextAuth, { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import CredentialsProvider from "next-auth/providers/credentials";
import { Provider } from "next-auth/providers/index";
import { hashValue } from "./helpers";

const configureIdentityProvider = () => {
  const providers: Array<Provider> = [];

  const adminEmails = process.env.ADMIN_EMAIL_ADDRESS?.split(",").map((email) =>
    email.toLowerCase().trim()
  );

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
  }

  // If we're in local dev, add a basic credential provider option as well
  // (Useful when a dev doesn't have access to create app registration in their tenant)
  // This currently takes any username and makes a user with it, ignores password
  // Refer to: https://next-auth.js.org/configuration/providers/credentials
  if (process.env.NODE_ENV === "development") {
    providers.push(
      CredentialsProvider({
        name: "localdev",
        credentials: {
          username: { label: "Username", type: "text", placeholder: "dev" },
          password: { label: "Password", type: "password" },
        },
        async authorize(credentials, req): Promise<any> {
          // You can put logic here to validate the credentials and return a user.
          // We're going to take any username and make a new user with it
          // Create the id as the hash of the email as per userHashedId (helpers.ts)
          const username = credentials?.username || "dev";
          const email = username + "@localhost";
          const user = {
            id: hashValue(email),
            name: username,
            email: email,
            isAdmin: adminEmails?.includes(email),
            image: "",
          };
          console.log(
            "=== DEV USER LOGGED IN:\n",
            JSON.stringify(user, null, 2,
            )
          );
          return user;
        },
      })
    );
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
          userId: user.id
        });
        
        // Allow sign-in for Azure AD and credentials providers
        if (account?.provider === "azure-ad" || account?.provider === "credentials") {
          return true;
        }
        
        return false;
      } catch (error) {
        console.error("Sign-in callback error:", error);
        return false;
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
  debug: process.env.NODE_ENV === "development",
  logger: {
    error(code, metadata) {
      console.error("NextAuth Error:", code, metadata);
    },
    warn(code) {
      console.warn("NextAuth Warning:", code);
    },
    debug(code, metadata) {
      if (process.env.DEBUG === "true") {
        console.log("NextAuth Debug:", code, metadata);
      }
    },
  },
};

export const handlers = NextAuth(options);
