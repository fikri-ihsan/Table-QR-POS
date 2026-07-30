export default function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="text-center py-16">
      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-100 flex items-center justify-center">
        <span className="text-lg text-red-600">!</span>
      </div>
      <p className="text-sm text-zinc-400 mb-3">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700">
          Coba Lagi
        </button>
      )}
    </div>
  );
}
