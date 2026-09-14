# 0006 – SVG scene with a fixed 900 × 600 coordinate system

- **Status:** accepted
- **Sources:** `AGENTS.md` (Performance Considerations, Important Constraints),
  `CLASSROOM_WIDTH` / `CLASSROOM_HEIGHT` in `src/utils/constants.ts`,
  `src/services/export/sceneRenderer.tsx`

## Context

The same classroom is edited in the wizard, shown full-screen on a projector
with pan and zoom, and exported as print, PDF, PNG and SVG.

## Decision

- The classroom is rendered as SVG, for crisp rendering at every zoom level.
- The room is a scene of fixed size, 900 × 600, sized to hold up to 36 students.
  Tables and room elements are positioned in this coordinate system, and the
  export renders the same components into SVG.

## Alternatives considered

None recorded.

## Consequences

- Stored scenes, room templates, saved plans and backups carry positions in
  these coordinates. Changing the size means migrating stored data.
- Free-form room geometry is out of scope. The presentation view frames the
  furnished part of the room instead of the whole scene.
