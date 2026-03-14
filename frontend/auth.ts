import NextAuth from "next-auth";
import EmailProvider from "next-auth/providers/nodemailer";
import { PrismaAdapter } from "@auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/src/lib/prisma";
import LinkedInProvider from "next-auth/providers/linkedin";
import type { Account, User } from "next-auth";

const handleGoogleSignIn = async (user: User, account: Account) => {
  if (!account.access_token) return;

  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${account.access_token}` },
  });
  if (!res.ok) {
    console.error("Failed to fetch Google userinfo", res.status);
    return;
  }

  const profile = await res.json();
  const providerEmail =
    typeof profile?.email === "string" ? profile.email : null;

  // Make all google accounts inactive for this user.
  await prisma.account.updateMany({
    where: {
      userId: user.id,
      provider: "google",
    },
    data: { isActive: false },
  });

  // Mark current signed-in google account active.
  await prisma.account.updateMany({
    where: {
      userId: user.id,
      provider: "google",
      providerAccountId: account.providerAccountId,
    },
    data: {
      isActive: true,
      ...(providerEmail ? { providerEmail } : {}),
    },
  });
};

const handleWhatsAppSignIn = async (user: User, account: Account) => {
  if (!account.access_token) return;

  // Make all WhatsApp accounts inactive for this user first.
  await prisma.account.updateMany({
    where: {
      userId: user.id,
      provider: "whatsapp",
    },
    data: { isActive: false },
  });

  // Mark current signed-in WhatsApp account active.
  await prisma.account.updateMany({
    where: {
      userId: user.id,
      provider: "whatsapp",
      providerAccountId: account.providerAccountId,
    },
    data: { isActive: true },
  });

  // Optional: discover phone_number_id for webhook mapping/debugging.
  try {
    const res = await fetch(
      "https://graph.facebook.com/v25.0/me?fields=businesses{owned_whatsapp_business_accounts{id,phone_numbers{id,display_phone_number}}}",
      {
        headers: { Authorization: `Bearer ${account.access_token}` },
      },
    );
    console.log("RESPONSE", res);

    if (!res.ok) return;
    const data = await res.json();
    const phoneNumberId =
      data?.businesses?.data?.[0]?.owned_whatsapp_business_accounts?.data?.[0]
        ?.phone_numbers?.data?.[0]?.id ?? null;

    console.log("****PHONENUMBER ID********");
    console.log(phoneNumberId);

    if (phoneNumberId) {
      console.log("WhatsApp phoneNumberId discovered:", phoneNumberId);
      await prisma.account.updateMany({
        where: {
          userId: user.id,
          provider: "whatsapp",
          providerAccountId: account.providerAccountId,
        },
        data: { phoneNumberId },
      });
    }
  } catch (error) {
    console.error("Failed to fetch WhatsApp phone metadata", error);
  }
};

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.events",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
    LinkedInProvider({
      clientId: process.env.LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "openid profile email",
          response_type: "code",
        },
      },
    }),
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST!,
        port: parseInt(process.env.EMAIL_SERVER_PORT!),
        auth: {
          user: process.env.EMAIL_SERVER_USERNAME,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
        tls: {
          // This tells Node.js to ignore the "self-signed certificate" error
          rejectUnauthorized: false,
        },
      },
      from: process.env.EMAIL_FROM!,
    }),
    {
      id: "whatsapp",
      name: "Whatsapp",
      type: "oauth",
      checks: ["none"],

      clientId: process.env.WHATSAPP_CLIENT_ID,
      clientSecret: process.env.WHATSAPP_CLIENT_SECRET,
      authorization: {
        url: "https://www.facebook.com/v25.0/dialog/oauth",
        params: {
          scope:
            "public_profile,business_management,whatsapp_business_management,whatsapp_business_messaging",
          response_type: "code",
          config_id: process.env.NEXT_PUBLIC_CONFIGURATION_ID,
        },
      },
      token: {
        url: "https://graph.facebook.com/v25.0/oauth/access_token",
        params: {
          redirect_uri: process.env.META_REDIRECT_URI,
        },
      },
      userinfo: {
        url: "https://graph.facebook.com/v25.0/me?fields=id,name",
      },
      profile(profile) {
        console.log("profile", profile);
        return {
          id: profile.id,
          name: profile.name ?? "WhatsApp User",
          email: null,
          image: null,
        };
      },
    },
  ],
  callbacks: {
    async session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
  events: {
    async signIn({ user, account }) {
      if (!account) return;

      if (account.provider === "google") {
        await handleGoogleSignIn(user, account);
      }
      if (account.provider === "whatsapp") {
        console.log("Handling WhatsApp sign-in for user:", user.id);
        console.log("Account details:", account);
        await handleWhatsAppSignIn(user, account);
      }
    },
  },
});
