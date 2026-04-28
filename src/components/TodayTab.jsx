function EnergyDot({ level }) {
  const colors = {
    low: 'bg-vividia-teal',
    medium: 'bg-vividia-amber',
    high: 'bg-vividia-coral',
  };

  return <span className={`h-2.5 w-2.5 rounded-full ${colors[level] || 'bg-vividia-purple'}`} />;
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
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TodayTab({ plan, completedTaskIds, onToggleTask, onScheduleTask }) {
  return (
    <div className="space-y-4">
      {plan.todays_tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          checked={completedTaskIds.includes(task.id)}
          onToggle={onToggleTask}
          onSchedule={onScheduleTask}
        />
      ))}
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
