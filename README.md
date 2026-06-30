<div align="center">

# ⏰ Chrono
### The Last-Minute Life Saver

**An AI-powered productivity companion that proactively plans, prioritizes, and pushes your tasks to completion — before deadlines catch you off guard.**

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-Visit_App-ff510d?style=for-the-badge)](https://chrono-1033583129131.asia-southeast1.run.app)
[![Built with Google AI Studio](https://img.shields.io/badge/Built_with-Google_AI_Studio-4285F4?style=for-the-badge&logo=google)](https://ai.google.dev)
[![Deployed on Cloud Run](https://img.shields.io/badge/Deployed_on-Google_Cloud_Run-4285F4?style=for-the-badge&logo=googlecloud)](https://cloud.google.com/run)

**Submitted for VIBE2SHIP — Coding Ninjas × Google for Developers**

[Live App](https://chrono-1033583129131.asia-southeast1.run.app) · [Report Bug](https://github.com/Prithwish-18/Chrono/issues) · [Problem Statement](#-problem-statement)

</div>

---

## 📋 Table of Contents

- [Problem Statement](#-problem-statement)
- [Our Solution](#-our-solution)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Google Technologies Used](#-google-technologies-used)
- [Live Demo & Testing](#-live-demo--testing)
- [Architecture](#-architecture)
- [Local Setup](#-local-setup)
- [Project Structure](#-project-structure)
- [Screenshots](#-screenshots)
- [Roadmap](#-roadmap)
- [Team](#-team)

---

## 🎯 Problem Statement

> **The Last-Minute Life Saver**

Students, professionals, and entrepreneurs frequently miss deadlines, assignments, meetings, bill payments, interviews, and important commitments. Existing productivity tools rely on **passive reminders** that are easy to ignore and do little to help users actually *complete* their tasks.

The challenge: build an AI-powered productivity companion that **proactively** assists users in planning, prioritizing, and completing tasks — moving beyond reminders to drive **meaningful action**.

---

## 💡 Our Solution

**Chrono** is a full-stack, AI-native productivity dashboard that doesn't just remind you — it **thinks with you**. Every core feature is backed by Google's Gemini AI, turning a static to-do list into an active planning partner that prioritizes your day, suggests realistic schedules, and syncs everything straight into your Google Calendar — all hands-free with voice input.

Where most productivity apps stop at "add a task and get notified," Chrono asks: *what should you actually be doing right now, and when?* — then acts on the answer.

---

## ✨ Key Features

### 🤖 AI-Powered Core
| Feature | What it does |
|---|---|
| **Intelligent Task Prioritization** | Gemini analyzes your task list — deadlines, importance, complexity — and reorders it with reasoning for *why* each task matters now |
| **AI Daily Schedule Generator** | Type a rough brief ("exam tomorrow, gym at 6") and Gemini fills your entire day, hour by hour, around your fixed commitments |
| **Personalized Goal Suggestions** | When your goal list is empty, AI asks 2 quick questions and suggests 3–5 smart, achievable goals with targets pre-filled |
| **AI Productivity Coach** | A conversational assistant you can talk to in plain language — it remembers context and can directly apply its suggested plan into your tasks and planner |
| **Smart Calendar Time Suggestion** | When adding a task to Google Calendar, Gemini picks the optimal time slot based on urgency and your current schedule |

### 📅 Google Calendar Integration
- **One-click OAuth connect** via Google Identity Services — no backend secrets exposed
- **Live event strip** in the hero banner showing today's remaining events in real time
- **Add any task to Calendar** with one click — AI suggests the best time automatically
- **Sync your entire AI-generated daily plan** to Google Calendar in a single action

### 🎙️ Voice-Enabled Assistance
Hands-free input across the app using the native Web Speech API:
- Speak tasks and goals instead of typing
- Voice commands for Pomodoro (*"start"*, *"pause"*, *"reset"*)
- Talk directly to the AI Coach about what's on your plate

### 📊 Goal & Habit Tracking
- **GitHub-style consistency heatmap** — 84-day visual streak tracker
- **Points & leveling system** — Bronze → Silver → Gold → Platinum
- **Daily streak counter** with longest-streak stats

### 🔐 Full Authentication
- Email/password register, login, logout via Firebase Auth
- Real-time data sync per user via Firestore — your tasks, goals, and streaks follow you across devices

### 🌤️ Live Dashboard
- Real-time clock and live weather (Open-Meteo API)
- Cycling background themes
- Pomodoro timer with session tracking

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4 |
| **Backend** | Express.js, TypeScript, Node.js |
| **Database** | Cloud Firestore (real-time sync) |
| **Authentication** | Firebase Authentication |
| **AI** | Google Gemini API (`@google/genai`) |
| **Calendar** | Google Calendar API v3 + Google Identity Services (OAuth 2.0) |
| **Voice** | Web Speech API (browser-native) |
| **Icons / Animation** | Lucide React, Framer Motion |
| **Deployment** | Google Cloud Run (`asia-southeast1`) |
| **Weather Data** | Open-Meteo API |

---

## 🔵 Google Technologies Utilized

This project is deeply integrated with the Google ecosystem, as required by the hackathon:

| Google Technology | Where it's used |
|---|---|
| **Google AI Studio** | Project development, prototyping, and deployment pipeline |
| **Gemini API** | Powers 5 distinct AI features — prioritization, scheduling, goal suggestions, the productivity coach, and smart calendar timing |
| **Google Cloud Run** | Production deployment — serverless container hosting the full Express + React app |
| **Firebase Authentication** | User registration, login, and session management |
| **Cloud Firestore** | Real-time NoSQL database for tasks, goals, streaks, and user data |
| **Google Calendar API v3** | Reading and creating calendar events |
| **Google Identity Services (GIS)** | OAuth 2.0 flow for secure Calendar access — client-side, no exposed secrets |

---

## 🌐 Live Demo & Testing

**🔗 Live App:** [chrono-1033583129131.asia-southeast1.run.app](https://chrono-1033583129131.asia-southeast1.run.app)

### How to test it

1. **Register or log in** with any Google email — the app works fully for any user
2. **Try the AI features** — add a few tasks and click "Prioritize," or click "Generate My Day" in the Daily Planner
3. **Test voice input** — click the 🎤 icon next to any input field (Chrome/Edge recommended)
4. **Test Google Calendar integration** — ⚠️ see note below

> ### ⚠️ Important: Testing Google Calendar
>
> The Google Calendar feature uses an OAuth consent screen currently in **testing mode**, which restricts access to pre-approved test accounts only (a Google Cloud requirement for unverified apps).
>
> **To test the Calendar integration, please use these credentials when prompted to "Connect with Google":**
>
> ```
> Email:    vibe2ship.test@gmail.com
> Password: Vibe2shiptest@1234
> ```
>
> You can still **register/log in to the main app with your own Google account** — this test account is needed **only** for the Calendar OAuth consent step, since the app hasn't been published for public verification yet.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                   React 19 + TypeScript               │
│         (Vite build · Tailwind CSS v4 · GIS SDK)       │
└───────────────────┬─────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
   ┌─────────┐  ┌──────────┐  ┌──────────────┐
   │ Firebase │  │ Express  │  │ Google       │
   │ Auth +   │  │ Backend  │  │ Calendar API │
   │ Firestore│  │ (Node)   │  │ (client-side │
   └─────────┘  └────┬─────┘  │  OAuth)      │
                      │         └──────────────┘
                      ▼
                ┌──────────────┐
                │ Gemini API   │
                │ (5 endpoints)│
                └──────────────┘
                      │
                      ▼
            Deployed as a single
            container on Cloud Run
```

**Why this architecture:** The Gemini API key lives only on the Express server — never exposed to the browser. Google Calendar uses client-side OAuth via Google Identity Services since Calendar access is inherently per-user and doesn't need to touch our backend. Firestore's real-time listeners keep the UI in sync instantly without polling.

---

## 💻 Local Setup

```bash
# Clone the repository
git clone https://github.com/Prithwish-18/Chrono.git
cd Chrono

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
```

Fill in `.env`:
```env
GEMINI_API_KEY=your_gemini_api_key
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
```

You'll also need a `src/firebase.ts` configured with your own Firebase project credentials (Auth + Firestore enabled).

```bash
# Run in development
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

The app runs on `http://localhost:3000` (Express + Vite served together) by default.

---

## 📁 Project Structure

```
Chrono/
├── server.ts                       # Express backend — all Gemini API routes
├── index.html                      # Entry point + Google Identity Services script
├── src/
│   ├── App.tsx                     # Main app shell, routing between panels
│   ├── firebase.ts                 # Firebase config + initialization
│   ├── types.ts                    # Shared TypeScript interfaces
│   ├── components/
│   │   ├── AuthGate.tsx            # Login / Register
│   │   ├── HeroBanner.tsx          # Clock, weather, theme, calendar strip
│   │   ├── TodoListPanel.tsx       # AI-prioritized task list
│   │   ├── DailyPlannerPanel.tsx   # AI-generated daily schedule
│   │   ├── DailyGoalsPanel.tsx     # Streaks, heatmap, points, levels
│   │   ├── PomodoroPanel.tsx       # Focus timer + voice control
│   │   ├── MotivationPanel.tsx     # Daily quotes
│   │   ├── ProductivityCoach.tsx   # Conversational AI assistant
│   │   ├── CalendarPanel.tsx       # Google Calendar dashboard
│   │   └── MicButton.tsx           # Reusable voice input button
│   ├── gcal/
│   │   └── GCalContext.tsx         # Google Calendar OAuth + API context
│   └── hooks/
│       └── useSpeechRecognition.ts # Web Speech API hook
└── package.json
```

---

## 📸 Screenshots

> _Add screenshots/GIFs here showing: the hero dashboard, AI task prioritization in action, the Calendar sync flow, and voice input — this section visually anchors your README for judges scanning quickly._

---

## 🗺️ Roadmap

- [x] Core AI productivity features (prioritize, schedule, suggest, coach)
- [x] Google Calendar two-way integration
- [x] Voice-enabled input across the app
- [x] Goal tracking with streaks and heatmap
- [x] Firebase Auth + real-time Firestore sync
- [x] Production deployment on Google Cloud Run
- [ ] Publish OAuth consent screen for public Calendar access
- [ ] Mobile-first responsive polish
- [ ] Push notifications for upcoming deadlines

---

## 👤 Team

**Built by Prithwish** for VIBE2SHIP — Coding Ninjas × Google for Developers Hackathon

[GitHub](https://github.com/Prithwish-18) · [Live App](https://chrono-1033583129131.asia-southeast1.run.app)

---

<div align="center">

**Built with 🔥 using Google AI Studio, Gemini API, and Google Cloud Run**

</div>
