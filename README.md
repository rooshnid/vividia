# Vividia

Vividia is a React + Vite demo app for student goal planning with a soft, vision-board-style dashboard.

## Setup

1. Copy `.env.example` to `.env` and add your Google client values.
2. Copy `backend/.env.example` to `backend/.env` and add `OPENAI_API_KEY`.
3. Run `npm install`.
4. Run `npm run server` in one terminal.
5. Run `npm run dev` in another terminal.

If OpenAI or Google Calendar is unavailable, the app falls back to a local demo roadmap and shows a `Working offline` badge.
