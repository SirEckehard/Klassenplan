# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Save your own presets for mixing and adjust the built-in ones; "Recommended mix" is now called "Default" and "New class" "Getting to know each other"
- A right-click or a long press on an entry in the "Library" opens a menu with everything you can do with it
- Add room templates and presets right in the "Library"
- Undo and redo in the "Library"

### Improved

- Tables pushed together count as one group when mixing, and in a row of desks the neighbours at each join count too
- Fewer messages, and those left appear above the status bar instead of over your work
- Deleting asks less: students, photos and what you delete in the "Library" come back with "Undo", and deleting a class shows what goes with it
- The frame around the focused button is calmer
- Dragging a student shows the swap before you let go
- A blocked button or an entry that cannot be used says why, right where it happens
- The status bar offers a new version quietly, confirms saving and looks alike on every layer
- Every inspector starts with the same header: an icon, the name and one line with what matters
- In the "Library", clicking an entry shows a hidden inspector, and a second click hides it again
- The menu on tables and room elements lists its actions with words and shortcuts
- Saved plans, mixes and rooms take far less space on the device and in backups
- "Back" on the export page and in the presentation works like the browser's back button
- Every page has the same header, with "Back" at the top right on the class tools and the pages beside the app
- The logo moves: pointing at it mixes the letters of its name, and on the way into the workspace they take their seats in it
- On a phone the presentation's bar takes one row, and on a large screen a class tool's main button no longer spans the window

### Fixed

- On a phone, the FAQ, the legal pages and the other pages beside the app no longer run past the edge of the screen
- Naming a plan in the inspector saves it
- A student can no longer be added twice under the same name
- Large backups can always be restored, and backups are about half the size
- On a phone in Chrome, the seating plan and the circle show again
- A student at the seat nearest the window or door counts as fully met
- Undoing the removal of a table brings back its locks
- On an iPhone, tall dialogs fit the screen, and downloads in Safari no longer arrive empty
- Other small fixes

## [3.2.3] - 2026-10-30

### Added

- A sheet for the substitute: "Substitute" on the export page prints the plan with just the names, class, room and date, plus a note

### Improved

- Wishes take turns over several plans instead of turning into fixed pairs; students who wish for each other mostly stay together
- At tables of four and six, mixing also counts the seats round the corner and across as neighbours
- Help opens beside the plan instead of over it
- On a phone or tablet held upright, the circle stands upright too, and the plan and the circle fit the screen without scrolling
- On a phone, "Mix" and "Align" sit within reach of your thumb above the status bar
- A plan's inspector shows in a word whether it is saved
- New icons for "Library" and "Backup", and a tidier name game

### Fixed

- Undoing the removal of a student brings their photo back too
- Students added after the circle was made are no longer missing from it
- "Mix" tells you when there are fewer seats than students instead of silently leaving some out
- Locks are saved with the plan, and "Set up from scratch" no longer puts locked students on the wrong seats
- Coming back from the "Library", the export or a class tool, the workspace is as you left it
- Hiding room elements in the export leaves the seating plan as it is
- After mixing, the students glide to their seats evenly, without a jump
- "Where does who sit?" finds names typed without accents, such as "Celine" for Céline
- Other small fixes

## [3.2.2] - 2026-10-28

### Improved

- On a phone or tablet held upright, the room and the seating plan stand upright and fill the screen
- After mixing, undoing or swapping, you see the students glide to their new seats
- Drawers, menus and switching layers are gently animated, unless "Reduce motion" is set
- "Who's next?" shows the drawn student's seat in the plan or the circle
- On a phone, the class list is tidier, and ticked students are edited in the same sheet as a single one

### Fixed

- Dragging a student no longer locks them by accident
- Small display fixes on phones and tablets

## [3.2.1] - 2026-10-26

### Added

- "Theme as the system" in the settings menu: light and dark follow the device again

### Improved

- A locked seat keeps its gender colour and shows the lock as a blue edge
- Marks on the seats follow the tables' rounded corners and are no longer cut off
- On the export sheet, the board, windows and door are lighter, so the seats stand out

### Fixed

- Two open windows of Klassenplan no longer overwrite each other's changes
- Changes are no longer lost when you switch classes or leave the page
- A full storage or a failed read no longer makes classes or data disappear
- Student photos are no longer deleted by mistake
- Undo no longer brings back deleted students or the state from before a restored backup
- A deleted student also leaves the seating circle
- The presentation and the class tools no longer use plans for tables that are gone
- A saved plan no longer shows as unsaved by mistake, nor is it saved twice
- On an iPhone and iPad, .klassenplan backups can be chosen, and "Print" opens the PDF without a pop-up warning
- The CSV import reads "sehr unruhig" and "sehr schüchtern" correctly
- Other small fixes

## [3.2.0] - 2026-10-22

### Added

- "Notes" in the seating plan's inspector name what the class and the room cannot meet, such as too few front seats
- Backups are now .klassenplan files; in Chrome and Edge a double-click opens one in the installed app
- "Install as App" in the gear menu shows how to install Klassenplan in your browser
- A guide for a school's IT on installing Klassenplan on every computer

### Improved

- Mixing meets preferred partners and distance requests far better, and the fulfilment percentages mean what they say
- "Mix" tries three starts, keeps the best plan and is still faster than before
- A plan is now saved and opened in its inspector; Ctrl/⌘+S still saves straight away
- Classes, rooms and templates no longer need dialogs, and names are changed right in the inspector's header
- All inspectors share one layout, with a row per setting and menus instead of long lists
- "Front seats" at "Very important" keeps the students in the front row
- "Gender" counts diverse as a gender of its own, and "Repetition" weighs recent plans more
- In the circle, students with a distance request, restless and distractible students sit apart where possible
- "Add student" and "Create placeholders" are under "Add" in the toolbar
- Searching the class list opens the matching student while you type
- The settings gear is now on the start page and the other pages too
- Messages glide in gently and stay while you point at them
- The "Recipes" are now called "Presets"
- The FAQ explains mixing, the fulfilment and installing the app

### Fixed

- "Mix" with every criterion off is truly random now
- "Repetition" counts only the plans that were really in use
- After the room is set up anew, the old plan no longer lands jumbled on the new tables
- Opening a saved plan of another room no longer mixes it anew
- Several mixing fixes, for instance for students who need a front seat
- Photos show on the seating plan from the start, on touch screens too
- On an iPad, dragging in the room no longer scrolls the page
- Other small fixes

## [3.1.4] - 2026-10-15

### Improved

- Internal improvements

## [3.1.3] - 2026-10-15

### Improved

- Internal improvements

## [3.1.2] - 2026-10-12

### Added

- "Hand out duties" among the class tools draws duties such as board duty in fair turns, also as a PDF to put up

### Improved

- "Print" opens the browser's print dialog straight away, and the printout is sharper
- The class list and the note list can also be sorted by last name
- Social role and language level are chosen from a menu in the inspector
- The student inspector is tidier on large screens

### Fixed

- Names on turned tables are as large as the others
- Small display fixes in dark mode and in the narrow toolbar

## [3.1.1] - 2026-10-11

### Added

- A note list to print: "List" on the export page prints the class with room for notes or a grid to tick off

### Improved

- "Mix" is about twice as fast
- A new typeface drawn for legibility: Atkinson Hyperlegible Next
- Installed as an app, Klassenplan opens on the class instead of the start page
- The small print in the toolbar, the inspector and the menus grows with the browser's text size

### Fixed

- Restoring a backup with "Replace everything" no longer overwrites the open class with another one
- If saving fails, Klassenplan says so at once and tries again on its own
- A removed student no longer lingers unseen in the others' wish lists
- The class list opens in Excel as a table, with the umlauts intact
- The "Library" no longer fills up with automatically saved plans
- The question whether a plan was only a test no longer appears during the presentation
- Other small fixes

## [3.1.0] - 2026-10-07

### Added

- A table can be taken out of the mix: it stays in the room but is left empty when mixing
- A room can be filled from the front, leaving the spare seats at the back
- The gender colours can be switched off in the export
- The class list can be walked with the arrow keys

### Improved

- Height is "Short", "Tall" or not set; "Medium" is gone
- The arrows in the inspector follow the order of the class list

### Fixed

- Small display fixes on the iPhone and in dark mode

## [3.0.0] - 2026-10-06

### Added

- A new design: every layer (class, room, plan) is laid out alike, with the toolbar on the left, the inspector on the right and the status bar below
- The "Library" replaces "Plans, mixes & neighbourhoods" and shows classes, rooms, plans and mixes in columns, like a file manager
- A class can have several rooms, such as the classroom and the lab, each with its own tables and plans
- Criteria are set in words (Off, Consider, Important, Very important), and recipes set them all at once
- "Attributes" asks the whole class at once, such as "Who is currently restless?", and "Relationships" shows who wants to sit next to whom
- Three new class tools: "Who's next?", "Where does who sit?" and "Build groups"
- In the "Library", you can mark plans in use yourself and reset a class's neighbourhoods, for a new school year, say
- A settings menu in the header with theme, language, updates and the changelog replaces the footer
- Coming from an earlier version, you see once what has changed, and the "Library" has a tour of its own
- A browser that is too old shows a notice instead of a blank page
- Single-key shortcuts can be switched off, so speech input cannot set them off
- On an error, Klassenplan offers a prepared email with a reference code

### Improved

- Tables and room elements can be added with a click or Enter as well as by dragging
- A marker on a seat explains itself when you point at it
- Names are easier to read: long names take two lines, and the export and the presentation show them larger
- New shortcuts, such as Ctrl/⌘+Enter to mix
- The lists of preferred and avoided partners have a search field
- Updated dependencies

### Fixed

- Restoring a backup with "Merge" adds its classes instead of replacing all existing ones
- Long names and notes no longer make the next backup unreadable
- Loading a room template no longer overwrites the open plan
- After switching classes, Ctrl/⌘+Z no longer brings back the previous class's data
- Offline, Klassenplan works from the first visit and without an error screen
- "Shuffle randomly" in the circle is truly random now
- Other small fixes

## [2.2.0] - 2026-09-17

### Added

- The collapsed toolbar can now do everything the expanded one can
- "Restore defaults" sets every criterion back to its recommended importance

### Improved

- Criteria your class has no data for no longer act unnoticed
- "Distractibility" can be used once there is one distractible and one restless student
- New preview screenshots on the start page

### Fixed

- Names that would look the same on the tables are told apart everywhere, such as "Frida Eh." and "Frida Em."
- The mix history names the criteria in English in the English interface

## [2.1.1] - 2026-09-16

### Improved

- The start page loads faster and with far less data
- For offline use, a first visit stores about 4 MB instead of 16, and every page starts with less to download
- Better accessibility on the start page
- Updated dependencies

### Fixed

- German pages no longer show in English for a moment on the first visit

## [2.1.0] - 2026-09-16

### Added

- "Load sample class" lets you try Klassenplan without data of your own: 24 invented students in a furnished room
- On the first visit, a short tour points out the most important controls

### Improved

- The "Refine" button is gone, since "Mix" already refines the plan on its own
- How names appear on the tables is set in the view settings; the short form in the class list is gone
- Smaller improvements, for instance to the CSV import and to deleting all data

## [2.0.4] - 2026-09-09

### Added

- Class lists from WebUntis, Schulmanager Online and SchILD-NRW can be imported directly
- If a file holds several classes, the import asks which one you want
- "Check for updates" looks for a new version on the spot

### Improved

- A tab left open, on the projector for instance, checks for updates every hour on its own
- Updated dependencies

### Fixed

- The CSV import reads umlauts from Windows files, title lines and names such as "Müller, Anna" correctly
- The "New version available" notice no longer vanishes at once

## [2.0.3] - 2026-09-08

### Improved

- On a phone, a button in the class list jumps to the end and back to the top

### Fixed

- The presentation shows only the furnished part of the room, so the names come out larger
- "Who's next?" highlights exactly one student at group tables again
- The class list keeps its sort order when you come back to it
- Small display fixes on phones and tablets

## [2.0.2] - 2026-09-05

### Fixed

- Menus with an input field can be typed into on phones and tablets again
- Opening a menu puts the cursor in its first field again

## [2.0.1] - 2026-09-05

### Added

- Klassenplan recognises which plans were really in use and so avoids repetition better
- "Neighbourhoods" shows who has sat next to whom, and how often
- A reminder appears when the last backup is more than 30 days old
- Klassenplan asks the browser not to clear your data on its own

### Improved

- A more compact class list with a new menu for adding students
- Tablets in portrait show the toolbar and the room at the same time
- "Optimize" is now called "Refine"
- The export remembers its settings
- An extended FAQ and reworked texts throughout the app
- Updated dependencies

### Fixed

- Escape closes only the topmost dialog
- The grid setting takes effect in every view at once

## [2.0.0] - 2026-09-03

### Added

- Search, filter and sort in the class list
- Edit several students at once
- Undo and redo throughout the app; a deleted student comes back with their photo
- You choose how names appear: first name only, with the last name's initial or in full
- Export as an image (PNG) and a vector graphic (SVG)
- "From the back" turns the plan in the export for a desk at the back of the room
- "Who's next?" in the presentation draws students at random until everyone has had a turn
- "Refine" improves a plan step by step instead of mixing it anew
- The CSV import shows an example and explains what is wrong with a file

### Improved

- A new class bar with the student count and quick access to import, export and the name game
- Plans are saved automatically when you leave them
- Backups show the password's strength, and restoring offers "Replace everything" or "Merge"
- The circle can be shuffled without changing the seating plan
- The criteria are grouped by topic and explained right there
- Delete dialogs start on "Cancel", so nothing gets deleted by accident
- Faster loading, a new preview on the start page and many small improvements

### Fixed

- PDFs are around 1 MB instead of more than 30 MB
- Small fixes in the class bar and the backup

## [1.9.0] - 2026-07-29

### Added

- Guide lines in the room let tables and room elements snap neatly into line
- A warning shows when student photos overlap or reach beyond the room

### Improved

- Consistent back buttons, and a class list that makes better use of the screen height
- Updated dependencies

### Fixed

- The context menu in the room works reliably with mouse and touch

## [1.8.0] - 2026-07-18

### Added

- The name game: learn your class's names with a photo quiz and a memory game
- Photos can be changed and re-cropped afterwards
- Windows, doors and other room elements can be resized
- Undo and redo work with room elements too

### Improved

- Room elements can be shown and hidden quickly
- Storage and backup are reached through the new settings icon
- The CSV export is named after the class
- Faster loading and updated dependencies

### Fixed

- Small fixes

## [1.7.0] - 2026-07-09

### Added

- Student photos that stay on your device, automatically downscaled and stripped of location data
- Presentation mode shows the plan full screen on a projector or an interactive whiteboard
- New room elements that can be placed and turned
- Students can be moved with the keyboard too

### Improved

- Stronger backup encryption
- Better accessibility in dialogs, and messages in both languages throughout
- A new version only takes effect once you confirm it
- Many small improvements to usability and stability

### Fixed

- Several fixes on mobile devices, when loading and for "Install as App"

## [1.6.0] - 2026-06-08

### Added

- Klassenplan is open source: the source code is on GitHub under the AGPL-3.0
- The bundled Docker setup lets you host Klassenplan yourself

### Improved

- Many improvements to usability and stability

## [1.5.0] - 2026-05-10

### Added

- A new logo, a new typeface (DM Sans) and a reworked start page

### Improved

- "Hearing/vision impairment" is now called "Front seats"
- "Restlessness" and "Distractibility" are clearly told apart
- New icons and visual polish

### Fixed

- Small display fixes

## [1.4.2] - 2026-05-02

### Improved

- The FAQ explains what seating plans can and cannot do
- "Delete all data" moved to the footer
- Stability and quality improvements

## [1.4.1] - 2026-03-29

### Improved

- Stability and security improvements

## [1.4.0] - 2026-01-23

### Added

- A new server in Germany (Hetzner)
- Where the board stands at the side of the room, that side counts as the front

### Improved

- An improved algorithm, adjusted table sizes and security updates

## [1.3.0] - 2026-01-04

### Added

- Klassenplan is now available in English too
- A reworked step-by-step flow guides you through the app
- New attributes: language level and social role
- Klassenplan can be installed as an app and announces updates

### Improved

- A simpler start page and a more logical order of the criteria
- Only the criteria you use are shown
- Better auto-save, security updates and better error handling

### Fixed

- Duplicate class names are caught, and the trackpad zoom no longer gets stuck

## [1.2.1] - 2025-12-31

### Improved

- Security and stability improvements

### Fixed

- Backups with tables of six can be imported again

## [1.2.0] - 2025-12-13

### Added

- Any number of classes, each with its own seating plans
- Up to three preferred and avoided partners per student
- Klassenplan works offline once it has loaded

### Improved

- Colour-coded statistics right in the seating plan, and a compact class list
- Many small improvements to usability and stability

## [1.1.3] - 2025-11-08

### Improved

- Long names fit the seating circle better
- Window and door proximity are taken into account better
- Rooms load and save faster
- Usability and stability improvements, and groundwork for offline use

## [1.1.2] - 2025-10-31

### Added

- Windows, doors and the teacher's desk can be placed and moved in the room
- Wishes for a seat near the window or the door are respected when mixing

### Improved

- Usability improvements

### Fixed

- Statistics and printing in Safari improved

## [1.1.1] - 2025-10-25

### Added

- Creating a class lets you enter the names quickly one after another

### Improved

- Gender is optional
- The seating plan and the circle can be turned independently in the export

### Known Issues

- The statistics in step 3 sometimes show wrong values
- Safari: faulty print preview and an extra blank page

## [1.1.0] - 2025-10-22

### Added

- A new design with consistent controls
- A new attribute: height

### Improved

- Storage and backup open in a window of their own
- Templates can be overwritten when saving
- The lock and the markers sit right under the names, and names of up to 12 characters fit the seat
- Exports default to portrait

### Known Issues

- The statistics in step 3 sometimes show wrong values
- Safari: faulty print preview and an extra blank page

## [1.0.3] - 2025-10-16

### Added

- "Create class" right in the class list
- A new attribute: distance requests
- "Set up classroom" sets the room up quickly and manages the templates

### Improved

- The CSV import also takes lists from other programs
- Better keyboard use, accessibility and speed

### Fixed

- The "Repetition" criterion works again

## [1.0.2] - 2025-10-05

### Added

- The class list has a compact and a detailed view
- The toolbar can be collapsed and expanded
- An FAQ with answers to common questions

### Improved

- Usability improvements

### Fixed

- Bug fixes and more stability

## [1.0.1] - 2025-09-28

### Added

- A new seating circle mode
- A better PDF preview in portrait and landscape

### Improved

- Usability improvements

### Fixed

- Bug fixes and more stability

## [1.0.0] - 2025-08-30

Initial release

### Added

- An intelligent seating plan algorithm
- A classroom editor with drag and drop
- Backup and restore
- Dark mode
- PDF export for seating plans
