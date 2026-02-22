"use client";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { EmailSignInForm } from "../components/EmailSignInForm/EmailSignInForm";
import { ConnectSocialAccountsModal } from "../components/ConnectSocialAccountsModal/ConnectSocialAccountsModal";
import { ConnectAccountButton } from "../components/ConnectAccount/ConnectAccountButton";
import { SignOutButton } from "../components/SignOutButton/SignOutButton";
import { SignInButton } from "../components/SignInButton/SignInButton";
import { useEffect } from "react";
import { fetchAccount, fetchAccounts } from "../util/fetchAccount";
import { sendAccountToReadEmailAPI } from "../util/sendAccountToReadEmailAPI";
import { AgentMessageFeed } from "../components/AgentMessageFeed/AgentMessageFeed";
import { FcGoogle } from "react-icons/fc";
import { FaLinkedin, FaWhatsapp } from "react-icons/fa";

const Page = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isClickedConnectAccount, setIsClickedConnectAccount] = useState(false);
  const [email, setEmail] = useState("");
  const { data: session, status } = useSession();
  const [messages, setMessages] = useState<Array<string>>([]);
  const [accounts, setAccounts] = useState<any[]>([]);

  let isMounted = true;

  useEffect(() => {
    const logAccountDetails = async () => {
      if (session?.user?.id && status === "authenticated") {
        try {
          const connectedAccounts = await fetchAccounts(session.user.id);
          await fetch("/api/gmail-watch", { method: "POST" });
          // Only proceed if the component hasn't unmounted/re-rendered
          if (isMounted) {
            setAccounts(connectedAccounts);
          }
        } catch (error) {
          if (isMounted) console.error("Error fetching account:", error);
        }
      }
    };

    logAccountDetails();

    // Cleanup function: This runs when the component re-renders or unmounts
    return () => {
      isMounted = false;
    };
  }, [session, status]);
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-red-200 via-purple-300 to-blue-400 p-6 relative">
      {isOpen && (
        <EmailSignInForm
          email={email}
          setEmail={setEmail}
          setIsOpen={setIsOpen}
        />
      )}

      {isClickedConnectAccount && (
        <ConnectSocialAccountsModal
          setIsClickedConnectAccount={setIsClickedConnectAccount}
          connectedProviders={accounts.map((item) => item.provider)}
        />
      )}

      {/* 2. MAIN LAYOUT */}
      <div className="flex flex-row w-full max-w-8xl mx-auto backdrop-blur-xl bg-white/10 border-l border-white/30 rounded-[2.5rem] shadow-2xl overflow-hidden">
        {/* Sidebar */}
        <div className="w-30 flex flex-col gap-6 p-8 border-r border-white/10">
          {session ? (
            <div className="flex flex-col gap-4 cursor-pointer">
              <ConnectAccountButton
                setIsClickedConnectAccount={setIsClickedConnectAccount}
              />
              {accounts.some((item) => item.provider === "google") && (
                <div className="flex items-center justify-between ml-3">
                  <div className="group relative flex h-9 w-9 min-w-9 items-center justify-center rounded-full bg-white shadow-md ring-2 ring-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.55)] animate-pulse">
                    <FcGoogle size={20} />
                    <span className="pointer-events-none absolute left-11 top-1/2 -translate-y-1/2 rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      Connected
                    </span>
                  </div>
                </div>
              )}
              {accounts.some((item) => item.provider === "linkedin") && (
                <div className="flex items-center justify-between ml-3">
                  <div className="group relative flex h-9 w-9 min-w-9 items-center justify-center rounded-full bg-white shadow-md ring-2 ring-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.55)] animate-pulse">
                    <FaLinkedin size={16} className="text-[#0A66C2]" />
                    <span className="pointer-events-none absolute left-11 top-1/2 -translate-y-1/2 rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      Connected
                    </span>
                  </div>
                </div>
              )}
              {accounts.some((item) => item.provider === "whatsapp") && (
                <div className="flex items-center justify-between ml-3">
                  <div className="group relative flex h-9 w-9 min-w-9 items-center justify-center rounded-full bg-white shadow-md ring-2 ring-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.55)] animate-pulse">
                    <FaWhatsapp size={16} className="text-[#25D366]" />
                    <span className="pointer-events-none absolute left-11 top-1/2 -translate-y-1/2 rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      Connected
                    </span>
                  </div>
                </div>
              )}
              <SignOutButton signOut={signOut} />
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <SignInButton setIsOpen={setIsOpen} />
            </div>
          )}
        </div>

        {/* Main Window */}
        <div className="flex-1 p-4">
          {session?.user?.id ? (
            <AgentMessageFeed messages={messages} loading={false} />
          ) : (
            <div className="h-full w-full bg-gradient-to-b from-white/95 to-blue-50/96 rounded-[2rem] border-2 border-white shadow-inner flex items-center justify-center">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Main Window
              </h2>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Page;
