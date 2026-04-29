export default function RoadmapTab({ roadmap }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
      <section className="rounded-3xl border border-vividia-line bg-white p-6 shadow-sm">
        <h3 className="text-lg font-medium text-vividia-ink">This month</h3>
        <div className="mt-5 grid gap-4">
          {roadmap.monthly.map((week) => (
            <div key={week.week} className="rounded-3xl bg-vividia-bg p-4">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-vividia-purple">Week {week.week}</p>
              <h4 className="mt-2 text-base font-medium text-vividia-ink">{week.focus}</h4>
              <p className="mt-2 text-sm text-vividia-muted">{week.key_action}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-3xl border border-vividia-line bg-white p-6 shadow-sm">
        <h3 className="text-lg font-medium text-vividia-ink">Big checkpoints</h3>
        <div className="mt-5 space-y-4">
          {roadmap.yearly.map((item, index) => (
            <div key={`${item.milestone}-${index}`} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span className="mt-1 h-3 w-3 rounded-full bg-vividia-purple" />
                {index < roadmap.yearly.length - 1 ? <span className="mt-2 h-full w-px bg-vividia-line" /> : null}
              </div>
              <div className="pb-5">
                <p className="text-sm font-medium text-vividia-muted">{item.month_target}</p>
                <h4 className="mt-1 text-base font-medium text-vividia-ink">{item.milestone}</h4>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-3xl border border-vividia-line bg-white p-6 shadow-sm xl:col-span-2">
        <h3 className="text-lg font-medium text-vividia-ink">This week</h3>
        <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
          {roadmap.this_week.map((day) => (
            <div key={day.day} className="rounded-3xl bg-[#FCFCFF] p-4">
              <p className="text-sm font-medium text-vividia-purple">{day.day}</p>
              <div className="mt-3 space-y-2">
                {day.tasks.map((task) => (
                  <div key={task.id} className="rounded-2xl border border-vividia-line bg-white p-3">
                    <p className="text-sm font-medium text-vividia-ink">{task.task}</p>
                    <p className="mt-1 text-xs text-vividia-muted">{task.duration_min} min</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
