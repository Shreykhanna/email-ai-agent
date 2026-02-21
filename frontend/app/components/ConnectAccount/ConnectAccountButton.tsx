import { CiCirclePlus } from "react-icons/ci";

type SignInButtonProps = {
  setIsClickedConnectAccount: (isClicked: boolean) => void;
};
export const ConnectAccountButton = ({
  setIsClickedConnectAccount,
}: SignInButtonProps) => {
  return (
    <CiCirclePlus
      size={48}
      className="text-white mx-auto mb-4"
      onClick={() => setIsClickedConnectAccount(true)}
      title="Connect your account"
    >
      <button
        className="flex items-center gap-3 bg-white/20 hover:bg-white/30 transition-all p-3 rounded-2xl text-white font-medium border border-white/20"
        // Open the modal
      >
        <span className="w-5 h-5 bg-white rounded-full"></span>
        Connect your Account
      </button>
    </CiCirclePlus>
  );
};
