# JRVI Unified UI (Chat + Dashboard)

This document summarizes the unified JRVI UI, combining the dashboard (HUD) with a chat-centric workflow.

Key features

- Context-aware assistant with persona routing
- Suggestion system with quick actions (planned)
- Sidebar-driven HUD with top navigation (Dashboard, Chat, IDE, Drawing Board)
- Matrix digital rain background with reduced-motion support
- Tailwind utilities and shadcn-style primitives

Code map

- App shell: `src/components/AppShell.tsx`
- Sidebar: `src/components/Sidebar.tsx`
- Dashboard: `src/components/Dashboard.tsx`
- Chat: `src/components/ChatUI.tsx` (with stubs `ChatWindow.tsx`, `SuggestionsPanel.tsx`)
- UI primitives: `src/components/ui/*`, helpers: `src/components/UIUtility.tsx`
- Analytics/HUD data: `src/analytics/{hudPayload.ts,hudEnhancer.ts}`

Navigation

- Routes: `/dashboard`, `/chat`, `/ide`, `/drawing-board`
- Sidebar tabs: Agents, Memory Pulse, Forecasts, Sandbox Logs, Replay Editor, Kernels, Plugins, Drawing Board, Settings

Notes

- Future iterations will wire SuggestionsPanel and ChatWindow for richer chat UX.
