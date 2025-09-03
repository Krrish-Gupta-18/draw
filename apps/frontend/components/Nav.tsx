export const Nav = ({ userName }: { userName: string }) => {
  return (
    <>
    <div className="w-full h-16 bg-white flex items-center justify-between px-6 shadow">
      <div className="flex items-center space-x-4">
        {/* <img src="/logo.svg" alt="Logo" className="h-8 w-8" /> */}
        <span className="text-lg font-semibold text-gray-800">Draw App</span>
        <a href="#" className="text-sm text-gray-600 px-2 py-1 rounded hover:bg-gray-100">Home</a>
        <a href="#" className="text-sm text-gray-600 px-2 py-1 rounded hover:bg-gray-100">About us</a>
      </div>
      <div className="flex items-center space-x-4">
        <p className="hidden text-sm sm:block text-gray-600 px-2 py-1 rounded hover:bg-gray-100">{userName}</p>
        <img src="/account.svg" alt="User" className="h-8 w-8 rounded-full border border-gray-300" />
      </div>
    </div>
    </>
  );
}

