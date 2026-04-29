function EnergyDot({ level }) {
  const colors = {
    low: 'bg-vividia-teal',
    medium: 'bg-vividia-amber',
    high: 'bg-vividia-coral',
  };

  return <span className={`h-2.5 w-2.5 rounded-full ${colors[level] || 'bg-vividia-purple'}`} />;
}

function CompletionConfetti() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {[...Array.from({ length: 14 })].map((_, index) => (
        <span
          key={index}
          className="confetti-piece"
          style={{
            left: `${6 + index * 6.5}%`,
            animationDelay: `${index * 0.08}s`,
          }}
        />
      ))}
    </div>
  );
}

export function TaskCard({ task, checked, onToggle, onSchedule }) {
  return (
    <div className="rounded-3xl border border-vividia-line bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start gap-4">
        <button
          onClick={() => onToggle(task.id)}
          className={`mt-1 flex h-6 w-6 items-center justify-center rounded-full border transition ${
            checked ? 'border-vividia-teal bg-vividia-teal text-white' : 'border-vividia-line bg-white'
          }`}
        >
          {checked ? '✓' : ''}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={`text-base font-medium ${checked ? 'text-vividia-muted line-through' : 'text-vividia-ink'}`}>
              {task.task}
            </h3>
            <span className="rounded-full bg-vividia-bg px-3 py-1 text-xs font-medium text-vividia-muted">
              {task.duration_min} min
            </span>
            {task.carry_over ? (
              <span className="rounded-full bg-[#FFF4F1] px-3 py-1 text-xs font-medium text-[#B75244]">
                Carry over
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-vividia-muted">{task.why}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-vividia-muted">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#F5FBF8] px-3 py-1">
              <EnergyDot level={task.energy_level} />
              {task.energy_level} energy
            </span>
            {task.calendar_block ? (
              <button
                onClick={() => onSchedule(task)}
                className="rounded-full bg-vividia-teal/12 px-3 py-1 font-medium text-vividia-teal"
              >
                {task.calendar_block}
              </button>
            ) : (
              <span className="rounded-full bg-vividia-bg px-3 py-1 text-xs font-medium text-vividia-muted">
                Later today
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ErrorCard({ message, onRetry }) {
  return (
    <div className="rounded-3xl border border-[#FFD3CB] bg-[#FFF4F1] p-5 text-[#B75244] shadow-sm">
      <p className="text-base font-medium">{message}</p>
      <button
        onClick={onRetry}
        className="mt-4 rounded-full bg-white px-4 py-2 text-sm font-medium text-vividia-ink shadow-sm"
      >
        Try again
      </button>
    </div>
  );
}

function CompletionCard({ streakDays, onLoadTomorrowTasks }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-[#DCD7FF] bg-gradient-to-br from-[#F7F4FF] to-[#EDF8F2] p-6 shadow-glow">
      <CompletionConfetti />
      <div className="relative">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-vividia-purple">Today complete</p>
        <h3 className="mt-2 text-2xl font-medium text-vividia-ink">You finished everything early.</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-vividia-muted">
          Your streak is sitting at {streakDays} day{streakDays === 1 ? '' : 's'}. Take the win, then load tomorrow&apos;s tasks early if you want a softer morning.
        </p>
        <button
          onClick={onLoadTomorrowTasks}
          className="mt-5 rounded-full bg-vividia-purple px-5 py-3 text-sm font-medium text-white shadow-sm"
        >
          Load tomorrow&apos;s tasks early
        </button>
      </div>
    </div>
  );
}

export default function TodayTab({
  plan,
  completedTaskIds,
  onToggleTask,
  onScheduleTask,
  errorCard,
  onRetryPlan,
  allTodayTasksComplete,
  streakDays,
  onLoadTomorrowTasks,
}) {
  return (
    <div className="space-y-4">
      {errorCard ? <ErrorCard message={errorCard.message} onRetry={onRetryPlan} /> : null}

      {allTodayTasksComplete ? (
        <CompletionCard streakDays={streakDays} onLoadTomorrowTasks={onLoadTomorrowTasks} />
      ) : null}

      {plan.adjustment_note ? (
        <div className="rounded-3xl border border-[#F4D7A5] bg-[#FFF7E7] p-5 text-sm font-medium text-[#9A6A17] shadow-sm">
          {plan.adjustment_note}
        </div>
      ) : null}

      {plan.todays_tasks.length ? (
        plan.todays_tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            checked={completedTaskIds.includes(task.id)}
            onToggle={onToggleTask}
            onSchedule={onScheduleTask}
          />
        ))
      ) : (
        <div className="rounded-3xl border border-vividia-line bg-white p-6 shadow-sm">
          <p className="text-lg font-medium text-vividia-ink">No tasks yet</p>
          <p className="mt-2 text-sm text-vividia-muted">Try refreshing the plan so Vividia can rebuild today with gentler fallbacks.</p>
        </div>
      )}

      <div className="rounded-3xl border border-vividia-line bg-white p-5 shadow-sm">
        <p className="text-sm font-medium text-vividia-muted">Today&apos;s quote</p>
        <p className="mt-2 text-lg font-medium text-vividia-ink">{plan.todays_quote.text}</p>
        <p className="mt-3 inline-flex rounded-full bg-vividia-bg px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-vividia-purple">
          {plan.todays_quote.theme}
        </p>
      </div>
    </div>
  );
}
