# JRVI HUD Dashboard Spec

This document defines the Heads-Up Display (HUD) and dashboard layout for the JRVI UI. It reflects the implemented components in `src/components` and guides future extensions.

## Layout overview

- Global background: Matrix digital rain on black with centered brand on the home route.
- Top bar: App navigation (Dashboard, Chat, IDE, Drawing Board).
- HUD shell: Sidebar on the left for intra-dashboard navigation, main content on the right.

## Sidebar tabs (current)

The sidebar lists the primary HUD sections (see `src/components/Sidebar.tsx`):

- Agents
- Memory Pulse
- Forecasts
- Sandbox Logs
- Replay Editor
- Kernels
- Plugins
- Drawing Board
- Settings

Each tab shows a panel or sub-dashboard in the main content area. The active tab is highlighted and the sidebar supports collapse/expand.

## Dashboard content (current)

`src/components/Dashboard.tsx` renders a high-level program dashboard:

- Summary header: project name, version, phase, last updated.
- Milestones: status badges, progress bars, and per-task indicators.
- Next steps: prioritized list.
- Technical debt: items with priority and estimated effort.
- Dependencies: grouped frontend, backend, and planned lists.

Data is fetched (for development/debug) from `/api/debug/plan` and rendered with Tailwind classes.

## Chat interface (current)

`src/components/ChatUI.tsx` provides a chat surface. The long-term HUD plan places Chat alongside a suggestions/context panel with optional plugin invocations. A dedicated `ChatWindow` and `SuggestionsPanel` are provided as stubs to evolve toward this layout.

## Planned panels (future)

- Agents: status grid with health, roles, and activity.
- Memory Pulse: time-series of writes/reads with filters, sentiment, and lineage overlays.
- Forecasts: scenario tiles, confidence sliders, and trend charts.
- Sandbox Logs: live tail of audit and debug streams with filters.
- Replay Editor: timeline scrubber, event diff, and re-run controls.
- Kernels: enforcement metrics, rule coverage, and performance.
- Plugins: registry, enable/disable, configuration cards.
- Drawing Board: canvas with tools for whiteboarding (gated behind DEBUG APIs).
- Settings: persona, theme, and security toggles.

## UI building blocks

- Tailwind CSS for utility-first styling.
- Shadcn-style primitives (e.g., `Button`, `cn` util) under `src/components/ui` and `src/lib`.
- Recharts and Monaco are available for charts/editors when needed.

## Navigation model

- Top-level routes: `/dashboard`, `/chat`, `/ide`, `/drawing-board`.
- The HUD sidebar governs tab selection within the dashboard surface.

## Accessibility and performance

- Background animation respects `prefers-reduced-motion` and provides a static render when enabled.
- Layout components should maintain keyboard focus order and visible focus states.

## Implementation notes

- Keep external-facing APIs under `/api/*` and avoid tight coupling to UI components.
- Use the shared logger for consistent client/server diagnostics.
- Stubs for `AppShell`, `ChatWindow`, `SuggestionsPanel`, and `UIUtility` are provided to guide implementation without breaking current routes.
