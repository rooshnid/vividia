# Vividia

Vividia is a React + Vite demo app for student goal planning with a soft, vision-board-style dashboard.

## Setup

1. Copy `.env.example` to `.env` and add your Google client values.
2. Copy `backend/.env.example` to `backend/.env` and add `OPENAI_API_KEY`.
3. Run `npm install`.
4. Run `npm run server` in one terminal.
5. Run `npm run dev` in another terminal.

If OpenAI or Google Calendar is unavailable, the app falls back to a local demo roadmap and shows a `Working offline` badge.

## Railway deploy

This repo is ready to deploy as a single Railway service.

1. In Railway, create a new project from the GitHub repo.
2. Add these variables in Railway:
   - `OPENAI_API_KEY`
   - `VITE_GOOGLE_CLIENT_ID`
   - `VITE_GOOGLE_API_KEY`
3. Let Railway build the app with `npm run build`.
4. Let Railway start the app with `npm start`.

The Express server serves the built Vite app and exposes the API routes from the same service, so you do not need separate frontend and backend Railway services.
