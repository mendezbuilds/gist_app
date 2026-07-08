# Gist App — Architecture Reference
_Last updated: Phase 3.1 | 2026-07-07_

Paste this entire file to the agent at the start of each new phase session.

---

## Project overview

Nigeria-first 1-on-1 + group chat app. React Native + Expo (managed), Supabase backend, Agora calling (Phase 7).

### Stack
| Layer | Technology |
|---|---|
| Mobile | React Native (Expo SDK 57, managed workflow) |
| Routing | Expo Router v4 (file-based, `app/` directory) |
| Backend | Supabase (Postgres, Auth, Realtime, Storage, Edge Functions) |
| Auth | Supabase phone OTP → Twilio SMS delivery |
| Crypto (E2E) | tweetnacl (Curve25519 / XSalsa20-Poly1305) |
| State | Zustand |
| Animation | react-native-reanimated 4 |
| SVG | react-native-svg (Pattern rendering, icons) |
| Fonts | @expo-google-fonts/nunito + @expo-google-fonts/fraunces |
| Icons | lucide-react-native |
| Calling | Agora (Phase 7, not yet integrated) |

### Supabase project
- URL: `https://unyinmnblendjhyoxcwj.supabase.co`
- Project ref: `unyinmnblendjhyoxcwj`

### Bundle ID
- iOS: `com.gist.app`
- Android package: `com.gist.app`

---

## File structure (Phase 3.1)

```
gist_app/
├── app/
│   ├── _layout.tsx          # Root: font load, ThemeProvider, auth listener
│   ├── index.tsx            # Redirect to (auth) or (app) based on onboarding completion
│   ├── (auth)/
│   │   ├── _layout.tsx      # Stack navigator, no header
│   │   ├── welcome.tsx      # Adire hero, wordmark, Get Started
│   │   ├── phone.tsx        # Phone entry, country code picker (+234 default)
│   │   ├── otp.tsx          # 6-box OTP, 60s resend, auto-submit
│   │   ├── username.tsx     # Debounced availability check, format validation
│   │   ├── display-name.tsx # Display name + avatar upload (FormData XHR) → createProfile
│   │   └── permissions.tsx  # Contacts (NDPR) + Notifications onboarding
│   └── (app)/
│       ├── _layout.tsx      # Floating tab bar (CustomTabBar with reanimated)
│       ├── chats/           
│       │   ├── index.tsx    # Chat list, search, filter chips, FAB, realtime previews
│       │   └── [chatId].tsx # Chat room UI (glassmorphism input, typing indicator, message bubbles)
│       ├── status/index.tsx # Empty state — Phase 6
│       ├── calls/index.tsx  # Empty state — Phase 7
│       └── profile/index.tsx # Functional: avatar, username, E2E status, sign out
├── src/
│   ├── theme/
│   │   ├── colors.ts        # Full Adire palette — light + dark tokens
│   │   ├── typography.ts    # Nunito (UI) + Fraunces (display)
│   │   ├── spacing.ts       # 4pt grid, border radii, hit slops
│   │   ├── motion.ts        # Spring configs, reduce-motion hook
│   │   ├── shadows.ts       # Cross-platform elevation
│   │   ├── useTheme.ts      # ThemeContext + useTheme() hook
│   │   └── index.ts         # Barrel export
│   ├── lib/
│   │   ├── supabase.ts      # Typed Supabase client (AsyncStorage)
│   │   ├── auth.ts          # sendOTP, verifyOTP, createProfile, etc.
│   │   ├── crypto.ts        # Key generation, SecureStore, phone SHA-256
│   │   ├── contacts.ts      # Permission request, hash+sync, Edge Function call
│   │   └── messaging.ts     # E2E encrypt/decrypt, fetch/send messages, typing presence, read receipts
│   ├── store/
│   │   ├── authStore.ts     # session, user, isLoading, isInitialized
│   │   ├── profileStore.ts  # profile, update actions
│   │   └── contactsStore.ts # matched contacts list
│   ├── components/ui/
│   │   ├── Button.tsx       # 4 variants, spring press, haptics
│   │   ├── TextInput.tsx    # Animated focus ring, error state
│   │   ├── OTPInput.tsx     # 6-box, auto-advance, paste support
│   │   ├── PhoneInput.tsx   # Country picker modal + number field
│   │   ├── Avatar.tsx       # Image + deterministic-color initials fallback
│   │   └── AdirePattern.tsx # SVG-based traditional Yoruba motifs used as background overlays
│   └── types/
│       └── database.ts      # Profile, PublicProfile, Database (typed client)
├── supabase/
│   ├── migrations/
│   │   ├── 001_profiles.sql
│   │   ├── 002_contact_hash_lookups.sql
│   │   ├── 003_chats_and_messages.sql
│   │   └── 004_message_reads.sql
│   └── functions/
│       ├── sms-webhook/index.ts    
│       └── match-contacts/index.ts 
├── .env                     # Real Supabase credentials
├── .env.example
└── app.json                 # Bundle: com.gist.app, userInterfaceStyle: automatic
```

---

## Database schema additions (Phase 3.1)

```sql
-- message_reads
create table message_reads (
  message_id uuid references messages(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  read_at timestamptz default now(),
  primary key (message_id, user_id)
);
```

---

## UI Overhaul & Features (Phase 3.1 State)

### Chat List Screen (`app/(app)/chats/index.tsx`)
- **Structure**: Glassmorphism header (`colors.background`), search bar (`TextInput` with lucide `Search`), scrollable horizontal filter chips (All, Unread, Groups).
- **Navigation**: Floating Action Button (FAB) at the bottom right (`colors.brandHighlight`) that navigates to the new chat screen.
- **Tab Bar**: Floating pill-shaped tab bar implemented in `app/(app)/_layout.tsx` using a custom `TabBar` component rendered via Expo Router's `<Tabs>`. Contains icons for Chats, Status, Calls, and Profile.

### Chat Room Screen (`app/(app)/chats/[chatId].tsx`)
- **Input Bar**: Glassmorphism input bar with `Smile`, `Paperclip`, and `Camera` icon slots. Dynamic Send/Mic button (shows Mic if empty, Send if typed).
- **Message Bubbles**: 
  - **Sender**: Displays with `colors.bubbleMine`, `FadeIn` animation, and a subtle `AdirePattern` SVG background (opacity 0.2). Read receipts (`SingleTick` / `DoubleTick`) are aligned bottom right.
  - **Receiver**: Displays with `colors.bubbleTheirs` and `FadeInDown.springify()` animation. Shows sender name in group chats.
  - **Dynamic Borders**: Border radii automatically adjust based on whether messages are continuous from the same sender.
- **Typing Indicator**: Utilizes Supabase Realtime Presence (`typing:${chatId}`). Displays a smooth `withRepeat(withSequence(...))` dot animation using Reanimated.
- **Message Reads**: Tracks read status using the `message_reads` table. Automatically marks received messages as read upon view.
- **Known Deferred Items**: Reactions, message editing, and deletion (scheduled for Phase 3.2). BlurView was removed from the header/input backgrounds to prevent Android crashes. Minor visual polish on media icon slots is pending.

---

## E2E encryption foundation (Phases 1 & 2)

Key pair generated at registration using `tweetnacl` (Curve25519/X25519):
- **PRNG Entropy:** Configured with `nacl.setPRNG` using `expo-crypto`.
- **Private key**: stored in `expo-secure-store` with `WHEN_UNLOCKED_THIS_DEVICE_ONLY`
- **Public key**: stored in `profiles.e2e_public_key` (base64)

**Decryption process**: Messages are decrypted entirely on the client. `encrypted_content` (`bytea`) is retrieved from Supabase, converted from hex to `Uint8Array`, and decrypted via `nacl.secretbox.open()` using a cached shared key. No plaintext is stored server-side.

---

## Design system summary

```
Background (light): #F7F1E3 (ivory)   | (dark): #0E1224 (near-black indigo)
Surface:            #FFFFFF            | #1B1F38
My bubble:          #1B2A6B (indigo)   | #3548A3
Their bubble:       #FFFFFF            | #1B1F38
Text primary:       #1A1A1A           | #F0EEE6
Accent (constant):  #E8552F (coral)

Fonts: Nunito (400/500/600/700/800) for UI, Fraunces (400/600/700) for wordmark/display
Theme: auto, follows system (userInterfaceStyle: "automatic")
Motion: spring-first, reduce-motion respected everywhere
Icons: lucide-react-native vector icons on tab bar
AdirePattern: SVG implementation of Yoruba tie-dye and resist-dye motifs
```

---

## Phase roadmap

| Phase | Status | Notes |
|---|---|---|
| 1 — Auth, username, contact sync | ✅ Complete | Base setup |
| 2 — Core messaging (E2E, 1-on-1, group) | ✅ Complete | |
| 3.1 — Receipts, typing, UI Overhaul | ✅ Complete | Floating tab bar, chat list, message bubbles, presence |
| 3.2 — Reactions, message edit/delete | ⬜ Next | |
| 4 — Media | ⬜ | |
| 5 — Push notifications | ⬜ | |
| 6 — Status (ephemeral) | ⬜ | |
| 7 — Calls (Agora) | ⬜ | Needs dev build, not Expo Go |
| 8 — Multi-device | ⬜ | Hardest phase |
| 9 — Admin tooling | ⬜ | |

---

## Key conventions

- **Colors**: always via `useTheme().colors.tokenName`, never raw hex
- **Spacing**: `useTheme().spacing[N]` (4pt grid)
- **Font families**: always `fontFamily: 'Nunito_700Bold'` etc. — exact string matters
- **Animations**: check `useMotionPreference()` before any animation; use instant fallback when `reduceMotion: true`
- **DB inserts**: always use typed `Database` client from `src/types/database.ts`

---

## Setup checklist (before first run)

- [x] `package.json` `"main"` field set to `"expo-router/entry"`
- [x] Run `supabase/migrations/001_profiles.sql`
- [x] Run `supabase/migrations/002_contact_hash_lookups.sql`
- [x] Run `supabase/migrations/003_chats_and_messages.sql`
- [x] Run `supabase/migrations/004_message_reads.sql`
- [x] Deploy Edge Function: `supabase functions deploy match-contacts`
- [x] Configure Twilio credentials
- [x] Create `avatars` storage bucket
- [x] For native testing: `npx expo run:android` or `npx expo run:ios`
