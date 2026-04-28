import { useState } from 'react';

const initialForm = {
  goal: 'Get a software internship at a top company by August',
  deadline: '',
  hoursPerWeek: '10',
  currentSituation: 'I have a few projects, some coursework, and I need a sharper interview plan.',
  mood: 'Focused but a little overwhelmed',
};

export default function Onboarding({ onSubmit, loading, calendarError, onConnectCalendar }) {
  const [form, setForm] = useState(() => {
    const next = { ...initialForm };
    const august = new Date();
    august.setMonth(7, 15);
    next.deadline = august.toISOString().slice(0, 10);
    return next;
  });

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
        <section className="rounded-[2rem] border border-vividia-line bg-white/80 p-8 shadow-glow backdrop-blur">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-vividia-purple">Vividia</p>
          <h1 className="mt-4 max-w-xl text-4xl font-medium leading-tight text-vividia-ink md:text-5xl">
            Turn the dream into a calm daily plan.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-vividia-muted">
            Vividia turns one big goal into a roadmap, reads your free calendar space, and gives you a morning plan that feels supportive instead of overwhelming.
          </p>

          <form className="mt-8 space-y-5" onSubmit={(event) => onSubmit(event, form)}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-vividia-ink">What are you building toward?</span>
              <input
                name="goal"
                value={form.goal}
                onChange={handleChange}
                className="w-full rounded-2xl border border-vividia-line bg-vividia-bg px-4 py-3 text-base text-vividia-ink outline-none ring-0 transition focus:border-vividia-purple"
              />
            </label>
            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-vividia-ink">Deadline</span>
                <input
                  type="date"
                  name="deadline"
                  value={form.deadline}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-vividia-line bg-vividia-bg px-4 py-3 text-base text-vividia-ink outline-none transition focus:border-vividia-purple"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-vividia-ink">Hours per week</span>
                <input
                  type="number"
                  min="1"
                  max="80"
                  name="hoursPerWeek"
                  value={form.hoursPerWeek}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-vividia-line bg-vividia-bg px-4 py-3 text-base text-vividia-ink outline-none transition focus:border-vividia-purple"
                />
              </label>
            </div>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-vividia-ink">Current situation</span>
              <textarea
                name="currentSituation"
                rows="4"
                value={form.currentSituation}
                onChange={handleChange}
                className="w-full rounded-2xl border border-vividia-line bg-vividia-bg px-4 py-3 text-base text-vividia-ink outline-none transition focus:border-vividia-purple"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-vividia-ink">Mood or energy</span>
              <input
                name="mood"
                value={form.mood}
                onChange={handleChange}
                className="w-full rounded-2xl border border-vividia-line bg-vividia-bg px-4 py-3 text-base text-vividia-ink outline-none transition focus:border-vividia-purple"
              />
            </label>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={loading}
                className="rounded-full bg-vividia-purple px-6 py-3 text-base font-medium text-white transition hover:brightness-105 disabled:cursor-wait disabled:opacity-80"
              >
                {loading ? 'Building your roadmap...' : 'Create my roadmap'}
              </button>
              <button
                type="button"
                onClick={onConnectCalendar}
                className="rounded-full border border-vividia-line bg-white px-6 py-3 text-base font-medium text-vividia-ink"
              >
                Connect Google Calendar
              </button>
            </div>

            {calendarError ? <p className="text-sm font-medium text-vividia-coral">{calendarError}</p> : null}
          </form>
        </section>

        <section className="relative overflow-hidden rounded-[2rem] bg-[#221f44] p-8 text-white shadow-glow">
          <div className="glass-orb -top-6 right-8 h-24 w-24 bg-vividia-teal/40 animate-float" />
          <div className="glass-orb bottom-12 left-8 h-20 w-20 bg-vividia-purple/60 animate-float" />
          <div className="relative">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-white/70">Why it clicks</p>
            <div className="mt-6 space-y-5">
              <div className="rounded-3xl border border-white/10 bg-white/8 p-5 backdrop-blur">
                <p className="text-sm text-white/70">Today</p>
                <h3 className="mt-2 text-xl font-medium">Four doable tasks, already matched to your real free time.</h3>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/8 p-5 backdrop-blur">
                <p className="text-sm text-white/70">Roadmap</p>
                <h3 className="mt-2 text-xl font-medium">Weekly focus and milestone pacing so the big goal stops feeling blurry.</h3>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/8 p-5 backdrop-blur">
                <p className="text-sm text-white/70">Vision Board</p>
                <h3 className="mt-2 text-xl font-medium">A beautiful full-screen view you actually want to open in the morning.</h3>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
