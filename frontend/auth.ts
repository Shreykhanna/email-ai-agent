import NextAuth from "next-auth";
import EmailProvider from "next-auth/providers/nodemailer";
import { PrismaAdapter } from "@auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/src/lib/prisma";
import LinkedInProvider from "next-auth/providers/linkedin";
import util from "node:util";

export const { handlers, signIn, signOut, auth } = NextAuth({
  debug: true,
  logger: {
    error(code, ...message) {
      console.error("[auth][logger][error][code]", code);

      for (const m of message) {
        console.error(
          "[auth][logger][error][raw]",
          util.inspect(m, { depth: null, colors: false, showHidden: true }),
        );

        if (m instanceof Error) {
          console.error("[auth][logger][error][name]", m.name);
          console.error("[auth][logger][error][msg]", m.message);
          console.error("[auth][logger][error][stack]", m.stack);
          console.error(
            "[auth][logger][error][ownKeys]",
            Reflect.ownKeys(m).map(String),
          );
          // force access non-enumerable cause
          // @ts-ignore
          console.error("[auth][logger][error][cause]", m.cause);
        }
      }
    },
    warn(code, ...message) {
      console.warn("[auth][logger][warn]", code, ...message);
    },
    debug(code, ...message) {
      console.log("[auth][logger][debug]", code, ...message);
    },
  },
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
      // client: {
      //   token_endpoint_auth_method: "client_secret_post",
      // },
      clientId: process.env.WHATSAPP_CLIENT_ID,
      clientSecret: process.env.WHATSAPP_CLIENT_SECRET,
      authorization: {
        url: "https://www.facebook.com/v25.0/dialog/oauth",
        params: {
          scope:
            "public_profile,business_management,whatsapp_business_management,whatsapp_business_messaging",
          response_type: "code",
          config_id: process.env.NEXT_PUBLIC_CONFIGURATION_ID,
          // override_default_response_type: "true",
          // redirect_uri: process.env.META_REDIRECT_URI,
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
    async linkAccount(message) {
      console.log(
        "Linked account:",
        message.account.provider,
        "to user:",
        message.user.id,
      );
    },
  },
});
