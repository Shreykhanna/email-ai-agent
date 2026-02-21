"use client";

import { signIn } from "next-auth/react";
import { useEffect, useRef } from "react";
import { FaWhatsapp } from "react-icons/fa";

export default function WhatsAppSignup() {
  const handledCodeRef = useRef(false);

  // const launchWhatsAppSignup = () => {
  //   const appId = process.env.NEXT_PUBLIC_WHATSAPP_BUSINESS_APP_ID;
  //   const configId = process.env.NEXT_PUBLIC_CONFIGURATION_ID;
  //   const redirectUri = process.env.NEXT_PUBLIC_META_REDIRECT_URI;

  //   if (!appId || !configId || !redirectUri) {
  //     console.error("Missing OAuth config for WhatsApp signup.");
  //     return;
  //   }

  //   const extras = encodeURIComponent(
  //     JSON.stringify({ setup: { sessionInfoVersion: 3 } }),
  //   );
  //   const dialogUrl =
  //     "https://www.facebook.com/v25.0/dialog/oauth" +
  //     `?client_id=${encodeURIComponent(appId)}` +
  //     `&redirect_uri=${encodeURIComponent(redirectUri)}` +
  //     `&response_type=code` +
  //     `&config_id=${encodeURIComponent(configId)}` +
  //     `&override_default_response_type=true` +
  //     `&extras=${extras}`;

  //   window.location.assign(dialogUrl);
  // };

  // useEffect(() => {
  //   const params = new URLSearchParams(window.location.search);
  //   const code = params.get("code");

  //   if (!code || handledCodeRef.current) return;

  //   handledCodeRef.current = true;
  //   fetch("/api/whatsapp", {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify({ code }),
  //   }).catch((err) => console.error("Token exchange failed:", err));
  // }, []);

  const launchWhatsAppSignup = async () => {
    await signIn("provider_whatsapp", { callbackUrl: "/home" });
  };
  return (
    <>
      <button
        onClick={launchWhatsAppSignup}
        className="flex items-center justify-center gap-3"
      >
        <FaWhatsapp size={20} className="text-green-500" />
        <span>WhatsApp Business</span>
      </button>
    </>
  );
}
