import { useEffect, useMemo, useState } from 'react';

const initialForm = {
  goal: 'Get a software internship at a top company by August',
  deadline: '',
  hoursPerWeek: '10',
  currentSituation: 'I have a few projects, some coursework, and I need a sharper interview plan.',
  mood: 'Focused but a little overwhelmed',
};

function getDefaultDeadline() {
  const august = new Date();
  august.setMonth(7, 15);
  const local = new Date(august.getTime() - august.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function getTodayDateInput() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export default function Onboarding({
  onSubmit,
  loading,
  calendarError,
  calendarNotice,
  onConnectCalendar,
  initialForm: initialData,
  validateForm,
  isEditing,
  onCancel,
}) {
  const [form, setForm] = useState(() => ({
    ...initialForm,
    deadline: getDefaultDeadline(),
    ...initialData,
  }));

  useEffect(() => {
    setForm({
      ...initialForm,
      deadline: getDefaultDeadline(),
      ...initialData,
    });
  }, [initialData]);

  const validation = useMemo(() => validateForm(form), [form, validateForm]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-8">
        <section className="rounded-[2rem] border border-vividia-line bg-white/80 p-6 shadow-glow backdrop-blur sm:p-8">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-vividia-purple">Vividia</p>
          <h1 className="mt-4 max-w-xl text-3xl font-medium leading-tight text-vividia-ink sm:text-4xl md:text-5xl">
            {isEditing ? 'Refine the plan without losing your momentum.' : 'Turn the dream into a calm daily plan.'}
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-vividia-muted">
            Vividia turns one big goal into a roadmap, reads your free calendar space, and gives you a morning plan that feels supportive instead of overwhelming.
          </p>

          {calendarNotice ? (
            <div className="mt-6 rounded-3xl border border-[#BDE8D8] bg-[#F2FBF7] p-4 text-sm font-medium text-vividia-teal">
              {calendarNotice}
            </div>
          ) : null}

          <form className="mt-8 space-y-5" onSubmit={(event) => onSubmit(event, form)}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-vividia-ink">What are you building toward?</span>
              <input
                name="goal"
                value={form.goal}
                onChange={handleChange}
                className={`w-full rounded-2xl border bg-vividia-bg px-4 py-3 text-base text-vividia-ink outline-none ring-0 transition ${
                  validation.errors.goal ? 'border-vividia-coral' : 'border-vividia-line focus:border-vividia-purple'
                }`}
              />
              {validation.errors.goal ? <p className="mt-2 text-sm font-medium text-vividia-coral">{validation.errors.goal}</p> : null}
            </label>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-5">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-vividia-ink">Deadline</span>
                <input
                  type="date"
                  min={getTodayDateInput()}
                  name="deadline"
                  value={form.deadline}
                  onChange={handleChange}
                  className={`w-full rounded-2xl border bg-vividia-bg px-4 py-3 text-base text-vividia-ink outline-none transition ${
                    validation.errors.deadline ? 'border-vividia-coral' : 'border-vividia-line focus:border-vividia-purple'
                  }`}
                />
                {validation.errors.deadline ? <p className="mt-2 text-sm font-medium text-vividia-coral">{validation.errors.deadline}</p> : null}
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-vividia-ink">Hours per week</span>
                <input
                  type="number"
                  min="0"
                  max="80"
                  name="hoursPerWeek"
                  value={form.hoursPerWeek}
                  onChange={handleChange}
                  className={`w-full rounded-2xl border bg-vividia-bg px-4 py-3 text-base text-vividia-ink outline-none transition ${
                    validation.errors.hoursPerWeek ? 'border-vividia-coral' : 'border-vividia-line focus:border-vividia-purple'
                  }`}
                />
                {validation.errors.hoursPerWeek ? (
                  <p className="mt-2 text-sm font-medium text-vividia-coral">{validation.errors.hoursPerWeek}</p>
                ) : null}
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

            {validation.warnings.length ? (
              <div className="rounded-3xl border border-[#F4D7A5] bg-[#FFF7E7] p-4 text-sm font-medium text-[#9A6A17]">
                {validation.warnings.map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={loading || validation.hasErrors}
                className="rounded-full bg-vividia-purple px-6 py-3 text-base font-medium text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Building your roadmap...' : isEditing ? 'Update my roadmap' : 'Create my roadmap'}
              </button>
              <button
                type="button"
                onClick={onConnectCalendar}
                className="rounded-full border border-vividia-line bg-white px-6 py-3 text-base font-medium text-vividia-ink"
              >
                Connect Google Calendar
              </button>
              {isEditing && onCancel ? (
                <button
                  type="button"
                  onClick={onCancel}
                  className="rounded-full border border-vividia-line bg-white px-6 py-3 text-base font-medium text-vividia-muted"
                >
                  Cancel
                </button>
              ) : null}
            </div>

            {calendarError ? <p className="text-sm font-medium text-vividia-coral">{calendarError}</p> : null}
          </form>
        </section>

        <section className="relative overflow-hidden rounded-[2rem] bg-[#221f44] p-6 text-white shadow-glow sm:p-8">
          <div className="glass-orb -top-6 right-8 h-24 w-24 bg-vividia-teal/40 animate-float" />
          <div className="glass-orb bottom-12 left-8 h-20 w-20 bg-vividia-purple/60 animate-float" />
          <div className="relative">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-white/70">Edge-case ready</p>
            <div className="mt-6 space-y-5">
              <div className="rounded-3xl border border-white/10 bg-white/8 p-5 backdrop-blur">
                <p className="text-sm text-white/70">Low time</p>
                <h3 className="mt-2 text-xl font-medium">If the day is packed, Vividia shrinks the plan instead of pretending you still have a long focus block.</h3>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/8 p-5 backdrop-blur">
                <p className="text-sm text-white/70">Recovery</p>
                <h3 className="mt-2 text-xl font-medium">If you miss a day, the app eases you back in without wiping real progress.</h3>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/8 p-5 backdrop-blur">
                <p className="text-sm text-white/70">Reliability</p>
                <h3 className="mt-2 text-xl font-medium">If the AI or calendar gets weird, the app falls back gracefully and stays usable.</h3>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
