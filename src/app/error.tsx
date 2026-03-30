'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-frost-white">
      <div className="card max-w-md w-full mx-4 text-center">
        <h2 className="text-xl font-bold text-dark-navy mb-2">Something went wrong</h2>
        <p className="text-sm text-slate-blue-gray mb-6">
          {error.message || 'An unexpected error occurred.'}
        </p>
        <button onClick={reset} className="btn-primary">
          Try Again
        </button>
      </div>
    </div>
  );
}
