# Repository Guidelines

## Project Structure & Module Organization
- `app/` contains Next.js App Router routes: `page.tsx` (voting), `results/`, and `settings/`, plus shared layout in `layout.tsx`.
- `app/api/` hosts server-only handlers for events, results, and votes; persistence is abstracted via storage drivers.
- `app/components/` keeps UI building blocks (`HeaderBar`, `Calendar`, `DescriptionCard`, overlays), while `app/lib/` holds client helpers, date utilities, and storage driver logic (KV vs in-memory).
- Global styles live in `app/globals.css`; Tailwind config is in `tailwind.config.ts`. TypeScript config is `tsconfig.json`; Tailwind/PostCSS pipes are in `postcss.config.js`.

## Build, Test, and Development Commands
- `npm run dev` — start the Next.js dev server with hot reload (uses mock storage if KV env vars are absent).
- `npm run build` — production build; run before deploys.
- `npm run start` — serve the production build locally.
- `npm run lint` — ESLint/Next checks for code style and common issues.
- `npm run typecheck` — TypeScript strict type validation without emitting files.

## Coding Style & Naming Conventions
- TypeScript-first with strict mode; prefer functional React components and hooks. Keep client components marked with `"use client"` only when needed.
- Indentation is 2 spaces; favor small, focused functions. Use descriptive, camelCase helpers and PascalCase for components.
- Tailwind CSS drives styling; consolidate shared patterns into components instead of repeating class strings.
- Environment variables belong in `.env.local` (KV_URL, KV_REST_API_URL, KV_REST_API_TOKEN, KV_REST_API_READ_ONLY_TOKEN); never commit secrets.

## Testing Guidelines
- No automated test suite yet; before pushing, run `npm run lint` and `npm run typecheck`.
- Manual checks: create a voter in `/settings`, submit votes on `/`, and verify tallies in `/results` (include both success and error flows).
- When adding tests, align names with the route or component under test (e.g., `HeaderBar.test.tsx`) and cover weekend/date window rules.

## Commit & Pull Request Guidelines
- Commits follow a light Conventional Commits style seen in history (`feat: ...`, `style: ...`); keep scopes and summaries short and imperative.
- For PRs, include a brief summary, linked issue (if any), screenshots for UI changes, and the commands you ran (lint/typecheck). Note any new env vars or migration steps.

## Gestión de tareas y horas
- Al empezar, identifica el proyecto y usa ese nombre en `project`.
- Busca si ya existe una tarea "En curso" para ese trabajo; si existe, registra horas y notas ahí.
- Si no existe, crea una nueva con `npm run task:add` en el monorepo (o edita a mano manteniendo `dd/mm/aaaa`, id incremental y mínimos: `status`, `startDate`, `hours`, `project`).
- Registra siempre la actividad en `data/projects-tasks.json` del monorepo (estado, fechas, horas, notas, proyecto).
- Proyecto de referencia para este repo: `kamikazes-events`.
