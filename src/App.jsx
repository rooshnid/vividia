import { useEffect, useState } from 'react';
import Dashboard from './components/Dashboard';
import Onboarding from './components/Onboarding';
import { requestDailyRefresh, requestGoalBreakdown } from './api/anthropic';
import {
  authorizeCalendar,
  createCalendarEvent,
  getTodayFreeBlocks,
  initGoogleCalendar,
  isGoogleConfigured,
  mockFreeBlocks,
} from './api/calendar';
import { clearState, loadState, saveState } from './utils/storage';
import { calculateStreak, getDaysBetween, getWeekCompletion } from './utils/streaks';

function formatTargetDate(value) {
  const date = new Date(value);
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: '2-digit', year: 'numeric' }).format(date);
}

function startOfTodayIso() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

function getPromptGoalBreakdown(form, freeBlocks) {
  return `A college student has just set their first goal in Vividia.

Goal: "${form.goal}"
Deadline: ${formatTargetDate(form.deadline)}
Current situation: "${form.currentSituation}"
Hours available per week: ${form.hoursPerWeek}
Today's free calendar blocks: ${JSON.stringify(freeBlocks)}
Current mood/energy: "${form.mood}"

Generate a complete Vividia roadmap. Return ONLY valid JSON matching this exact schema:

{
  "goal_title": "string - concise version of their goal, max 8 words",
  "goal_summary": "string - one sentence on why this goal matters",
  "target_date": "string - formatted as Month DD, YYYY",
  "color_theme": "string - one of: purple | teal | coral | amber - pick what fits the goal energy",
  "roadmap": {
    "yearly": [{ "milestone": "string - major checkpoint", "month_target": "string - e.g. August 2025" }],
    "monthly": [
      { "week": 1, "focus": "string - theme for the week", "key_action": "string - single most important action" },
      { "week": 2, "focus": "string", "key_action": "string" },
      { "week": 3, "focus": "string", "key_action": "string" },
      { "week": 4, "focus": "string", "key_action": "string" }
    ],
    "this_week": [
      {
        "day": "string - e.g. Monday",
        "tasks": [
          {
            "id": "string - unique e.g. t1",
            "task": "string - short, actionable, max 10 words",
            "duration_min": 20,
            "energy_level": "string - low | medium | high",
            "calendar_block": "string - suggested time from free blocks, or null"
          }
        ]
      }
    ],
    "today": [
      {
        "id": "string",
        "task": "string",
        "duration_min": 20,
        "why": "string - one sentence on why this matters today",
        "energy_level": "string - low | medium | high",
        "calendar_block": "string or null"
      }
    ]
  },
  "fuel_pack": {
    "affirmation": "string - one powerful sentence written directly to this student about their specific goal",
    "books": [{ "title": "string", "author": "string", "why": "string - one sentence on relevance to their goal" }],
    "documentaries": [{ "title": "string", "platform_hint": "string - e.g. Netflix | YouTube | Hulu", "why": "string - one sentence" }],
    "playlist_mood": "string - describe the music vibe that fits this goal journey",
    "spotify_search": "string - a ready-to-paste Spotify search query"
  },
  "vision_board": {
    "hero_phrase": "string - bold short phrase for the top of their vision board, max 6 words",
    "visual_keywords": ["string", "string", "string"],
    "milestones_to_celebrate": ["string", "string", "string"],
    "color_theme": "string - same as top-level color_theme"
  },
  "reminders": {
    "suggested_times": ["string - e.g. 9:00 AM", "string - e.g. 3:00 PM"],
    "messages": [
      "string - warm nudge tied to their specific goal, not generic",
      "string - second nudge variant"
    ]
  }
}`;
}

function getPromptDailyRefresh(state, freeBlocks, mood) {
  const totalTasks = state.goalData.allTaskIds.length;
  const completedCount = state.completedTaskIds.length;
  const missedTasks = state.lastDailyPlan?.progress?.tasks_remaining_today || 0;

  return `A student is opening Vividia for today. Here is their current context:

Goal: "${state.goalData.goal_title}"
Days since goal was set: ${getDaysBetween(state.meta.startedAt, new Date())}
Tasks completed so far: ${completedCount} of ${totalTasks}
Tasks missed yesterday: ${missedTasks}
Current streak: ${calculateStreak(state.completedDates)} days
Today's free calendar blocks: ${JSON.stringify(freeBlocks)}
Current mood/energy: "${mood || state.meta.mood || 'steady'}"

Generate today's personalized plan. Return ONLY valid JSON:

{
  "greeting": "string - warm, specific one-sentence good morning message referencing their goal and streak",
  "todays_tasks": [
    {
      "id": "string",
      "task": "string - short, actionable",
      "duration_min": 15,
      "why": "string - one sentence on why this task matters today specifically",
      "energy_level": "string - low | medium | high",
      "calendar_block": "string - from their free blocks, or null"
    }
  ],
  "calendar_suggestions": [
    {
      "block_time": "string - from their free blocks",
      "suggested_task": "string",
      "reason": "string - why this block is ideal for this task"
    }
  ],
  "todays_quote": {
    "text": "string - original motivational insight written by you.",
    "theme": "string - one word describing the quote energy e.g. courage | focus | patience"
  },
  "streak_message": "string - celebratory or encouraging message about their current streak",
  "adjustment_note": "string - if tasks were missed, one gentle non-judgmental reframe. null if nothing was missed.",
  "progress": {
    "percent_complete": 34,
    "tasks_done_today": 0,
    "tasks_remaining_today": 4,
    "days_to_deadline": 47
  }
}`;
}

function buildFallbackRoadmap(form, freeBlocks) {
  const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const todayTasks = [
    {
      id: 't1',
      task: 'Refresh internship target list',
      duration_min: 25,
      why: 'Clarity makes every next application stronger.',
      energy_level: 'medium',
      calendar_block: freeBlocks[0] || null,
    },
    {
      id: 't2',
      task: 'Refine one resume bullet',
      duration_min: 20,
      why: 'Sharper proof points raise interview odds fast.',
      energy_level: 'medium',
      calendar_block: freeBlocks[1] || null,
    },
    {
      id: 't3',
      task: 'Practice two interview stories',
      duration_min: 30,
      why: 'Confidence compounds when your examples feel ready.',
      energy_level: 'high',
      calendar_block: freeBlocks[2] || null,
    },
    {
      id: 't4',
      task: 'Reach out to one alum',
      duration_min: 15,
      why: 'Small network moves can unlock real momentum.',
      energy_level: 'low',
      calendar_block: freeBlocks[0] || null,
    },
  ];

  return {
    goal_title: 'Top internship by August',
    goal_summary: 'You are turning ambition into a repeatable system before recruiting closes.',
    target_date: formatTargetDate(form.deadline),
    color_theme: 'purple',
    roadmap: {
      yearly: [
        { milestone: 'Resume and portfolio fully polished', month_target: 'May 2026' },
        { milestone: 'Strong interview reps and outreach cadence', month_target: 'June 2026' },
        { milestone: 'Offer-ready application pipeline', month_target: 'July 2026' },
      ],
      monthly: [
        { week: 1, focus: 'Sharpen your story', key_action: 'Lock in a resume that sells outcomes.' },
        { week: 2, focus: 'Build signal', key_action: 'Ship one standout project improvement.' },
        { week: 3, focus: 'Practice aloud', key_action: 'Run technical and behavioral reps.' },
        { week: 4, focus: 'Create traction', key_action: 'Send focused applications and warm outreach.' },
      ],
      this_week: weekdays.map((day, index) => ({
        day,
        tasks: todayTasks.slice(index % 2, (index % 2) + 2),
      })),
      today: todayTasks,
    },
    fuel_pack: {
      affirmation: 'You do not need perfect confidence to move like someone who belongs in the room.',
      books: [
        { title: 'Designing Your Life', author: 'Bill Burnett and Dave Evans', why: 'It helps turn uncertainty into structured experiments.' },
        { title: 'The 2-Hour Job Search', author: 'Steve Dalton', why: 'It gives you a focused process for outreach and targeting.' },
      ],
      documentaries: [
        { title: 'Abstract: The Art of Design', platform_hint: 'Netflix', why: 'It reconnects effort with creative ambition and craft.' },
        { title: 'How to Get Ahead in Tech', platform_hint: 'YouTube', why: 'It keeps your momentum grounded in real career moves.' },
      ],
      playlist_mood: 'Warm focus with a little lift for application sprint days',
      spotify_search: 'indie focus soft confidence coding playlist',
    },
    vision_board: {
      hero_phrase: 'You Belong There',
      visual_keywords: ['clean desk glow', 'airport departure energy', 'offer letter screenshot'],
      milestones_to_celebrate: ['First referral sent', 'Interview invite lands', 'Offer week calm'],
      color_theme: 'purple',
    },
    reminders: {
      suggested_times: ['9:00 AM', '3:00 PM'],
      messages: [
        'A small focused block today keeps the internship dream concrete.',
        'You are closer when the work is simple, visible, and repeated.',
      ],
    },
  };
}

function buildFallbackDailyPlan(state, freeBlocks) {
  const tasks = state.goalData.roadmap.today.slice(0, 4);
  const doneToday = tasks.filter((task) => state.completedTaskIds.includes(task.id)).length;
  const daysToDeadline = getDaysBetween(new Date(), new Date(state.meta.deadline));
  const percent = Math.min(100, Math.round((state.completedTaskIds.length / state.goalData.allTaskIds.length) * 100) || 0);

  return {
    greeting: `Good morning. Your ${state.goalData.goal_title.toLowerCase()} plan is ready, and your momentum still counts.`,
    todays_tasks: tasks,
    calendar_suggestions: freeBlocks.slice(0, 3).map((block, index) => ({
      block_time: block,
      suggested_task: tasks[index]?.task || tasks[0].task,
      reason: index === 0 ? 'This is your cleanest focus window.' : 'It keeps the day moving without forcing a huge effort spike.',
    })),
    todays_quote: {
      text: 'Progress feels steadier when you stop negotiating with every small next step.',
      theme: 'focus',
    },
    streak_message: `You are ${calculateStreak(state.completedDates)} days into a pattern that future-you will feel.`,
    adjustment_note: doneToday === 0 ? 'Missed work is feedback, not failure. We keep the plan small and honest today.' : null,
    progress: {
      percent_complete: percent,
      tasks_done_today: doneToday,
      tasks_remaining_today: Math.max(0, tasks.length - doneToday),
      days_to_deadline: daysToDeadline,
    },
  };
}

function normalizeGoalData(data, form, freeBlocks) {
  const base = data?.goal_title ? data : buildFallbackRoadmap(form, freeBlocks);
  const allTaskIds = [
    ...(base.roadmap.today || []).map((task) => task.id),
    ...(base.roadmap.this_week || []).flatMap((day) => day.tasks.map((task) => task.id)),
  ];

  return {
    ...base,
    allTaskIds: [...new Set(allTaskIds)],
  };
}

function LoadingScreen() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="animate-pulse space-y-6">
        <div className="h-36 rounded-[2rem] bg-white/80" />
        <div className="h-12 rounded-full bg-white/70" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-48 rounded-[2rem] bg-white/80" />
          <div className="h-48 rounded-[2rem] bg-white/80" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="h-44 rounded-[2rem] bg-white/80" />
          <div className="h-44 rounded-[2rem] bg-white/80" />
          <div className="h-44 rounded-[2rem] bg-white/80" />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [appState, setAppState] = useState(null);
  const [activeTab, setActiveTab] = useState('Today');
  const [loading, setLoading] = useState(true);
  const [calendarError, setCalendarError] = useState('');
  const [workingOffline, setWorkingOffline] = useState(false);

  useEffect(() => {
    const stored = loadState();

    async function bootstrap() {
      if (!stored) {
        setLoading(false);
        return;
      }

      setAppState(stored);
      await refreshDailyPlan(stored, stored.meta.mood);
      setLoading(false);
    }

    initGoogleCalendar().catch(() => {});
    bootstrap();
  }, []);

  async function connectCalendar() {
    if (!isGoogleConfigured()) {
      setCalendarError('Calendar sync paused — tap to reconnect');
      return;
    }

    try {
      await authorizeCalendar();
      setCalendarError('');
    } catch (error) {
      setCalendarError(error.message);
    }
  }

  async function refreshDailyPlan(stateArg, mood) {
    const state = stateArg || appState;
    if (!state) return;

    const freeBlocks = await getTodayFreeBlocks().catch(() => {
      setCalendarError('Calendar sync paused — tap to reconnect');
      return mockFreeBlocks();
    });

    try {
      const prompt = getPromptDailyRefresh(state, freeBlocks, mood);
      const dailyPlan = await requestDailyRefresh(prompt);
      const nextState = {
        ...state,
        meta: { ...state.meta, mood: mood || state.meta.mood },
        lastDailyPlan: dailyPlan,
      };
      setAppState(nextState);
      saveState(nextState);
      setWorkingOffline(false);
    } catch {
      const fallbackPlan = buildFallbackDailyPlan(state, freeBlocks);
      const nextState = {
        ...state,
        lastDailyPlan: fallbackPlan,
      };
      setAppState(nextState);
      saveState(nextState);
      setWorkingOffline(true);
    }
  }

  async function handleOnboarding(event, form) {
    event.preventDefault();
    setLoading(true);
    setWorkingOffline(false);

    const freeBlocks = await getTodayFreeBlocks().catch(() => {
      setCalendarError('Calendar sync paused — tap to reconnect');
      return mockFreeBlocks();
    });

    try {
      if (isGoogleConfigured()) {
        await authorizeCalendar().catch(() => {
          setCalendarError('Calendar sync paused — tap to reconnect');
        });
      }

      const prompt = getPromptGoalBreakdown(form, freeBlocks);
      const goalData = normalizeGoalData(await requestGoalBreakdown(prompt), form, freeBlocks);
      const state = {
        goalData,
        completedTaskIds: [],
        completedDates: [],
        meta: {
          startedAt: new Date().toISOString(),
          deadline: form.deadline,
          mood: form.mood,
        },
        lastDailyPlan: null,
      };

      setAppState(state);
      saveState(state);
      await new Promise((resolve) => setTimeout(resolve, 2200));
      await refreshDailyPlan(state, form.mood);
    } catch {
      const goalData = normalizeGoalData(null, form, freeBlocks);
      const state = {
        goalData,
        completedTaskIds: [],
        completedDates: [],
        meta: {
          startedAt: new Date().toISOString(),
          deadline: form.deadline,
          mood: form.mood,
        },
        lastDailyPlan: buildFallbackDailyPlan(
          {
            goalData,
            completedTaskIds: [],
            completedDates: [],
            meta: {
              startedAt: new Date().toISOString(),
              deadline: form.deadline,
              mood: form.mood,
            },
          },
          freeBlocks,
        ),
      };
      setAppState(state);
      saveState(state);
      setWorkingOffline(true);
      await new Promise((resolve) => setTimeout(resolve, 2200));
    } finally {
      setLoading(false);
    }
  }

  function handleToggleTask(taskId) {
    if (!appState) return;

    const isDone = appState.completedTaskIds.includes(taskId);
    const completedTaskIds = isDone
      ? appState.completedTaskIds.filter((id) => id !== taskId)
      : [...appState.completedTaskIds, taskId];

    const todayIso = startOfTodayIso();
    const completedDates = isDone
      ? appState.completedDates
      : [...appState.completedDates, todayIso];

    const progress = {
      ...appState.lastDailyPlan.progress,
      percent_complete: Math.min(100, Math.round((completedTaskIds.length / appState.goalData.allTaskIds.length) * 100)),
      tasks_done_today: appState.lastDailyPlan.todays_tasks.filter((task) => completedTaskIds.includes(task.id)).length,
      tasks_remaining_today: appState.lastDailyPlan.todays_tasks.filter((task) => !completedTaskIds.includes(task.id)).length,
    };

    const nextState = {
      ...appState,
      completedTaskIds,
      completedDates,
      lastDailyPlan: {
        ...appState.lastDailyPlan,
        progress,
      },
    };

    setAppState(nextState);
    saveState(nextState);
  }

  async function handleScheduleTask(task) {
    const [startLabel, endLabel] = (task.calendar_block || '').split('–');
    if (!startLabel || !endLabel) {
      return;
    }

    const today = new Date();
    const start = new Date(today.toDateString() + ` ${startLabel}`);
    const end = new Date(today.toDateString() + ` ${endLabel}`);

    try {
      await createCalendarEvent({
        task: task.task,
        isoStart: start.toISOString(),
        isoEnd: end.toISOString(),
        goalTitle: appState.goalData.goal_title,
      });
    } catch {
      setCalendarError('Calendar sync paused — tap to reconnect');
    }
  }

  if (loading) {
    return <LoadingScreen />;
  }

  if (!appState || !appState.lastDailyPlan) {
    return (
      <div className="min-h-screen">
        <Onboarding
          onSubmit={handleOnboarding}
          loading={loading}
          calendarError={calendarError}
          onConnectCalendar={connectCalendar}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="absolute right-6 top-6">
        <button
          onClick={() => {
            clearState();
            setAppState(null);
            setActiveTab('Today');
            setWorkingOffline(false);
          }}
          className="rounded-full border border-vividia-line bg-white/90 px-4 py-2 text-sm font-medium text-vividia-muted shadow-sm"
        >
          Reset demo
        </button>
      </div>
      <Dashboard
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        goalData={appState.goalData}
        dailyPlan={appState.lastDailyPlan}
        completedTaskIds={appState.completedTaskIds}
        onToggleTask={handleToggleTask}
        onScheduleTask={handleScheduleTask}
        streakDays={calculateStreak(appState.completedDates)}
        weekCompletion={getWeekCompletion(appState.completedDates)}
        offline={workingOffline}
        onReconnectCalendar={connectCalendar}
      />
    </div>
  );
}
