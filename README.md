# 🎵 VibeSync — Full-Stack Collaborative Music Listening Platform

**VibeSync** is a production-grade, real-time collaborative music listening platform that lets friends around the world listen to the same music together from different devices in synchronous harmony—without requiring any listener to have a paid Spotify subscription.

- **Live Application:** [https://vibe-sync-hazel.vercel.app/](https://vibe-sync-hazel.vercel.app/)
- **GitHub Repository:** [https://github.com/VivekRay19/VibeSync](https://github.com/VivekRay19/VibeSync)
- **Author:** Vivek Ray ([VivekRay19](https://github.com/VivekRay19))

---

## 🌟 Core Product Features

1. **Instant Room Creation**: Create private listening rooms with collision-resistant 6-character room codes and one-click shareable invitation URLs.
2. **Cryptographic Session Security**:
   - Zero mandatory sign-up friction.
   - Server-issued, HMAC-SHA256 tamper-proof signed session cookies (`vibesync_auth_session`).
   - Hardened `httpOnly`, `sameSite: 'lax'`, 30-day persistence to prevent identity spoofing.
3. **Authoritative Real-Time Collaborative Playback**:
   - Every participant in a room can pause, resume, seek, or change songs by default.
   - Synchronized playback state coordinates track selection, position, and controls across independent devices.
   - Server-Sent Events (SSE) streaming (`/api/rooms/events`) with automatic heartbeat keepalives and zero external paid realtime dependencies.
   - Client-side `BroadcastChannel` layer provides instant multi-tab zero-latency reflection in the same browser.
4. **Drift-Corrected Playback Engine**:
   - Computes expected position: $\text{expectedPosition} = \text{basePosition} + \text{elapsedServerTime}$.
   - Drift correction checks local audio against the authoritative server clock and applies seek adjustments only when drift exceeds 2.0s, preventing jarring micro-seeks.
   - Browser autoplay restrictions are cleanly intercepted with a high-visibility, interactive "Tap to Listen" banner.
5. **Shared Democratic Queue**:
   - Anyone in the room can search and queue songs.
   - Displays participant attribution (`Added by Robin`).
   - Deterministic queue progression when a song completes.
6. **Open Music Provider Catalogs**:
   - **Primary Provider**: [Audius](https://docs.audius.co/) — Decentralized, free-to-stream catalog of indie, electronic, ambient, and lo-fi tracks.
   - **Secondary Provider**: [YouTube](https://developers.google.com/youtube/v3) — Search millions of tracks via the official YouTube Data API v3 and listen together via the official YouTube IFrame Player API.
   - Honest search results: Song results reflect verified tracks returned by connected provider catalogs.
7. **Participant Presence & Moderation**:
   - Real-time online participant tracking.
   - Host moderation tools: kick offending participants, close room for all listeners.
8. **Independent Local Sound Controls**:
   - Volume and mute are device-specific; adjusting your sound never alters other listeners' volume.

---

## 🛠️ Architecture & Technology Stack

```mermaid
flowchart TD
    ClientA["Browser Listener A (Host)"] <-->|SSE & HTTPS API| NextServer["Next.js 14 App Router API"]
    ClientB["Browser Listener B (Guest)"] <-->|SSE & HTTPS API| NextServer
    
    subgraph Neon Cloud Platform
        NextServer <-->|@neondatabase/serverless| NeonDB[("Neon Postgres (production)")]
        NextServer <-->|Neon Auth| NeonAuth["Managed Better Auth"]
        NextServer <-->|AWS S3 SDK| NeonStorage["Neon Object Storage (assets)"]
        NextServer <-->|HTTP| NeonCompute["Neon Functions"]
    end
    
    ClientA -.->|Direct Audio Stream| AudiusCDN["Audius CDN Nodes"]
    ClientB -.->|Direct Audio Stream| AudiusCDN
```

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript (strict), Tailwind CSS, Lucide Icons.
- **Database**: **Neon Serverless PostgreSQL** (`cold-smoke-08579073`, branch `production`) accessed via `@neondatabase/serverless`.
- **Realtime Transport**: Native Server-Sent Events (SSE) route handler (`/api/rooms/events`) with 20s keepalive heartbeats and in-memory event fanout.
- **Identity & Security**: Server-signed HMAC-SHA256 session cookies preventing client identity spoofing.
- **Neon Cloud Services**:
  - **Neon Auth**: Managed Better Auth (`/neondb/auth`).
  - **Neon Object Storage**: S3-compatible bucket (`assets`) for playlist backups and room media.
  - **Neon Functions**: Serverless edge compute.
- **Testing & Quality Assurance**: Vitest, React Testing Library, ESLint, TypeScript Strict compiler.

---

## 🗄️ Database Schema & Migrations

Database tables reside in `public` schema in Neon Postgres:

1. **`rooms`**:
   - `id`: UUID (Primary Key)
   - `room_code`: Unique 6-character room code
   - `name`: Room title
   - `owner_id`: Creator user identity
   - `status`: `'active' | 'closed'`
   - `created_at`, `updated_at`, `closed_at`: Timestamps
2. **`room_members`**:
   - `id`: UUID (Primary Key)
   - `room_id`: Foreign key to `rooms(id)` (ON DELETE CASCADE)
   - `user_id`: Member identity
   - `display_name`: Participant name
   - `role`: `'owner' | 'member'`
   - `joined_at`: Timestamp
   - Unique constraint on `(room_id, user_id)`
3. **`playback_state`**:
   - `id`: UUID (Primary Key)
   - `room_id`: Foreign key to `rooms(id)` (Unique, ON DELETE CASCADE)
   - `provider_id`: `'audius' | 'youtube'`
   - `provider_track_id`: Provider track ID
   - `track_metadata`: Full track metadata (JSONB)
   - `playback_status`: `'playing' | 'paused' | 'ended' | 'buffering'`
   - `base_position_seconds`: Numeric position
   - `revision`: Monotonically increasing BigInt revision counter
   - `updated_by`, `updated_by_name`: Mutating user
   - `current_queue_item_id`: Active queue item UUID
4. **`queue_items`**:
   - `id`: UUID (Primary Key)
   - `room_id`: Foreign key to `rooms(id)` (ON DELETE CASCADE)
   - `provider_id`: `'audius' | 'youtube'`
   - `provider_track_id`: Provider track identifier
   - `track_metadata`: Track details (JSONB)
   - `added_by`, `added_by_name`: Queuer attribution
   - `queue_position`: Integer index
   - `status`: `'pending' | 'playing' | 'played'`
   - `created_at`: Timestamp

### Applying Database Migrations
Migrations are stored in `neon/migrations/` and can be executed via:
```bash
node --env-file=.env.local scripts/run-migrations.js
```
- `001_vibesync_schema.sql`: Initial core schema (rooms, room_members, playback_state, queue_items).
- `002_youtube_provider.sql`: Check constraint update enabling official YouTube Data API v3 and YouTube IFrame Player API.

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- **Node.js**: v18.17+ or v20+ (v24 tested)
- **npm**: v9+ or v10+
- **Neon Account**: Access to your Neon project dashboard

### 2. Clone and Install
```bash
git clone https://github.com/VivekRay19/VibeSync.git
cd VibeSync
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Fill in your Neon project credentials in `.env.local`:
```ini
DATABASE_URL=postgresql://neondb_owner:YOUR_PASSWORD@ep-odd-heart-b3lqslom-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
DATABASE_URL_UNPOOLED=postgresql://neondb_owner:YOUR_PASSWORD@ep-odd-heart-b3lqslom.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
NEON_BRANCH=production
NEON_SESSION_SECRET=your-random-32-character-secret-key
YOUTUBE_API_KEY=your-google-cloud-youtube-data-api-v3-key
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Automated Testing & Verification

VibeSync maintains an automated test suite verifying music providers, audio drift math, security sessions, and real database workflows:

```bash
# Run full automated test suite (39 tests across 7 test suites)
npm test

# Run TypeScript strict type verification
npx tsc --noEmit

# Run ESLint code quality checks
npm run lint

# Run optimized production build
npm run build
```

---

## 🌐 Deploying to Vercel

1. Push your changes to GitHub:
   ```bash
   git push origin main
   ```
2. In your [Vercel Dashboard](https://vercel.com):
   - Import the `VivekRay19/VibeSync` repository.
   - Configure the following Environment Variables:
     - `DATABASE_URL`: Your pooled Neon database URL.
     - `DATABASE_URL_UNPOOLED`: Your unpooled Neon database URL.
     - `NEON_SESSION_SECRET`: Your 32+ character HMAC session secret.
     - `NEON_BRANCH`: `production`
     - `YOUTUBE_API_KEY`: Your Google Cloud YouTube Data API v3 key.
     - `NEXT_PUBLIC_APP_URL`: Your production Vercel deployment URL.
3. Deploy! Next.js App Router route handlers will automatically connect to Neon Postgres and stream realtime room events over Server-Sent Events.

---

## 📄 Licensing & Catalog Transparency

- Music search and playback are powered by open developer APIs ([Audius](https://audius.co) and official [YouTube Data API v3](https://developers.google.com/youtube/v3)).
- Audio & video streams are served directly from authorized provider platforms: Audius streams directly from decentralized CDN nodes; YouTube plays using the official YouTube IFrame Player API in compliance with YouTube API Developer Terms of Service.
- VibeSync coordinates synchronized playback state and collaborative controls; it does not host, extract, download, relay, or redistribute copyrighted audio/video files.

---

## 👤 Author

Developed by **[Vivek Ray](https://github.com/VivekRay19)**  
GitHub: [VivekRay19/VibeSync](https://github.com/VivekRay19/VibeSync)
