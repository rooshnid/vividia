export default function ReminderBanner({ message, nextBlock, offline, onReconnect }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-vividia-line bg-gradient-to-r from-vividia-purple via-[#938ae8] to-vividia-teal p-6 text-white shadow-glow">
      <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/15 blur-2xl" />
      <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium text-white/80">Morning pulse</p>
          <h2 className="mt-1 text-xl font-medium">{message}</h2>
          <p className="mt-2 text-sm text-white/80">
            Next open space: <span className="font-medium text-white">{nextBlock || 'Pick your soft start window'}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          {offline ? (
            <button
              onClick={onReconnect}
              className="rounded-full bg-white/20 px-4 py-2 text-sm font-medium text-white backdrop-blur"
            >
              Calendar sync paused — tap to reconnect
            </button>
          ) : (
            <span className="rounded-full bg-white/18 px-4 py-2 text-sm font-medium text-white">
              In rhythm today
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
