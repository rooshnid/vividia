import ReminderBanner from './ReminderBanner';
import TodayTab from './TodayTab';
import RoadmapTab from './RoadmapTab';
import VisionBoard from './VisionBoard';
import ProgressTab from './ProgressTab';
import FuelPack from './FuelPack';

const tabs = ['Today', 'Roadmap', 'Vision Board', 'Progress', 'Fuel Pack'];

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
}) {
  const contentMap = {
    Today: (
      <TodayTab
        plan={dailyPlan}
        completedTaskIds={completedTaskIds}
        onToggleTask={onToggleTask}
        onScheduleTask={onScheduleTask}
      />
    ),
    Roadmap: <RoadmapTab roadmap={goalData.roadmap} />,
    'Vision Board': <VisionBoard visionBoard={goalData.vision_board} />,
    Progress: (
      <ProgressTab
        progress={dailyPlan.progress}
        streakDays={streakDays}
        weekCompletion={weekCompletion}
        completedCount={completedTaskIds.length}
        totalTasks={goalData.allTaskIds.length}
      />
    ),
    'Fuel Pack': <FuelPack fuelPack={goalData.fuel_pack} />,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
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
