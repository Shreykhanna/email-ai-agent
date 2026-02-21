import { signIn } from "next-auth/react";

type EmailSignInFormProps = {
  email: string;
  setEmail: (email: string) => void;
  setIsOpen: (isOpen: boolean) => void;
};
export const EmailSignInForm = ({
  email,
  setEmail,
  setIsOpen,
}: EmailSignInFormProps) => {
  const handleSignInWithEmail = async (formData: any) => {
    console.log("window.location.origin", window.location.origin);
    await signIn("nodemailer", {
      email: email,
      callbackUrl: `${window.location.origin}/home`,
      redirect: false,
    });

    setIsOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="bg-white/80 backdrop-blur-2xl p-8 rounded-[2rem] border border-white shadow-2xl w-full max-w-md transform transition-all">
        <h3 className="text-2xl font-bold text-gray-800 mb-6">Sign In</h3>

        <form action={handleSignInWithEmail} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-gray-600 ml-1">
              Email Address
            </label>
            <input
              type="email"
              id="email-resend"
              name="email"
              required
              placeholder="name@company.com"
              className="w-full mt-1 p-4 rounded-2xl border text-gray-900 border-gray-200 focus:ring-2 focus:ring-purple-400 outline-none transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-2xl shadow-lg hover:opacity-90 transition-opacity"
          >
            Send Magic Link
          </button>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
};
