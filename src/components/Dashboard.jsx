import ReminderBanner from './ReminderBanner';
import TodayTab from './TodayTab';
import RoadmapTab from './RoadmapTab';
import VisionBoard from './VisionBoard';
import ProgressTab from './ProgressTab';
import FuelPack from './FuelPack';

const tabs = ['Today', 'Roadmap', 'Vision Board', 'Progress', 'Fuel Pack'];

function StatusCard({ panel }) {
  const toneClasses = {
    purple: 'border-[#DCD7FF] bg-[#F6F3FF] text-vividia-purple',
    teal: 'border-[#BDE8D8] bg-[#F2FBF7] text-vividia-teal',
    amber: 'border-[#F4D7A5] bg-[#FFF7E7] text-[#9A6A17]',
    coral: 'border-[#FFD3CB] bg-[#FFF4F1] text-[#B75244]',
  };

  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${toneClasses[panel.tone] || toneClasses.purple}`}>
      <p className="text-sm font-medium uppercase tracking-[0.16em]">{panel.title}</p>
      <p className="mt-2 text-sm leading-6">{panel.body}</p>
      {panel.action ? (
        <button
          onClick={panel.action}
          className="mt-4 rounded-full bg-white/85 px-4 py-2 text-sm font-medium text-vividia-ink shadow-sm"
        >
          {panel.actionLabel}
        </button>
      ) : null}
    </div>
  );
}

export default function Dashboard({
  activeTab,
  setActiveTab,
  goalData,
  dailyPlan,
  completedTaskIds,
  onToggleTask,
  onScheduleTask,
  streakDays,
  weekCompletion,
  offline,
  onReconnectCalendar,
  statusPanels,
  errorCard,
  onRetryPlan,
  onLoadTomorrowTasks,
  allTodayTasksComplete,
  onEditGoal,
  completedCount,
  totalTasks,
}) {
  const contentMap = {
    Today: (
      <TodayTab
        plan={dailyPlan}
        completedTaskIds={completedTaskIds}
        onToggleTask={onToggleTask}
        onScheduleTask={onScheduleTask}
        errorCard={errorCard}
        onRetryPlan={onRetryPlan}
        allTodayTasksComplete={allTodayTasksComplete}
        streakDays={streakDays}
        onLoadTomorrowTasks={onLoadTomorrowTasks}
      />
    ),
    Roadmap: <RoadmapTab roadmap={goalData.roadmap} />,
    'Vision Board': <VisionBoard visionBoard={goalData.vision_board} />,
    Progress: (
      <ProgressTab
        progress={dailyPlan.progress}
        streakDays={streakDays}
        weekCompletion={weekCompletion}
        completedCount={completedCount}
        totalTasks={totalTasks}
        completedGoal={dailyPlan.progress.percent_complete >= 100}
      />
    ),
    'Fuel Pack': <FuelPack fuelPack={goalData.fuel_pack} />,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-5 pt-16 lg:flex-row lg:items-end lg:justify-between lg:pt-10">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-vividia-purple">{goalData.goal_title}</p>
          <h1 className="mt-2 text-3xl font-medium text-vividia-ink md:text-4xl">{dailyPlan.greeting}</h1>
          <p className="mt-3 max-w-2xl text-base text-vividia-muted">{goalData.goal_summary}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-white px-4 py-2 text-sm font-medium text-vividia-ink shadow-sm">
            Streak: {streakDays} days
          </span>
          {offline ? (
            <span className="rounded-full bg-[#FFF1D9] px-4 py-2 text-sm font-medium text-[#9A6A17] shadow-sm">
              Working offline
            </span>
          ) : null}
          <button
            onClick={onEditGoal}
            className="rounded-full border border-vividia-line bg-white px-4 py-2 text-sm font-medium text-vividia-muted shadow-sm"
          >
            Regenerate plan
          </button>
        </div>
      </header>

      <div className="mt-8">
        <ReminderBanner
          message={dailyPlan.streak_message}
          nextBlock={dailyPlan.calendar_suggestions?.[0]?.block_time}
          offline={offline}
          onReconnect={onReconnectCalendar}
        />
      </div>

      {statusPanels.length ? (
        <div className="mt-6 grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
          {statusPanels.map((panel) => (
            <StatusCard key={`${panel.title}-${panel.body}`} panel={panel} />
          ))}
        </div>
      ) : null}

      <nav className="scrollbar-hide mt-8 overflow-x-auto">
        <div className="inline-flex min-w-full gap-2 rounded-full bg-white/80 p-2 shadow-sm backdrop-blur">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-full px-5 py-2.5 text-sm font-medium transition ${
                activeTab === tab
                  ? 'bg-vividia-purple text-white shadow-sm'
                  : 'text-vividia-muted hover:bg-vividia-bg hover:text-vividia-ink'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </nav>

      <main className="mt-8">{contentMap[activeTab]}</main>
    </div>
  );
}
