# PROJECT
- Skincare manufacturing planner: tracks materials, packaging, BOMs, lots, POs, dated production plans, shortages, expiry risk, recommendations, and item traces.

# STACK
- Next.js 14 App Router
- TypeScript
- PostgreSQL
- Prisma
- Tailwind CSS
- Vitest

# CORE SYSTEM
- Prisma snapshot in `lib/planning/service.ts` -> BOM/time-phased demand + FEFO + reorder logic in `lib/planning/engine.ts` -> recommendations, alerts, explainability traces -> UI/API routes.

# KEY FILES
- `lib/planning/engine.ts`
- `lib/planning/types.ts`
- `lib/planning/service.ts`
- `lib/planning/synthetic-dataset.ts`
- `prisma/schema.prisma`
- `prisma/seed.ts`
- `app/page.tsx`
- `app/recommendations/page.tsx`
- `app/items/[itemId]/page.tsx`

# COMMANDS
- Install: `npm install`
- Test: `npm test`
- Typecheck: `npx tsc --noEmit`
- Build: `npm run build`
- Dev: `npm run dev`

For full repository context see `LLM_CONTEXT.md`.
