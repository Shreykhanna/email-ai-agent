import { CiLogout } from "react-icons/ci";

type SignOutButtonProps = {
  signOut: () => void;
};
export const SignOutButton = ({ signOut }: SignOutButtonProps) => {
  return (
    <CiLogout
      size={48}
      className="text-white mx-auto mt-4"
      onClick={() => signOut()}
      title="Sign Out"
    >
      <button className="flex items-center gap-3 bg-white/20 hover:bg-white/30 transition-all p-3 rounded-2xl text-white font-medium border border-white/20">
        <span className="w-5 h-5 bg-white rounded-full"></span>
        Sign Out
      </button>
    </CiLogout>
  );
};
