"use client";

import { signIn } from "next-auth/react";
import { FcGoogle } from "react-icons/fc";
import { FaInstagram, FaLinkedin, FaWhatsapp } from "react-icons/fa";
import { IoClose } from "react-icons/io5"; // A better close icon

type ConnectSocialAccountsModalProps = {
  setIsClickedConnectAccount: (isClicked: boolean) => void;
  connectedProviders: string[];
};

export const ConnectSocialAccountsModal = ({
  setIsClickedConnectAccount,
  connectedProviders,
}: ConnectSocialAccountsModalProps) => {
  const handleGoogleSignIn = async () => {
    // Just trigger signin - the useEffect hook will handle logging after redirect
    await signIn("google", { callbackUrl: "/home" });
  };

  const handleLinkedInSignIn = async () => {
    await signIn("linkedin", { callbackUrl: "/home" });
  };

  const handleWhatsAppSignIn = async () => {
    await signIn("whatsapp", { callbackUrl: "/home" });
  };

  const isConnected = (provider: string) =>
    connectedProviders.includes(provider);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      {/* Modal Card */}
      <div className="bg-[#121212] border border-white/10 rounded-3xl p-8 w-full max-w-sm shadow-2xl relative">
        {/* Close Button - Top Right */}
        <button
          onClick={() => setIsClickedConnectAccount(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          <IoClose size={24} />
        </button>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-semibold text-white">
            Connect Accounts
          </h2>
          <p className="text-gray-400 text-sm mt-2">
            Sync your socials to get started
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {/* Google Button */}
          <button
            onClick={handleGoogleSignIn}
            className={`relative flex items-center justify-center gap-3 w-full bg-white hover:bg-gray-100 text-black font-semibold py-3 px-4 rounded-2xl transition-all duration-200 cursor-pointer ${
              isConnected("google")
                ? "ring-2 ring-emerald-400 shadow-[0_0_24px_rgba(52,211,153,0.55)] animate-pulse"
                : ""
            }`}
          >
            <FcGoogle size={22} />
            <span>Continue with Google</span>
          </button>

          {/* Instagram Button */}
          <button className="flex items-center justify-center gap-3 w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium py-3 px-4 rounded-2xl transition-all cursor-pointer">
            <FaInstagram size={20} className="text-pink-500" />
            <span>Instagram</span>
          </button>

          {/*Whats App SignUp*/}
          <button
            onClick={handleWhatsAppSignIn}
            className={`relative flex items-center justify-center gap-3 w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium py-3 px-4 rounded-2xl transition-all cursor-pointer ${
              isConnected("provider_whatsapp")
                ? "ring-2 ring-emerald-400 shadow-[0_0_24px_rgba(52,211,153,0.55)] animate-pulse"
                : ""
            }`}
          >
            <FaWhatsapp size={22} className="text-green-500" />
            <span>WhatsApp Business</span>
          </button>

          {/* Linkedin Button */}
          <button
            onClick={handleLinkedInSignIn}
            className={`relative flex items-center justify-center gap-3 w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium py-3 px-4 rounded-2xl transition-all cursor-pointer ${
              isConnected("linkedin")
                ? "ring-2 ring-emerald-400 shadow-[0_0_24px_rgba(52,211,153,0.55)] animate-pulse"
                : ""
            }`}
          >
            <FaLinkedin size={20} className="text-blue-400" />
            <span>LinkedIn</span>
          </button>
        </div>

        <p className="text-center text-xs text-gray-500 mt-8 px-4">
          By connecting, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
};
