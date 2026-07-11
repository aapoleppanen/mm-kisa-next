import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins/admin";
import { magicLink } from "better-auth/plugins/magic-link";
import prisma from "./lib/prisma";
import { sendEmail } from "./lib/email";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  secret: process.env.BETTER_AUTH_SECRET ?? process.env.AUTH_SECRET!,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Reset your MM-Kisa password",
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px">
            <h2 style="margin:0 0 8px">🔑 Reset your password</h2>
            <p style="color:#475569;margin:0 0 16px">
              Someone requested a password reset for this account. If it was you, click below —
              the link expires in an hour. If not, you can ignore this email.
            </p>
            <a href="${url}"
               style="display:inline-block;background:#059669;color:#fff;text-decoration:none;font-weight:700;padding:10px 20px;border-radius:12px">
              Reset password →
            </a>
          </div>`,
      });
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  plugins: [
    admin({
      defaultRole: "user",
    }),
    magicLink({
      // Account creation happens through the signup form only (it surfaces the
      // MobilePay entry-fee reminder) — magic link is sign-in for existing users.
      disableSignUp: true,
      sendMagicLink: async ({ email, url }) => {
        await sendEmail({
          to: email,
          subject: "Your MM-Kisa sign-in link",
          html: `
            <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px">
              <h2 style="margin:0 0 8px">⚽ Sign in to MM-Kisa</h2>
              <p style="color:#475569;margin:0 0 16px">
                Click below to sign in — this link expires in 5 minutes and can only be used once.
              </p>
              <a href="${url}"
                 style="display:inline-block;background:#059669;color:#fff;text-decoration:none;font-weight:700;padding:10px 20px;border-radius:12px">
                Sign in →
              </a>
            </div>`,
        });
      },
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
