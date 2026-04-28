const API_URL = import.meta.env.VITE_API_URL || '/api/ai';

async function postPrompt(prompt) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed.' }));
    throw new Error(error.error || 'AI request failed.');
  }

  return response.json();
}

export function requestGoalBreakdown(prompt) {
  return postPrompt(prompt);
}

export function requestDailyRefresh(prompt) {
  return postPrompt(prompt);
}
