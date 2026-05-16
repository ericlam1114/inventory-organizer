export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-paper p-8">
      <div className="w-full max-w-[420px] bg-surface border border-rule rounded-[4px] p-8 lg:p-12">
        {children}
      </div>
    </main>
  );
}
