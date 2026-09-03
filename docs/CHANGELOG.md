# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [2.0.0] - 2026-09-03

### Added

- **Search, filter and sort in the class list** – find individual students via the search or narrow the list down to a group (e.g. "restless only", "without photo only"), with a free sort order or alphabetical sorting
- **Bulk editing** – select several students via checkboxes and set gender, height, language level, social role or individual traits for the whole selection at once
- **Undo and redo throughout the app** – the class list, the seating plan and the classroom editor now respond consistently to `Ctrl/Cmd+Z` and `Ctrl/Cmd+Shift+Z`; an accidentally deleted student is restored together with their photo
- **Reworked class management** – classes are switched via a tidied-up bar showing the student count and offering direct access to import, export and the name game
- **Configurable name display** – step 3, presentation mode and the export let you pick between first name only, first name + last-name initial, and the full name; duplicate first names are pointed out
- **PNG and SVG export** – besides PDF and printing, the current view can be saved as an image or a vector graphic
- **Viewing direction in the export** – "From the back" rotates the plan by 180° for a desk at the back of the room while keeping names and photos readable
- **"Who's next?" in presentation mode** – draws a random student and highlights their seat with a spotlight; everyone gets a turn before anyone repeats. `F` toggles full screen, `Space` draws, `Esc` resets
- **"Optimize" in the seating plan** – improves the existing plan step by step instead of shuffling it from scratch
- **CSV import help and diagnostics** – "What the file has to look like" shows an example class list, and unsuitable files produce a message explaining exactly what is wrong (wrong file type, missing header row, missing name column, wrong delimiter, too many rows)

### Improved

- Seating plans are auto-saved when leaving step 3, recycling the previous auto-save so the shuffle history is not buried under intermediate states
- Reworked backup flow – the export dialog shows password strength, and restoring offers "Replace everything" or "Merge"
- Offline indicator confirming that everything keeps working without an internet connection
- Seating circle – connection lines toggle with `C`, and the circle can be shuffled without changing the seating plan
- Shuffle criteria are grouped by room, identity, abilities, behavior and social aspects, and are explained inline
- Reworked start-page preview – the images can be browsed, paused and enlarged
- Theme and language can now also be switched in presentation mode and in the name game
- Tidied-up toolbars, consistent loading indicators and clearer hints when tables or seats are still missing
- Destructive dialogs now start focused on "Cancel" so an accidental Enter deletes nothing
- Extended FAQ and help texts, leaner bundles, shorter loading times, i18n and bundle-size checks in CI, and updated dependencies

### Fixed

- PDF exports are now around 1 MB instead of more than 30 MB
- The icons in the class management bar no longer slip out of place
- The backup message now appears only once the file has actually been exported

## [1.9.0] - 2026-07-29

### Added

- **Alignment guides in the classroom editor** – smart guide lines appear while moving tables and room elements so they snap neatly into alignment with each other; can be toggled in the view settings
- **Photo collision warning** – the classroom editor now indicates when student photos would overlap or extend beyond the room; toggleable in the view settings

### Improved

- Consistent navigation – the back buttons in presentation mode, export and the name game are now placed and styled consistently
- The class list makes better use of the available screen height while keeping the action buttons visible
- Updated dependencies

### Fixed

- The context menu in the classroom now works reliably with both touch and mouse input

## [1.8.0] - 2026-07-18

### Added

- **Name game** – learn your students' names playfully with a photo quiz and a memory game based on the stored student photos, including learning progress per class
- **Edit student photos** – existing photos can now be changed and re-cropped afterwards
- **Resizable room elements** – windows, doors and other classroom elements can now be scaled, with improved drag-and-drop when placing them
- **Redo function in the classroom editor** – undo and redo now work reliably with room elements too

### Improved

- Room elements can be quickly shown and hidden; new compact view settings directly in the classroom canvas
- Storage and backup management is now available via the new settings icon in the footer
- CSV export now uses the class name as the file name
- Reworked classroom canvas – crisper edges and more compact default sizes for room elements
- Performance and SEO improvements plus updated dependencies (including TypeScript 7.0)

### Fixed

- A scrollbar display issue
- Minor issues in the server setup (nginx configuration, Docker build, prerender verification)

## [1.7.0] - 2026-07-09

### Added

- **Optional student photos** – add, crop (pan/zoom/rotate) and display local student photos; stored only on the device, automatically downscaled with EXIF/GPS metadata stripped
- **Presentation mode** (`/present`) – full-screen view for smartboards and projectors with teacher/student perspective, pan & zoom (mouse, wheel, pinch), photo and color toggles
- **New room elements** – additional classroom elements with reworked shapes can be placed and rotated
- **Keyboard drag-and-drop** – students can now be rearranged in step 3 via the keyboard alone

### Improved

- **Backup encryption hardened** – PBKDF2 iterations raised to 600,000, KDF parameters stored in the backup file (older backups remain importable), password confirmation and minimum length on export
- **Accessibility** – modals return focus to the triggering element on close; Enter no longer confirms destructive dialogs globally
- **Internationalization** – all user-facing texts from utility layers (error messages, statistics labels, badge tooltips) now follow the active language
- **Service worker updates** – a new version activates only after confirmation via the update prompt
- Numerous UI/UX improvements plus greater stability and code quality

### Fixed

- Security headers (CSP, HSTS) are now sent on all responses in the nginx deployment; the PWA install prompt works again under the strict CSP
- Various issues on mobile devices (headers, delete buttons)
- A caching/chunk-loading bug

## [1.6.0] - 2026-06-08

### Added

- **Open source release** – Klassenplan's full source code is now publicly available on GitHub under the GNU Affero General Public License v3.0 or later (AGPL-3.0-or-later)
- **Self-hosting** – A production-ready Docker setup (multi-stage build with nginx) ships with the repository, so Klassenplan can be run on your own server; all data still stays 100 % local

### Improved

- Extensive UI/UX improvements throughout the app
- Code quality and stability improvements

## [1.5.0] - 2026-05-10

### Added

- **New logo and brand identity** – Klassenplan has a fresh, clear look that runs consistently through the app, PDF export, and preview
- **New typeface: DM Sans** – Modern typography throughout, including PDF export and print preview
- **Reworked landing page** – New preview screenshots show every step of the workflow at a glance

### Improved

- **Clearer wording for student needs**
  - "Hearing/vision impairment" is now **"Front seats"** – describes the actual intent more precisely: a fixed seat in the front row, regardless of the reason
  - Clearer distinction between **disruptive** (active, distracts others) and **distractible** (passive, is easily distracted)
- **New icon set (Phosphor)** – Sharper, more consistent icons throughout the UI
- **FAQ revised** – Content updated
- **Visual polish** – Footer, buttons, and need indicators (pills) refined

### Fixed

- Incorrect icon in the shuffle options
- Minor display glitches on the need indicators

## [1.4.2] - 2026-05-02

### Improved

- FAQ: Added a note on what seating plans can and cannot do
- "Delete all data" moved to the footer
- Stability and quality improvements

## [1.4.1] - 2026-03-29

### Improved

- Stability and security improvements

## [1.4.0] - 2026-01-23

### Added

- New server (Hetzner): All data is stored and processed exclusively in Germany
- Dynamic blackboard-position detection: The algorithm now detects automatically where the blackboard is – if it sits on the left side of the room, "front" means left too

### Improved

- Algorithm improvements
- Adjusted table sizes
- UI/UX refinements
- Security updates

## [1.3.0] - 2026-01-04

### Added

- English translation: The entire application is now bilingual (German/English)
- New wizard flow: Reworked step-by-step assistant with improved guidance
- Language proficiency (DaZ support): New student attribute factored into shuffling
- Social role: New student attribute (e.g. class representative) for better group composition
- URL-based language selection: Language can be set via `/en` or `/de` in the URL
- Improved PWA functionality: Update notifications and "Install as app" option

### Improved

- More logical and consistent ordering of shuffle criteria in steps 1 and 3
- Simplified landing page with reworked design and FAQ
- Filter logic now shows only the shuffle criteria actually in use
- Unified icon-toggle logic – icons now show the action rather than the state
- Navigation: Consistent back/next button colors (orange/blue)
- Export: New option for additional class info (year level, notes) in the PDF
- Seating circle: Save button integrated into the name-field row
- Footer with improved theme and language toggles
- Auto-save on export only triggers on actual changes
- Improved stability when switching classes and during data persistence

### Security & Technical

- Security updates for all dependencies
- Improved error handling with structured logging
- Fixed race conditions in the persistence layer
- Optimized keyboard shortcuts without conflicts (Cmd/Ctrl+E)
- Code quality: ESLint errors fixed, TypeScript typing improved

### Fixed

- Duplicate validation for class names
- Trackpad zoom getting stuck
- Improved auto-save behavior when leaving the editor

## [1.2.1] - 2025-12-31

### Fixed

- Backup import for classrooms with 6-seat group tables

### Improved

- Code quality: Removed unused variables and stale imports

## [1.2.0] - 2025-12-13

### Added

- Multi-class management: Create any number of classes and keep their seating plans separate
- Multiple preferred and distance partners: Pick up to 3 partners per student in priority order, all taken into account by the algorithm
- Offline availability – load Klassenplan once and use the generator fully without an internet connection afterwards

### Improved

- Improved statistics with color-coded feedback directly on the seating plan for a faster read on composition
- Compact class-list view with optional icon labels for better overview
- Various UI/UX refinements and stability updates

## [1.1.3] - 2025-11-08

### Improved

- Better handling of long names in the seating circle
- Algorithm refinements for window and door proximity
- Optimized performance when loading and saving classrooms
- Various improvements to codebase and stability
- Various UI/UX improvements
- Groundwork for offline support and PWA functionality

## [1.1.2] - 2025-10-31

### Added

- Windows, doors, and the teacher's desk can now be added and moved inside the classroom
- Algorithm now respects window- and door-proximity preferences

### Improved

- UI/UX improvements

### Fixed

- Statistics display extended and corrected
- Improved printing in Safari

## [1.1.1] - 2025-10-25

### Added

- Quick name entry when using "Create class"

### Improved

- Gender attribute is optional
- Seating plan and seating circle can be rotated independently in the export

### Known Issues

- Statistics display in step 3 occasionally returns incorrect values
- Safari: Faulty print preview in the print dialog & extra blank page

## [1.1.0] - 2025-10-22

### Added

- Complete UI redesign with modern, consistent controls
- Introduction of the body-height feature

### Improved

- Storage and backup management now opens in its own window
- Saving classroom templates in step 2 now shows a dialog with an overwrite option
- Refined display of the lock icon and need indicators directly beneath names
- Portrait is now the default export format; landscape is still recommended for seating circles
- Support for names up to 12 characters with automatic scaling

### Known Issues

- Statistics display in step 3 occasionally returns incorrect values
- Safari: Faulty print preview in the print dialog & extra blank page

## [1.0.3] - 2025-10-16

### Added

- Quick "Create class" setup added to the class list
- Introduction of the distance-preference feature
- "Set up classroom" quick-setup menu added to the classroom view and removed from the class list

### Improved

- Classroom-template management integrated into the new quick-setup menu
- CSV import for class lists improved: supports importing external lists (e.g. student lists with grades)
- UI/UX improvements
- Improved accessibility and keyboard navigation
- Improved performance

### Fixed

- Fixed the repetition criterion for seating plans

## [1.0.2] - 2025-10-05

### Added

- Restructured class list with compact and detailed views
- Introduced minimized and expanded sidebar in classroom, seating plan/circle, and export views
- Added FAQ page with answers to common questions

### Improved

- UI/UX improvements

### Fixed

- Bug fixes and stability improvements

## [1.0.1] - 2025-09-28

### Added

- Seating circle mode
- PDF export preview improved: portrait and landscape with refined rendering

### Improved

- UI/UX improvements

### Fixed

- Bug fixes and stability improvements

## [1.0.0] - 2025-08-30

Initial release

### Added

- Intelligent seating-plan algorithm
- Classroom editor with drag-and-drop
- Backup & restore via IndexedDB
- Dark mode support
- PDF export for seating plans
