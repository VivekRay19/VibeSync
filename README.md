# 🎵 VibeSync — Collaborative Music Listening Platform

**VibeSync** is a full-stack, real-time collaborative music listening platform that lets friends around the world listen to the same music together from different devices in synchronous harmony—without requiring any listener to have a paid Spotify subscription.

---

## 🌟 Core Product Features

1. **Instant Room Creation**: Create private listening rooms with collision-resistant 6-character room codes and one-click shareable invitation URLs.
2. **Zero Mandatory Sign-Up Friction**: Join seamlessly as an authenticated guest session with a personalized display name.
3. **Real-Time Collaborative Playback**:
   - Every participant can pause, resume, seek, or change songs by default.
   - Synchronized playback state coordinates track selection, position, and controls across independent devices.
4. **Drift-Corrected Playback Engine**:
   - Calculates expected playback position: `expectedPosition = basePosition + elapsedServerTime`.
   - Smooth drift correction checks local audio against room clock and applies seek adjustments only when drift exceeds the configured tolerance (2.0s), preventing jarring micro-seeks.
   - Autoplay recovery: Catches browser autoplay restrictions with an interactive "Tap to Listen" banner.
5. **Shared Democratic Queue**:
   - Anyone can search and queue songs.
   - Shows who added each song (`Added by Vivek`).
   - Deterministic single-step queue advancement when the current song completes.
6. **Open Music Provider Catalogs**:
   - **Primary Provider**: [Audius](https://docs.audius.co/) — Decentralized, free-to-stream catalog of indie, electronic, ambient, and lo-fi tracks.
   - **Secondary Provider**: [Jamendo](https://developer.jamendo.com/) — Modular provider for Creative Commons-licensed music.
   - Clear and honest search results: Displays songs only when returned by connected providers.
7. **Connected Listeners & Presence**:
   - Live participant list powered by Supabase Realtime Presence.
   - Host moderation tools (kick participant, close room).
8. **Local Sound Controls**:
   - Volume and mute are device-specific; adjusting your sound never alters other listeners' volume.

---

## 🛠️ Technology Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript (strict), Tailwind CSS, Lucide Icons.
- **Backend**: Next.js Server Route Handlers for protected API requests and music source resolution.
- **Database & Realtime**:
  - Supabase PostgreSQL with Row Level Security (RLS).
  - Supabase Realtime Broadcast for low-latency playback events (`PLAY`, `PAUSE`, `SEEK`, `SELECT_TRACK`).
  - Supabase Realtime Presence for live online listener tracking.
  - In-memory store fallback for offline/development environments.
- **Music Catalogs**: Audius Discovery Node API & Jamendo v3.0 API.
- **Testing**: Vitest, React Testing Library, JSDOM, Zod schema validation.

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- **Node.js**: v18.17+ or v20+ (v24 tested)
- **npm**: v9+ (or v10+)

### 2. Clone and Install
```bash
git clone https://github.com/VivekRay19/VibeSync.git
cd VibeSync
npm install
```

### 3. Environment Variables
Copy the template configuration:
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```ini
# Supabase Configuration (Optional for initial local testing; fallback memory store activates automatically)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key
SUPABASE_SECRET_KEY=your-supabase-service-role-key

# Music Catalog Keys (Optional)
# Audius works out of the box with decentralized nodes without an API key!
AUDIUS_API_KEY=
# Jamendo Client ID (Obtain free at https://developer.jamendo.com/ if desired)
JAMENDO_CLIENT_ID=

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🗄️ Database Setup (Supabase)

To enable persistent cross-device storage and Supabase Realtime:

1. Create a free project at [supabase.com](https://supabase.com).
2. Go to **SQL Editor** in your Supabase Dashboard.
3. Paste and run the contents of [`supabase/migrations/001_initial_schema.sql`](supabase/migrations/001_initial_schema.sql).
4. Verify the created tables:
   - `profiles`
   - `rooms`
   - `room_members`
   - `playback_state`
   - `queue_items`
5. Ensure Realtime is enabled for these tables in Supabase:
   - Go to **Database** -> **Replication**.
   - Verify `playback_state`, `queue_items`, and `room_members` are toggled ON for `supabase_realtime`.
6. Copy your **Project URL** and **anon public key** from **Project Settings** -> **API** into `.env.local`.

---

## 🧪 Running Automated Tests

VibeSync includes comprehensive unit, integration, and multi-user simulation tests:

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run TypeScript type check
npx tsc --noEmit

# Run ESLint check
npm run lint

# Run production build
npm run build
```

---

## 🌐 Deploying to Vercel

1. Push your code to your GitHub repository:
   ```bash
   git push origin main
   ```
2. Go to [vercel.com](https://vercel.com) and import the repository.
3. Add the environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SECRET_KEY`
   - `AUDIUS_API_KEY` (if configured)
   - `JAMENDO_CLIENT_ID` (if configured)
4. Click **Deploy**. Vercel will build and deploy the Next.js App Router application.

---

## 📄 Licensing & Catalog Transparency

- Music search and playback are powered by open developer APIs.
- Audio is streamed directly from authorized provider content distribution networks to client browsers.
- VibeSync coordinates synchronized state and playback controls; it does not host or redistribute audio files.

---

## 👤 Author & Contribution

Created by **[Vivek Ray (VivekRay19)](https://github.com/VivekRay19)**.
Repository: [https://github.com/VivekRay19/VibeSync](https://github.com/VivekRay19/VibeSync)
