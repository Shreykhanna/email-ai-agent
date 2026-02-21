export const SenderBox = ({ text }: { text: string }) => {
  return (
    <div className="flex p-4 mb-2 border rounded h-2 w-40 bg-gray-400 items-center justify-center">
      {text}
    </div>
  );
};
