export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-frost-white dark:bg-[#1a2229] flex items-center justify-center px-4 py-8 transition-colors">
      <div className="w-full max-w-4xl">
        {children}
      </div>
    </div>
  );
}
