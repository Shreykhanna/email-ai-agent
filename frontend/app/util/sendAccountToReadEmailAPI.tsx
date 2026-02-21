export const sendAccountToReadEmailAPI = async (account: any) => {
  try {
    console.log("account", account);
    // const response = await fetch("/api/read", {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify({
    //     accessToken: account.accessToken,
    //     expiresAt: account.expiresAt,
    //     refreshToken: account.refreshToken,
    //     scope: account.scope,
    //     tokenType: account.tokenType,
    //   }),
    // });

    // if (!response.ok) {
    //   throw new Error(`API error: ${response.statusText}`);
    // }

    // const data = await response.json();
    return true;
    // console.log("✅ Read-email API response:", data);
  } catch (error) {
    console.error("❌ Error sending to read-email API:", error);
  }
};
