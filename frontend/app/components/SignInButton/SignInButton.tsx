import { CiLogin } from "react-icons/ci";
type SignInButtonProps = {
  setIsOpen: (isOpen: boolean) => void;
};

export const SignInButton = ({ setIsOpen }: SignInButtonProps) => {
  return (
    <CiLogin
      size={48}
      className="text-white mx-auto mb-4"
      onClick={() => setIsOpen(true)}
      title="Sign In"
    >
      <button className="flex items-center gap-3 bg-white/20 hover:bg-white/30 transition-all p-3 rounded-2xl text-white font-medium border border-white/20">
        <span className="w-5 h-5 bg-white rounded-full"></span>
        Sign In
      </button>
    </CiLogin>
  );
};
