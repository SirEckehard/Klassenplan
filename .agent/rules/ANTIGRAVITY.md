---
trigger: always_on
---

## Code Style & Formatting

- Use TypeScript and React with ES Modules
- Leverage npm 10.9+ and Node 22+ features
- Follow light and dark mode design patterns - maintain existing design language unless explicitly requested otherwise
- Format code with Prettier (2 spaces, single quotes, semicolons)
- Write all code comments in English
- Use `camelCase` for variables, `PascalCase` for React components
- Run `npm run format` for files under `src/`; format other files manually with `npx prettier <file>` if needed

## Tests & Quality Checks

- Run unit tests with `npm test -- --run` (or `npx vitest run`)
- Check modified files with `npx eslint <files>`
- TypeScript compilation check: `npx tsc --noEmit`
- Check for unused exports: `npx ts-unused-exports tsconfig.json --ignoreFiles='vite-env.d.ts|main.tsx|App.tsx'`

**Current Code Quality Status (2025-12-31):**

- ✅ ESLint: 0 errors, 0 warnings
- ✅ TypeScript: 0 compilation errors (strict mode)
- ✅ Tests: 1157 tests (112 test files), 100% passing
- ⚠️ Unused Exports: ~82 modules with unused exports (mostly type exports and Props interfaces - acceptable for a TypeScript project)
- ✅ Test Infrastructure: Centralized accessibility helpers and toast matchers for robust testing
- ✅ Architecture: Repository Pattern implemented, UI components reorganized into logical subdirectories
- ✅ i18n: Bilingual support (German/English) fully implemented

## Logging

- Project uses centralized logging system (`src/utils/logger.ts`)
- All `console.*` statements replaced with structured logging (except in logger implementations)
- Development: INFO level and higher, Production: WARN level and higher
- Debug mode (nur Dev-Builds): `window.logger.enableDebug()` in browser; Production-Konfiguration über `enhancedLogger` (`@/utils/logging`)
- **IMPORTANT**: Never use `console.log/warn/error` directly - always use `logInfo/logWarn/logError/logDebug` aus `@/utils`
- Exception: `console.*` is allowed ONLY in logger implementation files and test files
- See `LOGGING.md` for details

## Git Workflow

- Do not create new branches
- Follow existing commit message patterns

## Special Instructions

- Respond in chat in German, but code comments in English
- Maintain existing project structure (`src/components`, `src/hooks`, `src/utils`, etc.)
- Always use the `@/` import alias for `src/` directory

## Internationalization (i18n)

- The application is fully bilingual (German/English)
- Translation files are located in `src/i18n/locales/{de,en}/`
- **IMPORTANT**: When adding or modifying UI texts, BOTH language versions MUST be updated
- Use the `t()` function from `react-i18next` for all user-facing texts
- Structure: Namespace-based (e.g., `generator.json`, `common.json`, `start.json`)

### Workflow for new texts

1. Check if a suitable i18n key already exists
2. If not: Add key to the German file (`de/*.json`)
3. Add corresponding key to the English file (`en/*.json`)
4. Use `t('namespace:key')` or `t('key')` in the component

## Modern Import Patterns

### Module Boundaries

**Status:** Migration abgeschlossen – zentrale Utils bitte ausschließlich über `@/utils` importieren.

**When editing files that import from utils submodules:**

```typescript
// ✅ Preferred pattern (central utils API)
import { generateId, logError, errorHandlers } from '@/utils';
```

**Migration guide:** See [MODULE_BOUNDARIES.md](MODULE_BOUNDARIES.md) for complete API

**Note:** Keep specialized namespaces separate:

- `@/utils/algorithm` - Algorithm functions
- `@/utils/data` - Data persistence
- `@/utils/ui` - UI utilities

**When to migrate:**

- ✅ When making other changes to a file
- ✅ When file imports ≥3 utils from different submodules
- ❌ Don't create separate PRs just for migration
- ❌ Don't migrate if only touching tests

## Development Commands

- `npm run dev` - Start Vite dev server (default port 5173)
- `npm run preview` - Serve the production bundle locally
- `npm run build` - Build production bundle
- `npm test` - Run Vitest in watch mode (append `-- --run` for single run)
- `npm run lint` - Check code with ESLint
- `npm run format` - Format code with Prettier
- `npm run generate:sitemap` - Generate sitemap (auto-run before builds)
- `vitest` - Run tests in watch mode
- `vitest run --reporter=verbose` - Run tests with detailed output
- `vitest run src/path/to/test.test.ts` - Run single test file

## Core Architecture

This is a React-based classroom seating plan generator with a multi-step wizard interface. The application combines layered contexts, repository-backed persistence and a constraint-driven algorithm pipeline.

### State Management Architecture

1. **SeatingPlanGeneratorProvider** (`src/contexts/seatingPlan/SeatingPlanProviders.tsx`) wraps the app and layers the providers:
   - `SeatingPlanStoreProvider` bridges `useSeatingGenerator` into `useSyncExternalStore` snapshots.
   - Domain providers (`StudentManagement`, `ClassroomLayout`, `SeatingAlgorithm`) expose trimmed state/actions.
2. **Domain contexts** split responsibilities:
   - `StudentManagementContext` – student CRUD, CSV import/export, placeholder generation
   - `ClassroomLayoutContext` – scene editing, feature palette (Fenster/Tür/Pult/Tafel), template CRUD, circle sync & seating mode switching
   - `SeatingAlgorithmContext` – mix settings, refinement, locking, statistics badges, history actions
3. **useSeatingGenerator** orchestrates repositories, undo/redo stacks, worker-based algorithm calls and UI signals (post-update notice, changelog badge).

Consumers import dedicated hooks (e.g. `useClassroomLayoutContext`) to minimize re-renders and keep side effects localized.

### Data Persistence

- **localStorage** – UI preferences (theme, grid visibility, layout options, consent)
- **IndexedDB repositories** (`src/repositories/`) – students, seating plans, templates, mix history, circle layouts und `ClassroomFeature`-Daten (Fenster, Türen, Pult, Tafel)
- Result-pattern (`Success`/`Failure`) provides typed error handling and enables repository swapping.

### Algorithm & Layout Engine

- Constraint engine weights criteria for restlessness, shyness, distraction, partners, distance wishes, height categories, door/window preferences and locked seats.
- Multi-pass refinement via `refineSeatingLocal` supports configurable tries/passes and reuses immutable scene snapshots.
- Circle mode stays in sync through `generateCircleSeating`, `regenerateCircle`, and `syncCircleFromTable` actions.
- Template system (`single`, `double`, `group4`, `group6`) defaults to 0° rotation and feeds drag-and-drop operations.

### Hook & Component Landscape

- Hooks are grouped by domain (`hooks/wizard`, `hooks/scene`, `hooks/canvas`, `hooks/circle`, `hooks/ui`) and favour focused responsibilities (scene history, canvas interactions, shortcut handling, drag/drop state, etc.).
- Wizard UI resides in `src/components/SeatingPlanGenerator/` with shared UI primitives in `src/components/ui/` and student tools in `src/components/students/`.
- Circle-specific components live under `src/components/circle/` and share tokens with the main UI.

### Styling & Design Tokens

- Tailwind CSS 4 via `@tailwindcss/vite` with semantic utilities defined in `src/index.css` (`@theme` + `@utility`).
- `@/utils/ui/designTokens` exports surface/button bundles; student toggles rely on `@/components/students/studentStyleTokens` for consistent sizing and coloring.
- Immutable styling patterns ensure Dark/Light parity via CSS variables and prevent component-level drift.

## Testing Strategy

- **Vitest** with jsdom environment for React component testing
- **@testing-library/react** for component interaction testing
- Test files follow `*.test.ts` or `*.test.tsx` pattern in `__tests__` directories
- Shared test utilities in `src/__tests__/utils/` provide mock data factories

Key testing utilities:

- `createMockStudent()` - Generate test student data
- `createMockClassroomScene()` - Generate test classroom layouts
- `setupCleanStorage()` - Reset storage between tests

### Modern Test Patterns (Preferred)

**When writing or modifying tests, use semantic accessibility-first queries:**

```typescript
// ❌ Fragile - breaks with UI text changes
screen.getByText('Erfolgreich gespeichert');
screen.getByText('Mischen ist komplett zufällig!');

// ✅ Robust - uses ARIA roles and helpers
import { getButton, getAlert, getField, getHeading } from '@/__tests__/utils';

getButton(/Speichern/i); // Find button by accessible name
getAlert(/Warnung/i); // Find alert by aria-label
getField(/Tafel anzeigen/i); // Find form field by label
getHeading(/Klassenliste/i, 2); // Find h2 by text
```

**Toast testing:**

```typescript
// ❌ Old pattern
expect(screen.getByText('Erfolgreich gespeichert')).toBeInTheDocument();

// ✅ New pattern with toast matchers
import { expectSuccessToast, expectErrorToast } from '@/__tests__/utils';

expectSuccessToast('Erfolgreich gespeichert');
expectErrorToast(); // Just check toast exists
```

**Available test helpers:**

- `toastMatchers.ts` - `expectSuccessToast()`, `expectErrorToast()`, `waitForToast()`
- `accessibilityHelpers.ts` - `getButton()`, `getAlert()`, `getField()`, `getDialog()`, etc.

**When to use:**

- ✅ Always prefer semantic queries for new tests
- ✅ Migrate when fixing or modifying existing tests
- ✅ Use `getByRole()` over `getByText()` for interactive elements

## Performance Considerations

- The seating algorithm is computationally intensive - uses web workers for large classrooms
- State updates use `React.useCallback` and `React.useMemo` extensively to prevent unnecessary re-renders
- The classroom canvas uses SVG for crisp rendering at all zoom levels
- Large student lists (>36 students) are discouraged due to algorithm complexity
- **React.memo** used for expensive component re-renders
- **Lazy loading** implemented for large components

## Error Handling Patterns

- Toast notifications (custom toast system) for user feedback
- Defensive programming with null checks throughout
- Graceful degradation when storage is unavailable
- Validation at data boundaries (imports, user input)
- Centralized error logging via logger utility

## Accessibility Features

- **Keyboard navigation** support throughout the application
- **aria-label** and **aria-pressed** attributes for screen readers
- **Focus management** with visible focus indicators
- **Responsive design** that works at 200% zoom
- **Touch-optimized** interactions for mobile devices

## Important Constraints

- Maximum 36 students per classroom (defined in `src/utils/constants.ts`)
- Classroom dimensions are fixed at 900x600 pixels
- Mix history is limited to 20 entries to prevent memory bloat
- Backup files have strict size limits (2MB file, 1MB content)

## Color Palette Standards

Primary Klassenplan colors:

- **Blue (`blue-600`)** - Primary actions, main navigation
- **Orange (`orange-600`)** - Step labels and accents
- **Green (`green-600`)** - Success actions (save, add)
- **Red (`red-600`)** - Delete/remove actions
- **Amber (`amber-500`)** - Back navigation, warnings
- **Gray (`gray-*`)** - Neutral elements, secondary actions

Always include appropriate `dark:` variants for dark mode support.