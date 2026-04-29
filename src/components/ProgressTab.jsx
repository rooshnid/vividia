function ProgressRing({ value }) {
  const size = 180;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference - (value / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(127,119,221,0.14)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#7F77DD"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dash}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-4xl font-medium text-vividia-ink">{value}%</div>
        <div className="text-sm text-vividia-muted">goal complete</div>
      </div>
    </div>
  );
}

export default function ProgressTab({ progress, streakDays, weekCompletion, completedCount, totalTasks, completedGoal }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
      <section className="rounded-3xl border border-vividia-line bg-white p-6 shadow-sm">
        <ProgressRing value={progress.percent_complete} />
        <div className="mt-6 grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3 text-center">
          <div className="rounded-3xl bg-vividia-bg p-4">
            <p className="text-2xl font-medium text-vividia-ink">{completedCount}</p>
            <p className="text-sm text-vividia-muted">done so far</p>
          </div>
          <div className="rounded-3xl bg-vividia-bg p-4">
            <p className="text-2xl font-medium text-vividia-ink">{totalTasks}</p>
            <p className="text-sm text-vividia-muted">total tasks</p>
          </div>
        </div>
      </section>
      <section className="space-y-6">
        {completedGoal ? (
          <div className="rounded-3xl border border-[#DCD7FF] bg-[#F6F3FF] p-6 shadow-sm">
            <p className="text-sm font-medium uppercase tracking-[0.16em] text-vividia-purple">Completed-goal state</p>
            <h3 className="mt-2 text-2xl font-medium text-vividia-ink">You reached the current finish line.</h3>
            <p className="mt-2 text-sm leading-6 text-vividia-muted">
              This version of the roadmap is complete. You can regenerate a fresh stretch goal any time without losing the work you already did.
            </p>
          </div>
        ) : null}
        <div className="rounded-3xl border border-vividia-line bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-vividia-muted">Current streak</p>
          <div className="mt-2 flex items-end gap-3">
            <h3 className="text-3xl font-medium text-vividia-ink">{streakDays} days</h3>
            <span className="rounded-full bg-[#F5FBF8] px-3 py-1 text-sm font-medium text-vividia-teal">
              Keep your cadence
            </span>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {weekCompletion.map((item) => (
              <span
                key={item.day}
                className={`rounded-full px-4 py-2 text-sm font-medium ${
                  item.complete ? 'bg-vividia-teal text-white' : 'bg-vividia-bg text-vividia-muted'
                }`}
              >
                {item.day}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-vividia-line bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-vividia-muted">Deadline view</p>
          <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3">
            <div className="rounded-3xl bg-vividia-bg p-4">
              <p className="text-2xl font-medium text-vividia-ink">{progress.days_to_deadline}</p>
              <p className="text-sm text-vividia-muted">days left</p>
            </div>
            <div className="rounded-3xl bg-vividia-bg p-4">
              <p className="text-2xl font-medium text-vividia-ink">{progress.tasks_done_today}</p>
              <p className="text-sm text-vividia-muted">done today</p>
            </div>
            <div className="rounded-3xl bg-vividia-bg p-4">
              <p className="text-2xl font-medium text-vividia-ink">{progress.tasks_remaining_today}</p>
              <p className="text-sm text-vividia-muted">left today</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
