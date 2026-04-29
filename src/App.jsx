import { useEffect, useMemo, useState } from 'react';
import Dashboard from './components/Dashboard';
import Onboarding from './components/Onboarding';
import { requestDailyRefresh, requestGoalBreakdown } from './api/anthropic';
import { authorizeCalendar, createCalendarEvent, getTodayFreeBlocks, initGoogleCalendar, isGoogleConfigured } from './api/calendar';
import { clearState, loadState, saveState } from './utils/storage';
import { calculateStreak, getDaysBetween, getWeekCompletion } from './utils/streaks';

const FRIENDLY_ERROR = 'Something went wrong — tap to try again';
const CALENDAR_NOTICE = 'Running without calendar — connect later in Settings.';
const GOAL_ERROR = 'Be a bit more specific — what exactly do you want to achieve?';
const DEADLINE_ERROR = 'This date has passed — pick a future deadline.';
const HOURS_ERROR = 'Set at least 1 hour a week so Vividia can build a real plan.';
const TIGHT_WARNING = "This is tight — here's a focused minimal plan instead of a full roadmap.";

const VAGUE_GOAL_PATTERNS = [/^be better$/i, /^be happier$/i, /^improve$/i, /^do better$/i, /^success$/i, /^grow$/i];

function getTodayDateInput() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function startOfDayIso(value = new Date()) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function startOfDayDate(value = new Date()) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatTargetDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'A future date';
  }
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: '2-digit', year: 'numeric' }).format(date);
}

function ensureText(value, fallback) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function uniqueStrings(values) {
  return [...new Set((values || []).filter(Boolean).map((value) => String(value).trim()).filter(Boolean))];
}

function clamp(number, min, max) {
  return Math.min(max, Math.max(min, number));
}

function getDaysUntilDeadline(deadline) {
  if (!deadline) return 0;
  return getDaysBetween(new Date(), new Date(deadline));
}

function getWeeksUntilDeadline(deadline) {
  const days = getDaysUntilDeadline(deadline);
  return Math.max(1, Math.ceil(days / 7));
}

function parseHours(value) {
  const hours = Number(value);
  return Number.isFinite(hours) ? hours : 0;
}

function goalLooksVague(goal) {
  const trimmed = goal.trim();
  if (!trimmed || trimmed.length < 10) {
    return true;
  }

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length < 3) {
    return true;
  }

  return VAGUE_GOAL_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function isPastDeadline(deadline) {
  if (!deadline) return false;
  return startOfDayDate(deadline) < startOfDayDate();
}

function validateForm(form) {
  const errors = {
    goal: '',
    deadline: '',
    hoursPerWeek: '',
  };
  const warnings = [];
  const hours = parseHours(form.hoursPerWeek);
  const totalHours = hours * getWeeksUntilDeadline(form.deadline);
  const impossibleScope = getDaysUntilDeadline(form.deadline) <= 3 && hours < 2;

  if (goalLooksVague(form.goal)) {
    errors.goal = GOAL_ERROR;
  }

  if (!form.deadline) {
    errors.deadline = 'Pick a deadline so Vividia can shape a real plan.';
  } else if (isPastDeadline(form.deadline)) {
    errors.deadline = DEADLINE_ERROR;
  }

  if (hours <= 0) {
    errors.hoursPerWeek = HOURS_ERROR;
  }

  if (!errors.hoursPerWeek && !errors.deadline && totalHours < 5) {
    warnings.push(TIGHT_WARNING);
  }

  if (!errors.hoursPerWeek && !errors.deadline && impossibleScope) {
    warnings.push('This timeline is extra compressed, so Vividia will shrink the scope and focus on the highest-value next steps.');
  }

  return {
    errors,
    warnings,
    tightPlan: warnings.includes(TIGHT_WARNING),
    impossibleScope,
    hasErrors: Object.values(errors).some(Boolean),
  };
}

function getUserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Los_Angeles';
}

function parseBlockTimes(blockLabel) {
  if (!blockLabel || !blockLabel.includes('–')) {
    return null;
  }

  const [startLabel, endLabel] = blockLabel.split('–');
  const today = new Date();
  const start = new Date(`${today.toDateString()} ${startLabel}`);
  const end = new Date(`${today.toDateString()} ${endLabel}`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return null;
  }

  return { start, end };
}

function getBlockDurationMinutes(blockLabel) {
  const parsed = parseBlockTimes(blockLabel);
  if (!parsed) return 0;
  return Math.round((parsed.end - parsed.start) / 60000);
}

function findFittingBlock(blocks, duration, usedBlocks = new Set()) {
  return blocks.find((block) => !usedBlocks.has(block) && getBlockDurationMinutes(block) >= duration) || null;
}

function buildMicroTasks(goalTitle) {
  const theme = ensureText(goalTitle, 'your goal').toLowerCase();
  return [
    {
      id: 'micro-1',
      task: 'Write one tiny next step',
      duration_min: 5,
      why: `Naming one next move keeps ${theme} real even on a packed day.`,
      energy_level: 'low',
      calendar_block: null,
      carry_over: true,
    },
    {
      id: 'micro-2',
      task: 'Tidy one resource link',
      duration_min: 7,
      why: 'Small cleanup keeps friction low when you get a better window later.',
      energy_level: 'low',
      calendar_block: null,
      carry_over: true,
    },
    {
      id: 'micro-3',
      task: 'Draft one check-in note',
      duration_min: 8,
      why: 'A quick message or note can keep momentum alive without a long block.',
      energy_level: 'low',
      calendar_block: null,
      carry_over: true,
    },
  ];
}

function buildFallbackTasks(goalTitle, freeBlocks, microMode) {
  if (microMode) {
    return buildMicroTasks(goalTitle);
  }

  return [
    {
      id: 't1',
      task: 'Refresh top priorities',
      duration_min: 20,
      why: `Clarity makes ${goalTitle.toLowerCase()} feel moveable today.`,
      energy_level: 'medium',
      calendar_block: freeBlocks[0] || null,
      carry_over: false,
    },
    {
      id: 't2',
      task: 'Improve one proof point',
      duration_min: 25,
      why: 'A stronger artifact makes the plan easier to believe and show.',
      energy_level: 'medium',
      calendar_block: freeBlocks[1] || freeBlocks[0] || null,
      carry_over: false,
    },
    {
      id: 't3',
      task: 'Practice one visible skill',
      duration_min: 30,
      why: 'Visible reps turn hope into evidence quickly.',
      energy_level: 'high',
      calendar_block: freeBlocks[2] || null,
      carry_over: false,
    },
  ];
}

function normalizeTaskList(tasks, freeBlocks, prefix, fallbackGoalTitle) {
  const blocks = uniqueStrings(freeBlocks);
  const maxBlockDuration = Math.max(0, ...blocks.map(getBlockDurationMinutes));
  const microMode = blocks.length === 0 || maxBlockDuration < 15;
  const usedBlocks = new Set();
  const source = Array.isArray(tasks) && tasks.length ? tasks : buildFallbackTasks(fallbackGoalTitle, blocks, microMode);

  return source.slice(0, microMode ? 3 : 4).map((task, index) => {
    const fallback = buildFallbackTasks(fallbackGoalTitle, blocks, microMode)[index % 3];
    const durationMin = clamp(
      Number(task?.duration_min) || fallback.duration_min,
      microMode ? 5 : 10,
      microMode ? 10 : 90,
    );

    let calendarBlock = typeof task?.calendar_block === 'string' ? task.calendar_block : null;
    if (!calendarBlock || getBlockDurationMinutes(calendarBlock) < durationMin || usedBlocks.has(calendarBlock)) {
      calendarBlock = findFittingBlock(blocks, durationMin, usedBlocks);
    }

    if (calendarBlock) {
      usedBlocks.add(calendarBlock);
    }

    const energyLevel = ['low', 'medium', 'high'].includes(task?.energy_level) ? task.energy_level : fallback.energy_level;
    const carryOver = !calendarBlock;

    return {
      id: ensureText(task?.id, `${prefix}-${index + 1}`),
      task: ensureText(task?.task, fallback.task),
      duration_min: durationMin,
      why: ensureText(task?.why, fallback.why),
      energy_level: energyLevel,
      calendar_block: calendarBlock,
      carry_over: carryOver,
    };
  });
}

function buildWeekFromToday(todayTasks) {
  const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  return weekdays.map((day, index) => ({
    day,
    tasks: todayTasks.slice(index % Math.max(1, todayTasks.length - 1), (index % Math.max(1, todayTasks.length - 1)) + 2),
  }));
}

function normalizeGoalData(data, form, freeBlocks, validation) {
  const tightPlan = validation.tightPlan || validation.impossibleScope;
  const todayTasks = normalizeTaskList(data?.roadmap?.today, freeBlocks, 'goal-today', form.goal);
  const defaultYearly = tightPlan
    ? [
        { milestone: 'Lock a minimal priority path', month_target: formatTargetDate(form.deadline) },
        { milestone: 'Protect a few high-value reps', month_target: formatTargetDate(form.deadline) },
      ]
    : [
        { milestone: 'First proof point feels polished', month_target: 'Next month' },
        { milestone: 'Application or portfolio rhythm feels steady', month_target: 'Midway checkpoint' },
        { milestone: 'You are ready to submit with confidence', month_target: formatTargetDate(form.deadline) },
      ];

  const monthly = Array.isArray(data?.roadmap?.monthly) && data.roadmap.monthly.length
    ? data.roadmap.monthly.slice(0, 4).map((item, index) => ({
        week: Number(item?.week) || index + 1,
        focus: ensureText(item?.focus, tightPlan ? 'Protect the highest-value move' : 'Make the goal concrete'),
        key_action: ensureText(item?.key_action, tightPlan ? 'Choose the one move that still matters this week.' : 'Do the next visible task.'),
      }))
    : [
        { week: 1, focus: tightPlan ? 'Tight timeline triage' : 'Clarify the target', key_action: 'Name the one output that matters most first.' },
        { week: 2, focus: 'Build proof', key_action: 'Make one visible improvement you can point to.' },
        { week: 3, focus: 'Practice and refine', key_action: 'Turn effort into something repeatable.' },
        { week: 4, focus: 'Ship the next step', key_action: 'Send the version that is ready enough to move.' },
      ];

  const yearly = Array.isArray(data?.roadmap?.yearly) && data.roadmap.yearly.length
    ? data.roadmap.yearly.slice(0, 3).map((item, index) => ({
        milestone: ensureText(item?.milestone, defaultYearly[index]?.milestone || 'Important checkpoint'),
        month_target: ensureText(item?.month_target, defaultYearly[index]?.month_target || formatTargetDate(form.deadline)),
      }))
    : defaultYearly;

  const thisWeek = Array.isArray(data?.roadmap?.this_week) && data.roadmap.this_week.length
    ? data.roadmap.this_week.slice(0, 7).map((day, index) => ({
        day: ensureText(day?.day, buildWeekFromToday(todayTasks)[index]?.day || 'Day'),
        tasks: normalizeTaskList(day?.tasks, freeBlocks, `week-${index + 1}`, form.goal).slice(0, 2),
      }))
    : buildWeekFromToday(todayTasks);

  const books = (Array.isArray(data?.fuel_pack?.books) ? data.fuel_pack.books : []).slice(0, 2).map((book, index) => ({
    title: ensureText(book?.title, index === 0 ? 'Designing Your Life' : 'The 2-Hour Job Search'),
    author: ensureText(book?.author, index === 0 ? 'Bill Burnett and Dave Evans' : 'Steve Dalton'),
    why: ensureText(book?.why, 'It helps turn uncertainty into smaller, testable moves.'),
  }));

  const documentaries = (Array.isArray(data?.fuel_pack?.documentaries) ? data.fuel_pack.documentaries : []).slice(0, 2).map((doc, index) => ({
    title: ensureText(doc?.title, index === 0 ? 'Abstract: The Art of Design' : 'How to Get Ahead in Tech'),
    platform_hint: ensureText(doc?.platform_hint, index === 0 ? 'Netflix' : 'YouTube'),
    why: ensureText(doc?.why, 'It reconnects effort with momentum and craft.'),
  }));

  const normalized = {
    goal_title: ensureText(data?.goal_title, tightPlan ? 'Focused next-step plan' : 'Top internship by August'),
    goal_summary: ensureText(
      data?.goal_summary,
      tightPlan
        ? 'The timeline is tight, so today\'s plan stays intentionally small and realistic.'
        : 'You are turning a big goal into a steady set of visible moves.',
    ),
    target_date: ensureText(data?.target_date, formatTargetDate(form.deadline)),
    color_theme: ['purple', 'teal', 'coral', 'amber'].includes(data?.color_theme) ? data.color_theme : 'purple',
    roadmap: {
      yearly,
      monthly,
      this_week: thisWeek,
      today: todayTasks,
    },
    fuel_pack: {
      affirmation: ensureText(
        data?.fuel_pack?.affirmation,
        'You do not need a perfect week. You need the next honest move.',
      ),
      books: books.length ? books : buildFallbackTasks(form.goal, freeBlocks, true).slice(0, 2).map((_, index) => ({
        title: index === 0 ? 'Designing Your Life' : 'The 2-Hour Job Search',
        author: index === 0 ? 'Bill Burnett and Dave Evans' : 'Steve Dalton',
        why: 'It gives you a practical lens for turning ambition into experiments.',
      })),
      documentaries: documentaries.length ? documentaries : [
        { title: 'Abstract: The Art of Design', platform_hint: 'Netflix', why: 'It keeps creative ambition grounded in real work.' },
      ],
      playlist_mood: ensureText(data?.fuel_pack?.playlist_mood, 'Warm focus with a little lift for the hard parts'),
      spotify_search: ensureText(data?.fuel_pack?.spotify_search, 'soft focus confidence study playlist'),
    },
    vision_board: {
      hero_phrase: ensureText(data?.vision_board?.hero_phrase, 'Make It Real'),
      visual_keywords: uniqueStrings(data?.vision_board?.visual_keywords).slice(0, 3).length
        ? uniqueStrings(data?.vision_board?.visual_keywords).slice(0, 3)
        : ['calm desk glow', 'clear direction', 'future-self energy'],
      milestones_to_celebrate: uniqueStrings(data?.vision_board?.milestones_to_celebrate).slice(0, 3).length
        ? uniqueStrings(data?.vision_board?.milestones_to_celebrate).slice(0, 3)
        : ['First visible win', 'A full week of follow-through', 'A moment of real traction'],
      color_theme: ['purple', 'teal', 'coral', 'amber'].includes(data?.vision_board?.color_theme)
        ? data.vision_board.color_theme
        : ['purple', 'teal', 'coral', 'amber'].includes(data?.color_theme)
          ? data.color_theme
          : 'purple',
    },
    reminders: {
      suggested_times: uniqueStrings(data?.reminders?.suggested_times).slice(0, 2).length
        ? uniqueStrings(data?.reminders?.suggested_times).slice(0, 2)
        : ['9:00 AM', '3:00 PM'],
      messages: uniqueStrings(data?.reminders?.messages).slice(0, 2).length
        ? uniqueStrings(data?.reminders?.messages).slice(0, 2)
        : ['A calm, specific step still counts today.', 'Momentum grows when the next move stays small and real.'],
    },
    plan_mode: tightPlan ? 'minimal' : 'full',
    allTaskIds: uniqueStrings([
      ...todayTasks.map((task) => task.id),
      ...thisWeek.flatMap((day) => day.tasks.map((task) => task.id)),
    ]),
  };

  return normalized;
}

function calculateOverallCompletedCount(state) {
  return (state?.meta?.historicalCompletedCount || 0) + (state?.completedTaskIds?.length || 0);
}

function calculateOverallTotalCount(state) {
  return (state?.meta?.historicalCompletedCount || 0) + (state?.goalData?.allTaskIds?.length || 0);
}

function calculateOverallPercent(state) {
  const total = calculateOverallTotalCount(state);
  if (!total) return 0;
  return Math.min(100, Math.round((calculateOverallCompletedCount(state) / total) * 100));
}

function normalizeCalendarSuggestions(suggestions, tasks, freeBlocks) {
  const blocks = uniqueStrings(freeBlocks);
  const used = new Set();
  const normalized = [];

  for (const suggestion of Array.isArray(suggestions) ? suggestions : []) {
    const block = typeof suggestion?.block_time === 'string' ? suggestion.block_time : null;
    if (!block || !blocks.includes(block) || used.has(block)) {
      continue;
    }

    normalized.push({
      block_time: block,
      suggested_task: ensureText(suggestion?.suggested_task, tasks.find((task) => task.calendar_block === block)?.task || tasks[0]?.task || 'Focus block'),
      reason: ensureText(suggestion?.reason, 'This block fits the effort without forcing it.'),
    });
    used.add(block);
  }

  for (const task of tasks) {
    if (!task.calendar_block || used.has(task.calendar_block)) {
      continue;
    }

    normalized.push({
      block_time: task.calendar_block,
      suggested_task: task.task,
      reason: task.carry_over ? 'This one may need a later window.' : 'This block is long enough for the task.',
    });
    used.add(task.calendar_block);
  }

  return normalized.slice(0, 3);
}

function normalizeDailyPlan(data, state, freeBlocks, options = {}) {
  const tasks = normalizeTaskList(data?.todays_tasks, freeBlocks, 'today', state.goalData.goal_title);
  const daysToDeadline = getDaysUntilDeadline(state.meta.deadline);
  const tasksDoneToday = tasks.filter((task) => state.completedTaskIds.includes(task.id)).length;
  const tasksRemainingToday = tasks.length - tasksDoneToday;
  const microMode = freeBlocks.length === 0 || Math.max(0, ...freeBlocks.map(getBlockDurationMinutes)) < 15;
  const allCarryOver = tasks.every((task) => task.carry_over);

  return {
    greeting: ensureText(
      data?.greeting,
      options.previewTomorrow
        ? `Tomorrow can start softer. Here is an early preview for ${state.goalData.goal_title.toLowerCase()}.`
        : `Good morning. Your ${state.goalData.goal_title.toLowerCase()} plan is ready.`,
    ),
    todays_tasks: tasks,
    calendar_suggestions: normalizeCalendarSuggestions(data?.calendar_suggestions, tasks, freeBlocks),
    todays_quote: {
      text: ensureText(
        data?.todays_quote?.text,
        'Progress feels steadier when you stop asking today to carry the whole dream at once.',
      ),
      theme: ensureText(data?.todays_quote?.theme, microMode ? 'gentleness' : 'focus'),
    },
    streak_message: ensureText(
      data?.streak_message,
      microMode
        ? 'A full day still leaves room for a tiny honest move.'
        : `${state.goalData.goal_title} gets stronger when the next step stays visible.`,
    ),
    adjustment_note: typeof data?.adjustment_note === 'string'
      ? data.adjustment_note
      : tasksRemainingToday === tasks.length
        ? "Missed work is data, not a verdict. We'll keep today smaller and easier to restart."
        : null,
    progress: {
      percent_complete: calculateOverallPercent(state),
      tasks_done_today: tasksDoneToday,
      tasks_remaining_today: tasksRemainingToday,
      days_to_deadline: daysToDeadline,
    },
    calendar_mode: freeBlocks.length === 0 ? 'empty' : microMode ? 'fragmented' : 'normal',
    low_time_message:
      freeBlocks.length === 0
        ? 'Your day looks full — here are 3 micro-tasks under 10 minutes each.'
        : microMode
          ? 'Your free time is fragmented, so today leans on smaller blocks that can actually fit.'
          : null,
    overloaded_message: allCarryOver && freeBlocks.length > 0 ? 'Your schedule is packed, so a few tasks are marked carry over instead of being forced into the wrong slot.' : null,
  };
}

function getPromptGoalBreakdown(form, freeBlocks, validation) {
  return `A college student has just set their first goal in Vividia.

Goal: "${form.goal}"
Deadline: ${formatTargetDate(form.deadline)}
Current situation: "${form.currentSituation}"
Hours available per week: ${form.hoursPerWeek}
Today's free calendar blocks: ${JSON.stringify(freeBlocks)}
Current mood/energy: "${form.mood}"
Current timezone: "${getUserTimeZone()}"
Planning mode: "${validation.tightPlan || validation.impossibleScope ? 'minimal compressed plan' : 'full roadmap'}"

Rules:
- Never leave a field undefined.
- If information is missing, return a helpful fallback.
- Always prioritize schedule realism over output length.
- Use gentle language when progress is behind.
- Return a stable schema even when the user input is messy.
- If free time is empty or fragmented, create micro-tasks in the 5 to 10 minute range and use null for any calendar_block that does not truly fit.
- If the timeline is too tight, say so gently through the plan and make the roadmap smaller instead of pretending the scope is easy.

Generate a complete Vividia roadmap. Return ONLY valid JSON matching this exact schema:

{
  "goal_title": "string",
  "goal_summary": "string",
  "target_date": "string",
  "color_theme": "string",
  "roadmap": {
    "yearly": [{ "milestone": "string", "month_target": "string" }],
    "monthly": [
      { "week": 1, "focus": "string", "key_action": "string" },
      { "week": 2, "focus": "string", "key_action": "string" },
      { "week": 3, "focus": "string", "key_action": "string" },
      { "week": 4, "focus": "string", "key_action": "string" }
    ],
    "this_week": [
      {
        "day": "string",
        "tasks": [
          {
            "id": "string",
            "task": "string",
            "duration_min": 20,
            "energy_level": "string",
            "calendar_block": "string or null"
          }
        ]
      }
    ],
    "today": [
      {
        "id": "string",
        "task": "string",
        "duration_min": 20,
        "why": "string",
        "energy_level": "string",
        "calendar_block": "string or null"
      }
    ]
  },
  "fuel_pack": {
    "affirmation": "string",
    "books": [{ "title": "string", "author": "string", "why": "string" }],
    "documentaries": [{ "title": "string", "platform_hint": "string", "why": "string" }],
    "playlist_mood": "string",
    "spotify_search": "string"
  },
  "vision_board": {
    "hero_phrase": "string",
    "visual_keywords": ["string", "string", "string"],
    "milestones_to_celebrate": ["string", "string", "string"],
    "color_theme": "string"
  },
  "reminders": {
    "suggested_times": ["string", "string"],
    "messages": ["string", "string"]
  }
}`;
}

function getPromptDailyRefresh(state, freeBlocks, mood, options = {}) {
  return `A student is opening Vividia for today. Here is their current context:

Goal: "${state.goalData.goal_title}"
Days since goal was set: ${getDaysBetween(state.meta.startedAt, new Date())}
Tasks completed so far: ${calculateOverallCompletedCount(state)} of ${calculateOverallTotalCount(state)}
Tasks missed yesterday: ${state.lastDailyPlan?.progress?.tasks_remaining_today || 0}
Current streak: ${calculateStreak(state.completedDates)} days
Today's free calendar blocks: ${JSON.stringify(freeBlocks)}
Current mood/energy: "${mood || state.meta.mood || 'steady'}"
Current timezone: "${state.meta.timezone || getUserTimeZone()}"
Recovery mode: ${state.meta.recoveryActive ? 'true' : 'false'}
Preview tomorrow early: ${options.previewTomorrow ? 'true' : 'false'}

Rules:
- Never leave a field undefined.
- If information is missing, return a helpful fallback.
- Always prioritize schedule realism over output length.
- Use gentle language when progress is behind.
- Return a stable schema even when the user input is messy.
- If no calendar block fits, set calendar_block to null instead of forcing it.
- If today is full or fragmented, keep tasks between 5 and 10 minutes and make the tone calming, not guilty.

Generate today's personalized plan. Return ONLY valid JSON:

{
  "greeting": "string",
  "todays_tasks": [
    {
      "id": "string",
      "task": "string",
      "duration_min": 15,
      "why": "string",
      "energy_level": "string",
      "calendar_block": "string or null"
    }
  ],
  "calendar_suggestions": [
    {
      "block_time": "string",
      "suggested_task": "string",
      "reason": "string"
    }
  ],
  "todays_quote": {
    "text": "string",
    "theme": "string"
  },
  "streak_message": "string",
  "adjustment_note": "string or null",
  "progress": {
    "percent_complete": 34,
    "tasks_done_today": 0,
    "tasks_remaining_today": 4,
    "days_to_deadline": 47
  }
}`;
}

function getRetryContextMessage(error) {
  const text = error instanceof Error ? error.message : '';
  return text.toLowerCase().includes('parse') ? FRIENDLY_ERROR : FRIENDLY_ERROR;
}

async function requestWithAutoRetry(requestFn, prompt) {
  let lastError;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await requestFn(prompt);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

function getRecoveryState(meta = {}) {
  const gapDays = meta.lastActiveDate ? getDaysBetween(meta.lastActiveDate, new Date()) : 0;
  if (gapDays > 1) {
    return {
      active: true,
      message: "Life happens — let's pick up where you left off.",
    };
  }

  return { active: false, message: '' };
}

function getDisplayedStreak(meta, completedDates) {
  if (meta?.recoveryActive) {
    return 1;
  }
  return calculateStreak(completedDates);
}

function LoadingScreen() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="animate-pulse space-y-6">
        <div className="h-36 rounded-[2rem] bg-white/80" />
        <div className="h-12 rounded-full bg-white/70" />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6">
          <div className="h-48 rounded-[2rem] bg-white/80" />
          <div className="h-48 rounded-[2rem] bg-white/80" />
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6">
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
  const [calendarNotice, setCalendarNotice] = useState('');
  const [workingOffline, setWorkingOffline] = useState(false);
  const [errorCard, setErrorCard] = useState(null);
  const [isEditingGoal, setIsEditingGoal] = useState(false);

  useEffect(() => {
    const stored = loadState();

    async function bootstrap() {
      if (!stored) {
        setLoading(false);
        return;
      }

      const recovery = getRecoveryState(stored.meta);
      const hydrated = {
        ...stored,
        meta: {
          historicalCompletedCount: 0,
          formSnapshot: stored.meta?.formSnapshot || {
            goal: stored.goalData?.goal_title || '',
            deadline: stored.meta?.deadline || '',
            hoursPerWeek: stored.meta?.hoursPerWeek || '10',
            currentSituation: stored.meta?.currentSituation || '',
            mood: stored.meta?.mood || '',
          },
          timezone: stored.meta?.timezone || getUserTimeZone(),
          ...stored.meta,
          recoveryActive: recovery.active,
          recoveryMessage: recovery.message,
        },
      };

      setAppState(hydrated);
      await refreshDailyPlan(hydrated, hydrated.meta.mood);
      setLoading(false);
    }

    initGoogleCalendar().catch(() => {});
    bootstrap();
  }, []);

  async function resolveCalendarBlocks({ authorizeFirst = false } = {}) {
    if (!isGoogleConfigured()) {
      setCalendarNotice(CALENDAR_NOTICE);
      return [];
    }

    if (authorizeFirst) {
      try {
        await authorizeCalendar();
      } catch {
        setCalendarNotice(CALENDAR_NOTICE);
        return [];
      }
    }

    try {
      const blocks = uniqueStrings(await getTodayFreeBlocks());
      setCalendarNotice('');
      return blocks;
    } catch {
      setCalendarNotice(CALENDAR_NOTICE);
      return [];
    }
  }

  async function connectCalendar() {
    try {
      await authorizeCalendar();
      setCalendarNotice('');
      if (appState) {
        await refreshDailyPlan({ ...appState, meta: { ...appState.meta, recoveryActive: false } }, appState.meta.mood);
      }
    } catch {
      setCalendarNotice(CALENDAR_NOTICE);
    }
  }

  async function refreshDailyPlan(stateArg, mood, options = {}) {
    const state = stateArg || appState;
    if (!state) return;

    const freeBlocks = await resolveCalendarBlocks();
    const recovery = getRecoveryState(state.meta);
    const stateForPlan = {
      ...state,
      meta: {
        ...state.meta,
        recoveryActive: recovery.active,
        recoveryMessage: recovery.message,
      },
    };

    try {
      const prompt = getPromptDailyRefresh(stateForPlan, freeBlocks, mood, options);
      const rawPlan = await requestWithAutoRetry(requestDailyRefresh, prompt);
      const dailyPlan = normalizeDailyPlan(rawPlan, stateForPlan, freeBlocks, options);
      const nextState = {
        ...stateForPlan,
        meta: {
          ...stateForPlan.meta,
          mood: mood || stateForPlan.meta.mood,
          lastActiveDate: startOfDayIso(),
        },
        lastDailyPlan: dailyPlan,
      };
      setAppState(nextState);
      saveState(nextState);
      setWorkingOffline(false);
      setErrorCard(null);
    } catch (error) {
      const fallbackPlan = normalizeDailyPlan(null, stateForPlan, freeBlocks, options);
      const nextState = {
        ...stateForPlan,
        meta: {
          ...stateForPlan.meta,
          lastActiveDate: startOfDayIso(),
        },
        lastDailyPlan: fallbackPlan,
      };
      setAppState(nextState);
      saveState(nextState);
      setWorkingOffline(true);
      setErrorCard({
        message: getRetryContextMessage(error),
        actionLabel: 'Try again',
        action: () => refreshDailyPlan(nextState, mood, options),
      });
    }
  }

  async function handleOnboarding(event, form) {
    event.preventDefault();
    const validation = validateForm(form);
    if (validation.hasErrors) {
      return;
    }

    setLoading(true);
    setWorkingOffline(false);
    setErrorCard(null);

    const freeBlocks = await resolveCalendarBlocks({ authorizeFirst: true });

    try {
      const prompt = getPromptGoalBreakdown(form, freeBlocks, validation);
      const rawGoalData = await requestWithAutoRetry(requestGoalBreakdown, prompt);
      const goalData = normalizeGoalData(rawGoalData, form, freeBlocks, validation);
      const baseMeta = isEditingGoal && appState
        ? {
            ...appState.meta,
            deadline: form.deadline,
            mood: form.mood,
            hoursPerWeek: form.hoursPerWeek,
            currentSituation: form.currentSituation,
            formSnapshot: form,
            regeneratedAt: new Date().toISOString(),
            tightPlan: validation.tightPlan || validation.impossibleScope,
            lastActiveDate: startOfDayIso(),
            historicalCompletedCount: (appState.meta.historicalCompletedCount || 0) + appState.completedTaskIds.length,
            timezone: getUserTimeZone(),
          }
        : {
            startedAt: new Date().toISOString(),
            deadline: form.deadline,
            mood: form.mood,
            hoursPerWeek: form.hoursPerWeek,
            currentSituation: form.currentSituation,
            formSnapshot: form,
            tightPlan: validation.tightPlan || validation.impossibleScope,
            lastActiveDate: startOfDayIso(),
            historicalCompletedCount: 0,
            timezone: getUserTimeZone(),
            recoveryActive: false,
            recoveryMessage: '',
          };

      const nextState = {
        goalData,
        completedTaskIds: [],
        completedDates: isEditingGoal && appState ? appState.completedDates : [],
        meta: baseMeta,
        lastDailyPlan: null,
      };

      setAppState(nextState);
      saveState(nextState);
      setIsEditingGoal(false);
      await new Promise((resolve) => setTimeout(resolve, 1200));
      await refreshDailyPlan(nextState, form.mood);
    } catch (error) {
      const fallbackGoalData = normalizeGoalData(null, form, freeBlocks, validation);
      const nextState = {
        goalData: fallbackGoalData,
        completedTaskIds: [],
        completedDates: isEditingGoal && appState ? appState.completedDates : [],
        meta: {
          ...(appState?.meta || {}),
          startedAt: appState?.meta?.startedAt || new Date().toISOString(),
          deadline: form.deadline,
          mood: form.mood,
          hoursPerWeek: form.hoursPerWeek,
          currentSituation: form.currentSituation,
          formSnapshot: form,
          tightPlan: validation.tightPlan || validation.impossibleScope,
          lastActiveDate: startOfDayIso(),
          historicalCompletedCount: isEditingGoal && appState
            ? (appState.meta.historicalCompletedCount || 0) + appState.completedTaskIds.length
            : 0,
          regeneratedAt: isEditingGoal ? new Date().toISOString() : null,
          timezone: getUserTimeZone(),
        },
        lastDailyPlan: normalizeDailyPlan(null, {
          goalData: fallbackGoalData,
          completedTaskIds: [],
          meta: {
            deadline: form.deadline,
            startedAt: new Date().toISOString(),
            historicalCompletedCount: 0,
          },
        }, freeBlocks),
      };

      setAppState(nextState);
      saveState(nextState);
      setWorkingOffline(true);
      setIsEditingGoal(false);
      setErrorCard({
        message: getRetryContextMessage(error),
        actionLabel: 'Try again',
        action: () => handleOnboarding({ preventDefault() {} }, form),
      });
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

    const todayIso = startOfDayIso();
    const completedDates = isDone
      ? appState.completedDates
      : uniqueStrings([...appState.completedDates, todayIso]);

    const nextState = {
      ...appState,
      completedTaskIds,
      completedDates,
      meta: {
        ...appState.meta,
        lastActiveDate: todayIso,
        recoveryActive: false,
        recoveryMessage: '',
      },
    };

    nextState.lastDailyPlan = {
      ...appState.lastDailyPlan,
      progress: {
        ...appState.lastDailyPlan.progress,
        percent_complete: calculateOverallPercent(nextState),
        tasks_done_today: nextState.lastDailyPlan.todays_tasks.filter((task) => completedTaskIds.includes(task.id)).length,
        tasks_remaining_today: nextState.lastDailyPlan.todays_tasks.filter((task) => !completedTaskIds.includes(task.id)).length,
      },
    };

    setAppState(nextState);
    saveState(nextState);
  }

  async function handleScheduleTask(task) {
    const parsed = parseBlockTimes(task.calendar_block);
    if (!parsed) {
      return;
    }

    try {
      await createCalendarEvent({
        task: task.task,
        isoStart: parsed.start.toISOString(),
        isoEnd: parsed.end.toISOString(),
        goalTitle: appState.goalData.goal_title,
      });
    } catch {
      setCalendarNotice(CALENDAR_NOTICE);
    }
  }

  const displayedStreak = useMemo(
    () => getDisplayedStreak(appState?.meta, appState?.completedDates || []),
    [appState],
  );

  if (loading) {
    return <LoadingScreen />;
  }

  const showingOnboarding = !appState || !appState.lastDailyPlan || isEditingGoal;

  if (showingOnboarding) {
    return (
      <div className="min-h-screen">
        <Onboarding
          onSubmit={handleOnboarding}
          loading={loading}
          calendarError=""
          calendarNotice={calendarNotice}
          onConnectCalendar={connectCalendar}
          initialForm={appState?.meta?.formSnapshot}
          validateForm={validateForm}
          isEditing={isEditingGoal}
          onCancel={appState ? () => setIsEditingGoal(false) : null}
        />
      </div>
    );
  }

  const allTodayTasksComplete = appState.lastDailyPlan.todays_tasks.length > 0
    && appState.lastDailyPlan.todays_tasks.every((task) => appState.completedTaskIds.includes(task.id));

  const statusPanels = [
    calendarNotice
      ? { tone: 'teal', title: 'Calendar', body: CALENDAR_NOTICE, actionLabel: 'Reconnect', action: connectCalendar }
      : null,
    appState.meta.recoveryActive
      ? { tone: 'amber', title: 'Recovery mode', body: appState.meta.recoveryMessage || "Life happens — let's pick up where you left off." }
      : null,
    appState.meta.tightPlan
      ? { tone: 'coral', title: 'Compressed plan', body: TIGHT_WARNING }
      : null,
    appState.meta.regeneratedAt
      ? { tone: 'purple', title: 'Plan refreshed', body: 'Your roadmap was regenerated cleanly, and useful progress was preserved.' }
      : null,
    appState.lastDailyPlan.low_time_message
      ? { tone: 'amber', title: 'Low-time state', body: appState.lastDailyPlan.low_time_message }
      : null,
    appState.lastDailyPlan.overloaded_message
      ? { tone: 'coral', title: 'Overloaded schedule', body: appState.lastDailyPlan.overloaded_message }
      : null,
  ].filter(Boolean);

  return (
    <div className="min-h-screen">
      <div className="absolute right-4 top-4 z-10 flex flex-wrap gap-2">
        <button
          onClick={() => setIsEditingGoal(true)}
          className="rounded-full border border-vividia-line bg-white/90 px-4 py-2 text-sm font-medium text-vividia-ink shadow-sm"
        >
          Edit plan
        </button>
        <button
          onClick={() => {
            clearState();
            setAppState(null);
            setActiveTab('Today');
            setWorkingOffline(false);
            setErrorCard(null);
            setIsEditingGoal(false);
            setCalendarNotice('');
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
        streakDays={displayedStreak}
        weekCompletion={getWeekCompletion(appState.completedDates)}
        offline={workingOffline}
        onReconnectCalendar={connectCalendar}
        statusPanels={statusPanels}
        errorCard={errorCard}
        onRetryPlan={() => refreshDailyPlan(appState, appState.meta.mood)}
        onLoadTomorrowTasks={() => refreshDailyPlan(appState, appState.meta.mood, { previewTomorrow: true })}
        allTodayTasksComplete={allTodayTasksComplete}
        onEditGoal={() => setIsEditingGoal(true)}
        completedCount={calculateOverallCompletedCount(appState)}
        totalTasks={calculateOverallTotalCount(appState)}
      />
    </div>
  );
}
