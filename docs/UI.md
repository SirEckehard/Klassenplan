# The Interface

> **Status:** current · **Last reviewed:** 2026-11-14 · **Source of truth:**
> `src/components/shell/`, `src/components/SeatingPlanGenerator/`,
> `src/contexts/InspectorContext.tsx`

How the app's interface is put together and the rules each part keeps: the
workspace shell with its header, toolbar, stage, inspector and status bar, the
three layers, the export page, "Bibliothek", the projection and the class tools.
The visual language — colour, type, spacing, motion — is
[DESIGNSYSTEM.md](DESIGNSYSTEM.md); the reasons behind the larger choices are in
[decisions/](decisions/README.md).

Read this before changing anything under `src/components` or `src/pages`, and
bring it up to date in the same change when the interface behaves differently
afterwards.

## The workspace shell

- The workspace shell lives in `src/components/shell/`: `AppShell` frames every
  layer, `SeatingPlanHeader` carries the class (`HeaderClassMenu`),
  `LayerSwitcher`, Help and the settings menu (`AppSettingsMenu`),
  `AppStatusBar` holds the toolbar's switch and the live status line at its left
  end, undo/redo in the middle — one bordered control under the stage, the same
  spot on every layer, with the layer's own action beside it (the plan's
  "Mischen", in the circle the purely random shuffle's "Mischen" with the quiet
  "Angleichen" before it, below `lg` the room's "Hinzufügen"; below `md` hanging
  centred over the bar) — and on the right
  "Zurück" to the previous layer beside the way on: "Weiter" to the next layer,
  on the plan layer the two exits (`PlanExits`); the inspector's switch closes
  the bar, the mirror of the toolbar's (below); `Inspector` is the right-hand
  panel. The way on reads "Weiter" on every layer; its accessible name and
  tooltip say where it leads ("Weiter zum Sitzplan"). Zurück, Weiter,
  Exportieren, Präsentieren and the export page's Drucken show their word on a
  desktop and a whiteboard and their icon alone on a phone and a tablet
  (`statusBarWordClass`: a mouse from `lg`, any pointer from `xl`). A view never
  draws its own "carry on" or "go back" button, and nothing floats over the
  stage — corner controls belong to the status bar, the toolbar or the
  inspector; what must stand over the stage hangs from the bar
  (`StatusBarPortal` slot `float`, the class list's jump to its ends) and moves
  with it. Offline, a quiet cloud beside the toolbar's switch says so, in place
  of the floating badge the pages without a bar keep (`OfflineIndicator`,
  `hooks/ui/statusBarPresence`). While writes to storage fail, "Nicht
  gespeichert" stands in the same place, a button in the alert's ink that tries
  again at once (`hooks/persistence/persistStatus`). A new version waiting
  stands there too, a quiet "Neue Version" that takes it on (`useUpdateReady`),
  and what was kept without the screen showing it — a plan saved while its
  inspector is out of sight, a backup written, writes that work again — the line
  says for three seconds in place of the layer's status (`confirmInStatusBar`);
  both were toasts over the inspector's head (decision 0037). The status line
  states numbers on the class and the room layer, in the fulfilment's look: an
  icon of what it counts first (the class's three people, the room's chair), the
  figures in the page's ink and semibold, the words muted (`StatusFigures`); the
  verdict on them is a bare tick or cross in bold (`--status-ok`,
  `--status-alert`) — the tick the plan's inspector puts before "Heute
  gespeichert", which the line's confirmations wear too (`StatusCheckIcon`),
  never a filled disc — with its words ("Alle Namen gesetzt", "Passt genau") for
  the tooltip and the screen reader, never a segment of its own; a layer with
  nothing on it yet shows no verdict. The plan layer states no count — the plan
  shows whether it is there — but the table plan states its fulfilment
  ("Erfüllung 55 %" after the chart icon of the values per criterion, the word
  only where `statusBarWordClass` shows words, the icon everywhere, so "55 %"
  alone never reads as a zoom), portalled in by the view that mixes
  (`StatusBarPortal` slot `status`); it is the one place that states it, the
  inspector does not repeat it; pressing it switches the values per criterion on
  and off — from `lg` up beside each criterion in the inspector's column, which
  turning them on unfolds; below `lg`, where the inspector is a sheet or a
  drawer over the stage, as a band of chips under the plan as well
  (`FulfillmentBand`), the weakest criterion first and a fulfilled one last,
  taking its height out of the stage as the notices above the plan do, so the
  plan stays in view. A tap on a chip marks the criterion's seats, a second tap
  takes the marking off; no drawer opens, since it would cover the seats. On
  every screen a marking a criterion keeps is named in the status bar, in the
  fulfilment's place, for as long as it stands (`HighlightStatus`): the
  criterion's icon, the seats short of it and a cross, one button that takes the
  marking off — a desktop and a whiteboard name the criterion ("Unruhe · 2
  offene Plätze"), a phone and a tablet say "2 offen", since the pressed chip
  names it there, and where a phone's bar is narrower still the word gives way
  and the figure stays. Nothing appears above the plan for it: a notice there
  moved the plan at every chip pressed. The circle states nothing.
- **From `lg` up the shell is the window, not a document.** `AppShell` takes
  `h-dvh`, the two bars stand still and the three columns between them —
  toolbar, stage, inspector — scroll on their own, edge to edge with no centred
  column: the toolbar and the inspector _are_ the margins. A layer takes its
  geometry from `workspaceLayerClass` and `workspaceStageClass`
  (`shell/shellTokens.ts`) rather than spelling it out, so the four views
  (class, room, plan, circle) cannot disagree about it. Below `lg` the layer
  stays a scrolling page between the sticky header and status bar. A tablet
  keeps the toolbar beside the stage as a column that sticks under the header
  while the page scrolls and ends above the status bar
  (`SHELL_STATUS_BAR_HEIGHT`) — stacked above the stage, it pushed an iPad's
  room out of sight. From `lg` up the inspector's column folds away on every
  layer — the class, the room, the plan, the circle and the export sheet — from
  the switch at the right end of the status bar, a quiet arrow that mirrors the
  toolbar's at the left end, so the stage takes the width; the choice is
  remembered per device (`InspectorContext.folded`, `spg.inspectorFolded`), a
  touch screen narrower than `xl` (an iPad in landscape) starts folded, and an
  empty room, Ctrl/⌘+E and the class layer's ticked students
  (`InspectorPortal reveal`) unfold it. **A click in a list shows the inspector,
  a click on the stage only selects:** an opened student and an entry of
  "Bibliothek" that opens nothing further — or a command of its menu that works
  in the panel — unfold the column for as long as they are open (`showColumn`),
  a second click on them folds it back (`foldRevealedColumn`), and the stored
  choice stays the teacher's own, so leaving the page or a reload restores it; a
  folder of "Bibliothek" leaves the column as it is, since its contents are the
  next column, and a table on the room's stage does too, since the click may be
  the start of a drag and a column unfolding would rescale the room under the
  pointer. Below `lg` the inspector has no column: a phone shows an opened
  student as a sheet from the bottom, a tablet as a drawer on the right, and
  what a layer portals in (the room's properties, the plan's criteria, the
  circle's summary, the export sheet's settings) opens as the same drawer from
  the same switch at the right end of the status bar (`StatusBarFrame`) — on a
  phone a button of its own, the mirror of the wrench. A tap beside a drawer or
  the phone's sheet closes it, as a tap beside a menu does (`useOutsideTap`: on
  the lift, so a scroll or a drag leaves it open and the tapped row still opens;
  the switch, what is portalled out of `#root` and an overlay above keep their
  taps), and a swipe on one scrolls what in it can scroll, never the page under
  it (`useContainedTouchScroll`: where nothing in the drawer can take the move —
  its header, its foot, the end of its body — the move is cancelled;
  `overscroll-behavior` alone holds only on a container that overflows). The
  drawers end where the status bar begins: `AppShell` measures the bar and sets
  `--shell-bottom-inset` from its height, which grows with the browser's text
  size (`SHELL_STATUS_BAR_HEIGHT`, 53px, until it is measured). The bar is
  equally high on every layer and page, since every control in it is 36px high;
  on a touch screen each is 44px to hit all the same (`touchHitAreaClass`,
  without a border `touchHitAreaBorderlessClass`, which reach into the 8px
  around it rather than grow the bar; `e2e/page-header.spec.ts` holds this).
  Undo and redo share an edge, so only their outer sides reach, and a breadcrumb
  of "Bibliothek" grows in height alone. Without a class the inspector is
  suspended. The stage does not repeat what the drawer holds — no row of
  criteria under the plan (only their values, see above), no setup button above
  the room — and below `md` a layer's action ("Mischen", "Angleichen") leaves
  the middle of the bar and hangs centred over it with its word (the `action`
  slot, `AppStatusBar`), the stage keeping clear of it
  (`workspaceFitStageClass`), so the toolbar's switch stays in reach. An iPad in
  portrait is a tablet; nothing that edits may be desktop-only.
- **Every page wears one head** (`shell/AppHeader`, decision 0039): 56px and a
  hairline across the window, sticking to the top — the mark on the left, what
  the page is about beside it (`HeaderTitle`, a title with the class under it;
  in the shell the class menu), the layer switcher in the middle of the shell,
  and on the right three places that hang from the window's edge: "Zurück",
  Help, the settings gear. Nothing on the left can move them, and a page without
  help has its way back right beside the gear. A page with a bar of its own at
  the bottom keeps its way back there, never twice: the layers, the export page
  and "Bibliothek" in the status bar, the projection as "Beenden" in its bar. So
  "Zurück" stands in the head on the class tools and the pages beside the app; a
  phone shows its arrow alone, and on a touch screen the head's buttons, 36px to
  see, are 44px to hit (`touchHitAreaClass`). `e2e/page-header.spec.ts` holds
  this on every device, and that no page scrolls sideways.
- **The workspace has no page footer.** `App.tsx` leaves it off `/generator` for
  the same reason as the fullscreen routes, and `AppSettingsMenu` — the gear
  beside Help at the right of the header, the same place on every layer, on the
  export page and on the first screen — carries what a teacher reaches for from
  inside a plan and no layer owns: theme and language — the theme the system's
  until the switch chooses one, and again from "Design wie das System"
  (`utils/ui/themePreference.ts`) —, the update check, installing the app and
  wiping all data (`AppSettingsItems`; the start page and the pages beside the
  app carry the very same gear, see below), then the FAQ, feedback, the
  changelog with the running version beside it and the GitHub repository, and
  last the two legal pages — every row in view, the menu scrolling only in a
  window too short for them. The backup and "Bibliothek" are not repeated there
  — the foot of every toolbar carries them (below). The FAQ is reached from the
  gear and from Help: the help (`HelpButton`) leads to it, opened at the section
  that answers the screen it was asked on (`faqSection`). The support page
  closes every toolbar (below). Both pages show "Zurück" when the app opened
  them, and so do the pages opened from the gear, the changelog opened from the
  update notice and every page opened from the start page, the footer or another
  page beside the app (`APP_RETURN_STATE`, `useReturnToApp`, back through the
  history); a visitor from a search engine sees no such link.
- **The class is the document.** Which class is open is stated in the header on
  every layer — below `md` (a phone, an iPad mini in portrait) as a mark with
  the name in its label, since the name would push the layer switch off a 402px
  header and under it at 744px — and everything a class itself can undergo —
  create, rename, delete — lives in that menu's dropdown: a new class is named
  in a row at its top before it is made, as a new room is, and Enter makes and
  opens it; a rename takes the class's own row. No dialog asks for a class: the
  first screen's card names the first one in a field of its own, and
  "Bibliothek" adds one under a free name ("Neue Klasse", "Neue Klasse (2)" …)
  without opening it, its name in the inspector's header open and ready to be
  typed over, as a new room's is. While no student is open, the class layer's
  inspector is the class itself, as the room's is the room while nothing is
  selected: the name renamed in the header, school year and notes changed field
  by field, what the class holds, and its removal pinned below
  (`ClassInspector`, the very `ClassPanel` "Bibliothek" shows for a class, the
  two fields in `ClassMetadataFields`). They change nothing else about a class,
  so `updateClassMetadata` writes them without a reload — which would drop the
  undo history — and without a message (`applyClassMetadata`). A row there
  says when the class's markers were last said to hold, with "Jetzt geprüft";
  on the plan layer a card above the plan (`MarkerReviewReminder`, beside the
  backup reminder) asks once they stood still for twelve weeks, with "Zur
  Klassenliste", "Passt noch" and "Später"
  ([decision 0044](decisions/0044-markers-carry-a-date.md)).
  `ClassDialogsProvider` holds what those places share — making a class with its
  busy state (`create`, which resolves with the new class's id), and the
  question before deleting one, the one dialog left.
- **One toolbar shape for every layer** (`ToolRail`), in two parts and in both
  densities of `SmartSidebar` — 208px with labels, 60px as icons, the groups
  told apart by a hairline rather than a gap. On top the layer's own groups,
  always in this order: Ansicht (which view is on the stage — list, focus mode,
  relations; table plan, circle), Hinzufügen (the class layer's students and
  placeholders, the room's tables and elements, "Bibliothek"'s classes, rooms,
  room templates and presets), Ansichtseinstellungen (what the view shows),
  Verwalten (on the class layer the class list's import and export side by side,
  "Liste drucken" and "Namensschilder drucken"). The toolbar holds what goes onto the stage and how it
  looks; naming, saving, opening and removing the thing a layer shows is its
  inspector's — the plan layer has no Verwalten. A layer leaves out a group it
  has nothing for but never reorders one. `ClassToolPanel`, `RoomToolPanel`,
  `PlanToolPanel` and `ExportToolPanel` fill that part; an entry that needs a
  value (a name, a number of placeholders, a set of switches) opens a panel
  instead of taking a permanent place. At the foot `ToolRailFoot` — drawn by
  `ToolRail` itself, so no panel lists it and none can forget or reorder it —
  carries what every layer needs, identical on every layer and on the export
  page: "Bibliothek" (a link to `/bibliothek`, marked as the current page there;
  the gear of the pages beside the app leads there too), "Klassenwerkzeuge" (one
  menu for the four class-tool routes below), "Backup" (export/import) and
  "Unterstützen". On a narrow phone (below `sm`) the plan layer's foot starts
  with "Präsentieren", which its status bar has no room for beside "Exportieren"
  (`planPresent`); an iPad mini in portrait has room for both in the bar. The
  first screen — no class yet — wears the same toolbar, with what needs a class
  greyed out, and the card that asks for one centred on the stage. The foot
  stays in view while the layer's part scrolls. A new tool joins one of the
  layer's groups, or the foot when every layer needs it — never a new floating
  button. On a phone the rail is a drawer from the left on every layer — the
  mirror of the inspector's, between the header and the status bar, not modal
  and without a head of its own, closed by Escape, by its switch, by a tap
  beside it or by an action taken in it — opened by the wrench at the left end
  of the status bar, where a tablet has the rail's switch (`StatusBarFrame`); no
  floating button, and the two drawers take turns. The panels its entries open
  are portalled above it (a full-screen sheet lay over them and hid them).
  Below `lg` the room's toolbar, drawer and column alike, leaves out the tables
  and room elements, which come out of the tray at the status bar there
  (`RoomAddTray`, see "The room"). An entry that switches a view passes `active`
  and announces a pressed state; an action does not.
- **The toolbar has no header of its own.** Which density it shows is a property
  of the workspace, so the switch sits in the status bar and the state lives in
  `ToolRailContext` (Ctrl/⌘+B still works). A sidebar outside the shell finds no
  provider, keeps its own state and its own switch, and names its column widths
  through `widths`.

## The export page and "Bibliothek"

- **The export page wears the shell too.** `/export` renders `AppShell` with the
  header's export variant (`SeatingPlanHeader view="export"`: no layer is
  current, each one leads back into the workspace, no plan name and no tour) and
  its own status bar (`ExportStatusBar` on `StatusBarFrame`, the frame every
  status bar shares). The toolbar (`ExportToolPanel`) switches the view — table
  plan, circle, the note list, the substitute's sheet and the name cards — and
  saves the files —
  one PDF entry for whatever is on the sheet, PNG and SVG — above the foot every
  rail shares; the sheet is paper on the stage with nothing on top of it; what
  it carries is set in `ExportSheetInspector`, from the sheet as a whole to its
  details (the sheet's title renamed in the header, under it the plan's state
  and room as on the plan layer, Seitenformat, Kopfzeile with the class info,
  the list's own form, Namen, Auf dem Blatt with the legend last — greyed out
  while the sheet carries neither badges nor the gender tint, which is all it
  explains —, Raumelemente), through `InspectorPortal` — the column from `lg`
  up, below it the drawer from the status bar, as on a layer. The sheet takes
  the page: margins of 10 mm and a one-line header in both orientations
  (`ExportPageFrame`, shared by `SceneSvg` and `CirclePrintView`), the table
  plan framed on its tables as the projection is — "Anzeige vergrößern"
  (`spg.export.frameOnTables`), switched off, goes back to the whole room in its
  outline; framed, the wall elements keep
  their gap from the photos too wherever that leaves the plan as large
  (`featuresForTableFrame`'s `clearance`), and the frame never reaches past the
  whole room's, so a room furnished to its walls is not drawn smaller — and the
  circle fitted to the area with places as large as their spacing allows
  (`utils/ui/circlePrintLayout`). The note list ("Liste", `NoteListSheet`,
  `utils/ui/noteList`) is the class with room to write beside every name — ruled
  lines or a grid of empty columns — by table as in the plan (rows away from the
  board, `tableRowsFromFront`), round the circle or by name, and runs to as many
  pages as it needs (`renderNoteListSvgPages`, one PDF page each), so it is a
  PDF only. It needs students, not a plan: "Liste drucken" under the class
  layer's Verwalten opens the page on it
  (`state: { mode: 'list', returnStep: 1 }`), the table plan and the circle
  greyed out until there is a plan, the list by name until someone is seated,
  and "Zurück" leading to the class; its settings live in one object
  (`spg.export.noteList`), badges and photos off until asked for, and nothing
  written on it comes back into the app — there is no note field on a student.
  The substitute's sheet ("Vertretung", decision 0034) is the table plan or the
  circle — a choice in its inspector — with names and nothing a seat would say:
  `substituteRenderOptions` (`utils/ui/substituteSheet`) sets badges, the gender
  tint, the legend and the circle's lines off whatever is stored, so the
  inspector offers no switch for them. Its header names the class always, the
  room and the day of the cover (in place of the printing date), the school year
  and notes only when asked for (`substituteHeaderLines`); a band at the foot
  (`SheetNotesBand`, laid out by `layoutSheetNotes`, its height kept free by
  `getExportPageLayout`'s `notesHeight`) holds the note typed for the sheet and
  ruled lines to write on. Its settings live in one object
  (`spg.export.substitute`, full names by default, photos off), apart from the
  teacher's own sheet; the note, the day and the title last as long as the page
  and are never stored. It needs a plan and is reached from the export page
  alone. The name cards ("Namensschilder", decision 0047, `TableCardsSheet`,
  `utils/ui/tableCards`) are a card for every child — tent cards two to a page
  or one across, or eight badges — with the first name on writing lines, a
  motif, a tint of paper and the class at the foot, run to as many pages as
  they need and are a PDF only. Their inspector (`TableCardsInspector`) is
  their own: format, font (each name in its face, a font of the teacher's own
  loaded from a file in the row below), look (motifs or a picture of the
  teacher's, paper, border, writing lines, colouring in), what they say and
  their order; a file that will not do says so under its row. They need
  students, not a plan: "Namensschilder drucken" on the class layer opens the
  page on them as "Liste drucken" does on the list, by name until someone is
  seated. Their settings live in one object (`spg.export.cards`,
  `useTableCardSheet`), the font is measured before the names are laid out,
  and the preview, the print and the PDF carry it once rather than on every
  page. Printing is the one blue button, with "Zurück" to the plan beside it as
  on every layer; the bar's line stays empty unless the sheet cannot speak for
  itself — "Noch kein Sitzplan gemischt", or the circle being built with the way
  to stop it — since "A4 · Hochformat · 24 Schüler" only repeated the paper on
  the stage, its inspector's first row and the class. It has no page footer
  either.
- **"Bibliothek" is a page of the shell** (`/bibliothek`,
  `src/pages/PlanLibrary.tsx`, decision 0024). It shows the classes, a class's
  rooms with its recent mixes and neighbourhoods, a room's plans and the room
  templates and the mixing presets as folders in columns (`ColumnBrowser`, built
  by `buildLibraryColumns`): each column a labelled listbox whose selection
  follows the focus — ↑/↓, → into a folder, ← out of it, Enter opens, F2
  renames, Delete removes, Tab from column to column, no type-to-find; a
  right-click, a long press, Shift+F10 or the menu key opens the entry's menu
  after choosing it. Below `lg` only the last columns that fit side by side
  stand, each at least 16rem wide and sharing the card's width (`fit`) — one on
  a phone, two on an iPad in portrait — rather than a row that scrolls sideways
  under the finger; while columns are left out, a head above them leads up to
  them, as a phone's file manager does (`LibraryPathHead`): on the left the
  folder one step up, named ("‹ 7b"), which cuts the path back by one step, as ←
  from the first column on screen does, and on the right where the last column
  stands, which opens the whole path as a menu. It opens on the plan that is
  open, in its room, in its class. The neighbourhoods are a folder too: the
  class's students, and a student's neighbours in the next column, most often
  first, with their photos where there are — a pair of two full names does not
  fit a column, one name does. What is selected is read and changed in the
  inspector (`components/library/inspectors/`: class, room, plan, mix,
  neighbourhoods and a pair of them, template, preset — its criteria as the
  plan's inspector shows them, every one of them and each change kept at once
  ("Standard" read only), an own one renamed and deleted, a changed shipped one
  restored —, folder), a class's name, school year and notes in its panel as in
  the class layer's inspector, F2 opening the name in the header of a class, a
  room, a plan, a template or an own preset — only that entry's: the request
  names the entry it was made for, and choosing another lets it go; the status
  bar (`LibraryStatusBar`) holds the path from `lg` up — every step a way up;
  below it the head above the columns stands in for it, since a phone's bar left
  the path two cut-off words — undo and redo in the middle, "Zurück" through the
  history, and the one blue button that opens the selection in the workspace: a
  plan on the plan layer, a room on the room layer, a class on the class layer,
  a mix where it still fits its room's tables, a template as a new room of the
  open class, a preset ("Übernehmen") as the open class's criteria, on the plan
  layer and without mixing. Another class is browsed without being opened and
  changed in storage (`useClassLibrary`, `editInactiveClass`); opening something
  of it opens the class first. The header wears its outside variant
  (`view="library"`), the toolbar adds a class, a room, a room template or a
  preset (`LibraryToolPanel`), each under a free name that the inspector offers
  to type over: the template empty — its tables are arranged in a room opened
  from it and brought back with "Vorlage „…“ ersetzen", which its panel says
  while it has none —, the preset from the weights of "Standard".
  "Raumvorlage aus Datei …" and "Voreinstellung aus Datei …", each after its
  "Neue …", open the restore's file dialog, whose file's content decides what
  comes: a room
  template's or a preset's file (decision 0046) is added after a question that
  names what it brings, chosen in the columns and taken back by undo, and a
  backup is restored as from the toolbar's foot. A template with tables, an own
  preset and a changed shipped one are saved as such a file from their panel
  ("Als Datei speichern"), which the status bar's line confirms. The page reads
  the inspector and `ClassDialogsProvider` itself, so it renders inside
  `ShellProviders` (`shell/AppShell.tsx`), whose `AppShell` then nests no second
  set — above them its hooks got the inert fallbacks.
- **The two exits, once.** Exporting and presenting save the plan first when it
  differs from the saved one; `usePlanExits` is the single implementation, used
  by `PlanExits` at the right end of the plan layer's status bar, beside
  "Zurück" — "Präsentieren", then "Exportieren" at the outer end; a narrow
  phone's bar (below `sm`) keeps "Exportieren", the one a teacher reaches for
  more often, in that same place and finds "Präsentieren" at the foot of its
  toolbar — by that foot and by Ctrl/⌘+E. Both leave with the arrangement on the
  stage: from the circle, the export sheet and the projection open on the
  circle. The plan layer is the last one, so its way on leads out of the
  workspace: the exits take the place the other layers give "Weiter", and the
  header carries neither. Both are the same quiet button: blue is the layer's
  own action — "Weiter" at the end of the other layers' bars, "Mischen" in the
  middle of the plan layer's — and a screen has one blue button.

## The class list

- **Editing a thing happens in the inspector, not in the list.**
  `InspectorContext` holds what is selected (students; the room, the plan and
  the circle portal their own panels, see below) and whether the drawer is open
  below `lg`, and `StudentInspector` groups the controls under the pedagogical
  family they belong to. Adding an attribute means adding it to one group there
  — never a new column. Several ticked students are edited there too:
  `StudentBulkInspector` takes the panel — the column from `lg` up, on a tablet
  the drawer, which the ticks open and take along when they are let go
  (`InspectorPortal reveal`) and which a tap in the list leaves open, on a phone
  the sheet an opened student gets (`InspectorPortal sheet`) — with the same
  controls, fed the selection read as one student (a value all share, a flag all
  carry, the rest `mixed`), so an attribute added to `StudentInspector` belongs
  in it as well unless it is per person (name, photo, partners). That starts at
  two: a single ticked student gets the panel an opened one gets
  (`StudentInspectorPanel`), because the bulk panel would only take the name,
  the photo and the partners away — its arrows carry the tick along, its
  checkbox or Escape lets the selection go. The panel's close button is the
  phone's sheet's and the tablet's drawer's alone (`lg:hidden`): from `lg` up
  the column folds from the status bar instead, and putting the student away
  would only leave its empty notice. A phone's sheet comes from the status bar's
  switch alone, which carries how many are ticked (`badge`) — a sheet that came
  with every tick would cover the list being ticked; Escape or a tap beside it
  closes it and keeps the ticks, and while students are ticked an ✕ in the
  status bar takes the place of the class's count (`StatusBarPortal` slot
  `status`, `peer-not-empty:hidden`) and lets them go, as the sheet's own ✕
  does. Students being edited below `lg` — opened or ticked, in the phone's
  sheet or the tablet's drawer — also go away with a finger pulling the panel's
  head over the edge it came from, down from the sheet, to the right from the
  drawer (`useSwipeToClose`, `data-inspector-head`), and otherwise go back to
  their place; a text field in the head keeps the finger while it has the focus.
  The row above the list stays search, filter and sort in every state.
- **A list row is one button.** The class list is a single card of rows divided
  by a hairline: number, avatar (`StudentAvatar`, to look at, not to press),
  name and the chips for what is set. The card is a size container
  (`@container`): where the list is wide enough (`@2xl`) the chips stand beside
  the name in rows at least 60px tall, where it is not they go under it — the
  width is the list's, not the window's, since the toolbar and the inspector
  take their share, and a row of fixed height spilled wrapped chips over the
  rows below. Where they go under it, the checkbox stands on the name's line and
  the chips start under the name, and the list's head says "Alle auswählen"
  instead of naming columns the rows do not have (`StudentListHeader`). On a
  phone the row above the list is the search and one button for the filter and
  the sort (`StudentListViewMenu`, a dot on it while a filter hides students),
  and what a search or a filter left ("3 von 24", with its ✕) stands in the
  list's head; from `md` up the two are fields beside the search, which say what
  is chosen without a tap. Pressing the row opens it in the inspector, pressing
  it again puts it away (`toggleStudent`; the column it unfolded folds back, a
  tablet's drawer closes) — the inspector is also where the name, the photo and
  the one destructive action live. The checkbox for bulk edits stays outside
  that button, because a checkbox inside a button is not a checkbox. While
  students are ticked the row ticks instead of opening (`selectionActive`),
  since the inspector then shows the selection. ↑/↓ (Home/End to the ends) step
  from row to row — from a checkbox to the next checkbox — and the student
  follows the focus into the inspector, as in "Bibliothek", except while
  students are ticked and on a phone, whose sheet would take the focus; the
  focus stays in the list (`selectStudent(id, { keepFocus: true })`), so an
  unnamed student's name field opens without taking it. Alt/⌥+↑/↓ step from
  inside the inspector (`StudentInspectorPanel`), leaving a text field alone but
  for the name field, which saves a changed name first. The inspector steps and
  counts in the list's order — searched, filtered, sorted — which the class
  layer publishes as `studentOrder` on `InspectorContext`. A search that clearly
  means one student opens it as the teacher types, the focus staying in the
  field — the only one found, else the only one whose name, a word of it, or
  (from two letters) a word's start the search is (`findSearchMatch` in
  `useStudentListView`, only on typing, so a rename in the inspector never moves
  it on); not while students are ticked and not on a phone, where Enter does it
  — Enter opens that student or the first one found. Opened and ticked look
  different: the selection fill (`--surface-option-selected`) belongs to ticked
  rows alone, the opened row sits on paper with a blue bar at its left edge —
  otherwise it reads as a tick beside an empty checkbox.
- **Naming a class is typing and Enter.** A student without a name opens with
  the name field already active, and Enter saves and steps to the next one
  (`StudentNameEditor`'s `onSubmit`). What is still unnamed is stated in the
  status bar, not per row. Creating placeholders ends the same way: as many as
  the class has room for (`MAX_STUDENTS`), and the first of them opened in the
  inspector, whose name field says that Enter steps on while a student has no
  name; no card says how many — the list shows them — only one that says fewer
  came than were asked for. A name, a count or a new student that cannot be is
  refused under its field, the student's name in the inspector as the toolbar's
  panels do.
- **A plan is named where it is saved — in its inspector.** The plan layer's
  inspector is the plan itself, as the room's is the room: headed by the plan's
  name with whether the stage is what was saved under it — a check with "Heute
  gespeichert", "Gestern gespeichert" or "Gespeichert am …", a dot with
  "Geändert, nicht gespeichert", a ring with "Noch nicht gespeichert"; never
  "Nicht gespeichert" alone, the status bar's word for a failed write
  (`PlanInspectorHeader`, `usePlanSaveState`), the name renamed there as every
  inspector's is, and giving it — Enter, the tick, leaving the field — saves the
  plan under it: a plan never saved is kept as its first save, a saved plan the
  stage has changed is written anew under the new name (`handleSaveSeatingPlan`
  with `rename`), and a saved plan the stage still shows as saved is only
  renamed, as in "Bibliothek" (`renameSeatingPlan`), so its date stays and
  renaming does not count it as used; an emptied name of a plan never saved
  waits for its first save, which dates it (`setPlanName`) — then the section
  "Plan" (`PlanSection`, in `views/PlanInspectorParts.tsx`, the circle's
  inspector leads with it too): "Plan speichern", into the open plan or as the
  first one, and once a plan is open "Als neuen Plan speichern", which leaves
  the open plan as it was and keeps the stage beside it under a free name
  ("Deutsch (2)") for the header to rename; both share `usePlanSave`. "Plan
  öffnen …" opens another saved plan of the class — the open room's first, each
  named with its room once the class has more than one, a plan of another room
  opening that room (`handleHistoryLoad`, as "Bibliothek" does); renaming and
  removing another plan stay in "Bibliothek". A name another plan carries is
  refused under the name, not by a toast. Ctrl/⌘+S saves straight away under the
  name the plan has, from the open name field under the typed one. The header
  carries no plan name. "The open plan" is the one `activePlanId` names — the id
  a save writes to — never the one that happens to share the name
  (`useOpenPlan`, used by the section and the exits). Setting the room up anew
  ("Neu einrichten") lets go of it, name and all (`releaseOpenPlan` through
  `useRoomSetup`'s `onRoomReplaced`): no save, the one before export and present
  included, may write the new tables over the old plan, and the locks go with
  it, since their seat numbers name seats of tables that are gone
  (`releaseLocks`); the room's undo of the setup brings both back
  (`restoreOpenPlan`, `restoreLocks`, the snapshot's `released`), its redo lets
  them go once more. The plan goes into the open room; the inspector's heading
  names that room beside a house once the class has more than one. Whether there
  is a plan is `hasPlanForScene` — a student in a seat, and a row of seats for
  every table as it stands — for the exits, the save and the auto-save on
  leaving the layer, and the export page's "Noch kein Sitzplan gemischt" asks
  the shape too. An arrangement made for other tables (the room set up anew
  under it) is stale: the plan layer mixes it over on its own
  (`useSeatingPlanViewLogic`, which tries again when an unmount — StrictMode's
  double mount included — aborted the run, since `handleMix` reports `aborted`),
  draws empty seats and scores nothing meanwhile, and where it cannot mix on its
  own says so with "Jetzt neu mischen". The first entry's mix stays the wizard's
  (`triggerAutoMix`), which sets `autoMixing` with the step so the view stands
  aside.
- **Three ways into the same student data.** The roster answers "who is in this
  class"; `AttributeFocusMode` asks one question of everybody at once ("Wer
  zeigt aktuell Unruhe?") and is how the eight yes/no flags get filled in;
  `RelationsView` answers who wants to sit next to whom across the class — a
  card per pair with both faces, the pairs both sides named marked and first —
  and shows who has named nobody yet. A new yes/no flag belongs in the focus
  mode's `PASSES` list as well as in the inspector; attributes with more than
  two values stay inspector-only. A view that wants the full width sets
  `suspended` on `InspectorContext`.

## Seats and the plan

- **Behind the students the room is the backdrop** — on the plan layer, in the
  projection, "Wo sitzt wer?", "Wer kommt dran?" and on the export sheet
  (`getBackdropFeatureStyles`).
  The room layer draws its elements in their palette, with a hairline as
  everywhere, and its grid where it is switched on; behind the students the
  board, the windows and the door keep their hue, since criteria refer to them
  (muted in the dark, one gray with the projection's colours off), the
  furniture — teacher's desk, whiteboard, cabinet, divider — is a bare
  outline, every element has a smaller icon, and neither the table plan nor
  the circle shows the grid, which only helps to align. The projection's
  contrast mode, made for a weak beamer, alone draws the contour twice as
  thick (`inkContour`); the export sheet draws the room so
  too, always light and with the furniture's outline a step darker for print.
- **A seat's badges explain themselves** (decision 0021). One renderer draws
  them everywhere (`scene/SeatBadgePill`), in family ink and family order
  (`BADGE_ORDER` in `utils/ui/studentAppearance`); what a view shows and how
  many fit is `utils/ui/seatBadges` (`SeatBadgeView`: a filter, `collapse` for a
  legible "+N" where a tooltip can explain it, a priority for the active
  criteria). `BadgeTooltipLayer` over a host's SVG finds the icon under the
  pointer by its box — the badge layer takes no pointer events, because a drag
  grabs the seat underneath — and reports it, so the plan lights the seats it
  points at. The icons scale with the plan (6 to 8px on an iPad in portrait), so
  a finger's tap takes the nearest icon within 14px, a pen's within 6px, the
  mouse's within 2px (`useBadgeHover`'s `TAP_SLOP`); drawing them larger would
  send more of a small seat's badges behind its "+N". "Merkmale" in the plan's
  and the circle's toolbar chooses all, active criteria only or none
  (`spg.badgeDisplay`) and carries the legend; the export chooses per family. A
  new badge needs an entry in `BADGE_ORDER` and a `family`.
- **A name takes the seat's room, and a plan's names share one size.**
  `utils/ui/seatLabelLayout` fits a name and the badge pill against the seat as
  it stands under the upright name — a turned rectangle, every corner inside it,
  the editor's lock an obstacle on every seat, whether it shows or not, so a
  name never moves when a seat is pointed at or locked (`fitNameOnSeat`,
  `placeSeatBadgePill`): a quarter turn gives a 55 × 65 seat 65 across, a
  slanted seat is widest across its middle, and on a quarter turn a name may
  step aside from the lock beside it. The lock turns with the name, not with
  the table (`seatLockCentre`): whichever way the table and the plan are
  turned, it sits in the seat's upper left on the screen — at the top of a seat
  turned 45°, which stands on a corner and needs its middle for the name. A
  name goes on two lines where that makes it larger —
  between words or after a hyphen, never inside a word — and full names ("Vor-
  und Nachname") always break, so a plan reads alike. `computePlanNameFontSize`
  (table plans) and `planNameFontSize` (the circle) set the size the great
  majority of seats reach — the editor measures it with the lock on every seat,
  so its names come out a little smaller than the export's; a conspicuously
  long name shrinks on its own seat. Every seat and
  place draws its name through `SeatNameText`. The text is measured by
  arithmetic from Atkinson Hyperlegible Next's advance widths in
  `src/data/nameGlyphWidths.json` — regenerate it with
  `npm run generate:glyph-widths` after a font update — so jsdom, the export's
  static markup and the browser agree.
- **One drag for the plan and the circle** (decision 0022). `useDragGesture`
  runs every pointer drag — a press is a drag only after 4 px (8 px for a
  finger), Escape and a cancelled pointer end it; the lock on a seat or a place
  switches on a tap released in place alone (`useTapGesture`), a press on it
  that travels picks the student up — and each view adds its own target lookup
  (`useSeatDrag`: the seat under the pointer; `useCircleDragDrop`: the nearest
  place as drawn). Both draw the target as a ring inside the place (blue, rose
  when held), confirm a drop in green for a moment — one mark for every
  highlight of a place, a tint and a ring clear of its edge and concentric with
  the table's corners (`utils/ui/seatMark`) —, let the plan itself show the swap
  once the drag has rested on a free place for 70 ms (`useDwellKey`): the
  dragged student on the target, the one displaced — or nobody — on the place
  left behind, in full and unmarked (`getSwapPreview`, `previewStudentAt`,
  `TableSeat`'s `previewStudent`), only the drawing, never the seat's
  screen-reader name, its lock or its flight, and a drop the plan already showed
  holds both places still (`holdStill`); show `DragGhost`, a chip with the
  student's name in the seat's tint, above a finger and below and right of a
  mouse pointer's tip; and announce the drop; both have the same keyboard way —
  Enter or Space picks up, the arrow keys choose the place, Enter or Space puts
  down, Escape lets go (`useSeatKeyboardMove`, whose arrows go to the nearest
  seat that way as drawn, `nearestInDirection`; `useCircleKeyboardMove`, round
  the circle). The circle keeps its own locks (`CircleLayout.lockedStudentIds`),
  honoured by swaps, the shuffle and `restoreCircleLocks` after a regeneration.
- **The plan fits the stage.** The classroom is a fixed 900×600 shape, so from
  `lg` up the stage is a size container (`canvas-stage`) and the frame inside it
  takes `min(100%, 100cqh × 3/2)` (`canvas-fit`): capped by whichever dimension
  binds, centred in what is left, never scrolling and never leaving a void.
  Below `lg` the same class gives the frame the stage's full width — without it
  the auto-margined frame shrank to its SVG's 300px default — and the room, the
  table plan and the circle fit what the page leaves between the header and the
  status bar as from `lg` up (`canvasFillClass` on the stage,
  `canvasFitTurnedClass` on a turned frame,
  `workspaceFitLayerClass`/`workspaceFitStageClass`), so the page scrolls only
  below a stage of 20rem, a phone held sideways. Room, plan and circle take
  their width from `canvas-fit` alone, never from a width of their own. Only the
  frame's width changes, which is what a window resize does anyway — every
  pointer coordinate is derived from its measured box. Below `lg` a window held
  upright shows the room and the table plan turned a quarter, the board at the
  bottom (`usePortraitTurn`: `portraitPlanTurn` once `usePortraitViewport` says
  portrait): the 3:2 room took a third of a phone's or a portrait iPad's stage
  and left the rest empty. The stored room never turns. The plan, which writes
  no geometry, draws a turned copy (`turnPlanScene` hands `SeatingPlanCanvas`
  the tables and the room elements in a 600×900 room) while saving, the criteria
  and the highlights keep the stored room; the seats keep their order, and the
  drag, the arrow keys and the badges' tooltips read the seats where they are on
  screen. The room, which writes, turns its drawing as a whole
  (`ClassroomCanvas turn`: one `<g>` with `turnTransform`, names, icons and
  handles turned back upright) and says so on its `<svg>` (`data-turn`), so
  `convertClientPointToScene` and `convertScenePointToClient` turn every pointer
  back — a pointer on the room goes through them, never through arithmetic of
  its own — and `useKeyboardInteraction` turns the arrows (`unturnDirection`,
  `utils/canvas/turn.ts`); the handles measure a change of angle, which a turn
  leaves alone. The circle, which has no board to keep at the bottom, always
  stands upright then (`usePortraitCircleTurn`, 90°): `SimpleCircleView turn`
  draws the turned places in a 600×900 room — the tokens are round and stay
  upright, the order is untouched — and the drag reads the pointer against that
  view box. The three frames are held to what fits between the header and the
  status bar by their stage, which below `md` also keeps clear of the action
  hanging over the bar. Turning the device animates nothing of its own: the system
  already turns the whole screen, and a second turn on the frame was not seen.

## The room

- **The room inspector acts, it does not measure.** A drag places and sizes a
  table, so `SceneInspector` asks for no coordinates: it offers what a drag
  cannot do in one gesture — turning to a typed angle (the field follows the
  handle live) or in the 45° steps of Q/E, duplicating (a paste of the selection
  that leaves the clipboard alone), copying, cutting, pasting, removing — each
  with the canvas's own shortcut in its tooltip, and each for one table as for a
  whole selection. A turn — by the handle of a table or of a room element, by
  Q/E or in the inspector — moves the unlocked tables and the freely placed room
  elements (cabinet, divider, lectern) of the selection alike, each around its
  own centre (`useSelectionRotation`, `utils/canvas/selectionRotation.ts`). The
  arrow keys move what a drag moves — tables, free elements, and a wall element
  along its wall (`moveFeaturesBy`) — and a key held down is one undo step; a
  gesture on a mixed selection (delete, cut, paste, duplicate) is one step too
  (`useUndoStep`). Dragging is not the only way in: a click or Enter on a table
  or room element in "Hinzufügen" puts it on the free spot nearest the middle of
  the room, a wall element on the first free stretch of wall (`findFreeSpot`,
  `findFreeWallSpot`), and selects it. Below `lg` the tables and room elements
  are not in the toolbar — a phone's drawer covered the room a drag goes to, a
  tablet's column showed them as icons without a word — but in a tray that
  "Hinzufügen" raises out of the status bar, the room layer's action where the
  plan has "Mischen", hanging over the bar below `md` (`RoomAddTray`). Each
  piece carries its word, the four tables and the seven elements in two rows on
  a phone, in one from `md` up. A tap adds as an entry of the toolbar does and
  leaves the tray open, so several tables follow one another; a piece dragged
  out sinks the tray into the bar once the finger has left it, so the whole
  room takes the drop, and it rises again when the drag is over. Its switch, a
  tap beside it and Escape put it away, and a drawer takes its place, as the
  two drawers take turns. On a touch screen the toolbar's entries let an
  upright swipe scroll the toolbar only while it is taller than its room
  (`touch-action: pan-y`, else `none`), so a drag onto the stage then has to
  leave sideways; a pointer the browser takes back (`pointercancel`) places
  nothing. A long press is the touch screen's right-click: a finger or pen
  becomes a drag or a selection box only past the drag threshold
  (`DRAG_THRESHOLD_PX`, the machine's `DRAG_THRESHOLD_REACHED`), its menu stays
  open when the finger lifts (`canvasPointerMachine` closes it only on Escape or
  a cancel), lies above, beside or below the finger but never under it
  (`placeTouchMenu`), and survives the click some browsers send at the lift
  (`swallowReleaseClick`). Safari on an iPad does not honour the stage's
  `touch-action: none` on the SVG, so the room, the plan and the editable circle
  also cancel `touchmove` (`useTouchScrollLock`) — or a selection box drawn in
  portrait scrolled the page. The browser's own `contextmenu` for a finger or
  pen is left to the long press (`handleSvgContextMenu`), or it would reopen the
  menu as a mouse menu beside the finger. Seat count and table type stay
  read-only. A table — or every table of a selection — is taken out of the mix
  there ("In der Mischung", `ClassroomTable.inactive`): it stays in the room,
  dashed and faint while empty, and mixing leaves it empty; a student put there
  by hand stays. The room's own panel fills the room from the board backwards
  ("Von vorne besetzen", `ClassroomScene.fillFromFront`), so spare seats end up
  at the back. Both act only through the per-table targets of `seatTargetsFor`
  (decision 0026); whether a class fits its room is `countActiveSeats`, never
  `countSeats`. A table, a room element or a selection is read in one section,
  "Eigenschaften" — the angle first, since every kind shares it, then "In der
  Mischung" or "Sichtbar" — then "Bearbeiten", the removal pinned below; a
  single table or element shows its shape in the header where a student shows a
  photo, and a selection names two facts under its heading — its tables and room
  elements, or its tables and their seats. With nothing selected the panel is
  the room's own, headed by its name and renamed there, as the class is in the
  class layer's inspector; its first section ("Raum") leads to the class's other
  rooms (`RoomListControls`): once the class has another, "Raum öffnen …", a
  menu shaped as the header's class menu (`InspectorMenuButton`) with every
  room, the open one checked, a pencil and a bin beside each — the removal asks
  first, takes the room's plans and mixes along and spares the open room and the
  last one — then "Neuer Raum", a row that names the room before it is made.
  Then "Neu einrichten" places as many tables of one kind as the class needs and
  replaces the tables after an undo snapshot (`useRoomSetup`) — four rows in an
  empty room, a menu ("Tischart wählen …") once tables stand; "Vorlagen" keeps
  this room for other classes — named in a row of the panel, after the room,
  where a name a template already carries is not saved over by Enter but offers
  "Vorlage „…“ ersetzen" as a row of its own — and opens a kept one as a room of
  its own from a menu of the same shape, renamed and removed there too, and
  "Raum aus Datei öffnen …" adds a colleague's template to that menu (decision 0046)
  (`RoomSetupSections`). That is where a room is rebuilt, not a dialog over the
  canvas; Ctrl/⌘+E lets the selection go and leads there, below `lg` the
  inspector's switch in the status bar is the way there — no second button above
  the canvas repeats it — and an empty room opens the drawer by itself.

## Menus, inspectors and help

- **What opens from a toolbar entry is a dropdown menu**: rows of icon and word
  on `menuSurfaceClass`, a check at the end of a row that is on
  (`CanvasSettingsGroups` for the view settings). No cards inside a popover, no
  icon-only chips; only a panel that asks for a value (a name, a number) is a
  small form on the same surface. Every popover that opens from a button — the
  toolbar's panels, the class menu, the gear — goes through `usePopoverFocus`:
  `FloatingDropdown` portals it to the end of the page, so the hook moves the
  focus in when it opens, keeps Tab and the arrow keys inside, and closes it on
  Escape with the focus back on the button. To a screen reader such a popover is
  a `role="dialog"` of buttons and links, not a `menu` or a `listbox`, which may
  hold neither switches nor a row's own rename and delete. A context menu is the
  one exception, since it holds actions alone: `ContextMenu`
  (`components/ui/navigation/`) is a `role="menu"` and the one shape for every
  right-click, long press (`useLongPress` on the page, the canvas's own machine
  in the room), Shift+F10 and menu key — the room's tables, room elements and
  floor, the entries of "Bibliothek" — rows of icon and word, the key that does
  the same at the row's end, the removal last behind a hairline; it holds only
  what the inspector or a key does too, and a row that cannot be chosen stays,
  greyed out, with why under its word.
- **One shape for every inspector** (`shell/InspectorPanel.tsx`): a header strip
  naming what is selected, built the same everywhere — a 44px tile with the
  thing's icon (`InspectorMediaTile`; a table its shape, a student their photo,
  round), the name, and under it one line of at most two facts, each with a 12px
  icon (`InspectorMeta`: "24 Schüler · 2 Räume", "Tisch 2 von 8 · 4 Plätze", the
  plan's "✓ Heute gespeichert · ⌂ Raum", which the export sheet's header shows
  too), whose words line up with the title's; `InspectorHeader` takes no header
  without both, so every header stands at one height — the student's too: its
  arrows up and down the class (Alt/⌥+↑ and ↓) stand at the strip's far end,
  stacked under a mouse and side by side as 44px targets under a finger, both
  within its height. A title that cannot be renamed stands in the box of one
  that can, without its frame. A thing wears one icon wherever it appears — the
  layer switch, "Bibliothek", the header and its line (`shell/entityIcons.ts`; a
  class the layer's address book). The header also renames what it names: a
  student's, a class's, a room's, a plan's, a template's name and the export
  sheet's title are pressed in the header and open there as a field, never
  repeated as a field under it (`InspectorTitleField`, the student's
  `StudentNameEditor`, both in `editableTitleClass`; Enter or leaving keeps the
  name, Escape takes it back, a taken one is refused under it — the rules
  `NameField` shares through `useNameDraft`) — a scrolling body of sections
  divided by hairlines, and — where there is one — the destructive action pinned
  to the bottom. Inside a section every setting is an `InspectorRow`, at least
  28px tall under a mouse and 44px on a touch screen whatever it holds, so the
  rows stand at one pitch; the values in them — `InspectorChoice`'s chips and
  every button that opens a menu (`familyValueControl`: the partners, the social
  role, the language) — share one height and padding — its name on the left, its
  value on the right as a switch or as `InspectorChoice` chips; a student
  attribute with more values than fit in one line (language level, social role)
  keeps the row and opens its values as a menu from a button
  (`InspectorSelect`), whose first row takes the value back — a plan's room in
  "Bibliothek" is the same menu without a family's colour and with "In einen
  neuen Raum verschieben" as its last row (`action`); the export's name rule and
  the note list's order, whose choice is the content, stand under the name as a
  list (`stacked`, `layout="list"`). The header's media, an action row and the
  destructive footer are `InspectorMediaTile`, `InspectorActionRow` and
  `InspectorDeleteFooter`, the same in every inspector. An attribute with a seat
  badge shows that badge's icon in its family's ink (`InspectorIcon`,
  `STUDENT_ATTRIBUTE_ICONS`), and an attribute's name starts with a capital in
  both languages. A row that holds one switch takes `labelsControl`: the row
  becomes its `<label>`, so the name operates the switch too and on a touch
  screen the row is a 44px target — never on a row of chips, whose first chip
  the label would press. A student, a table and a window are read the same way;
  none of the three brings a frame of its own.
- **Three ways to fill the inspector.** The class layer's selection is a student
  id, so `Inspector` resolves it from the seating-plan context itself; with no
  student open the layer portals the class (`ClassInspector`), which is why the
  status bar's switch opens it as a drawer below `lg`. The room layer's
  selection is table indices and feature ids buried in the canvas state, and the
  plan layer's criteria need the view's mix handlers, so both render through
  `InspectorPortal` into the shell's slot — markup travels down instead of a
  dozen mutators travelling up. The class layer's ticks do the same, because
  they live with the list — one ticked student in `StudentInspectorPanel`, the
  panel the shell draws for an opened one, several in `StudentBulkInspector`; a
  mounted portal (`portalMounted`) is how the class layer's inspector knows to
  hand its slot over. In the circle the plan layer portals `CircleInspector`
  instead: the plan's own section first, as in the table plan, then, in place of
  the criteria — the circle is not built from them — only what the order came to
  (`utils/algorithm/circleSummary.ts`): how many table neighbours stayed side by
  side. The arcs between table neighbours read the same derivation, because the
  neighbour lists stored on each seat describe the order the circle was built in
  and go stale on the first drag. `StatusBarPortal` does the same for the status
  bar (`history` for a layer's own undo/redo in the middle, `action` for its
  primary action beside them, `status` for what a view states at the left end).
- **Help opens beside the stage, not over it.** What it explains — the toolbar's
  settings, the status bar's icons, the lines in the circle — stays in view
  while it is read, so the `?` in the header (or the `?` key) puts the help in
  the inspector's place (`InspectorContext.helpOpen`, rendered into
  `helpSlotNode`): the column from `lg` up, unfolded for it and folded back when
  it closes if it was folded before; the drawer below `lg`, on a phone too. What
  the layer portals in stays mounted underneath, out of sight. It is built as
  every inspector is: the screen's name in the header with an ✕, "Anleitung",
  then "Mehr Hilfe" with the tour, the FAQ and the keyboard shortcuts — folded
  until asked for, left out on a touch screen, and scrolled into view as they
  unfold, the row above them (`revealInScroller`), since they open below the
  column's fold. "Anleitung" is a list of topics, not of paragraphs
  (`HelpTopicList`; the topics in `components/help/workspaceHelpTopics.ts` and
  `pageHelpTopics.ts`): the icon the screen gives the thing, two or three words,
  one sentence of at most two lines under them — only what the screen does not
  say by itself. A key belongs in `utils/shortcuts.ts`, which the help lists
  under "Tastenkürzel", not in a topic; the projection lists its own keys alone
  (`shortcutSectionsFor`), as it has no layers and no toolbar. Opening a
  student, the inspector's switch and a drawer the layer opens put it away;
  Escape closes it from anywhere as a drawer, from inside it as the column; a
  tap beside the drawer closes it too. The projection and the class tools have no inspector:
  there the same panel is a drawer of its own from the right edge.

## Questions and messages

- **A deletion asks as near its button as what it takes along allows** (decision
  0041). A student, several students and a photo go at once, and a card offers
  "Rückgängig" until the class list changes again, another class opens or the
  class layer is left (`offerStudentUndo`); the status bar's undo remains. In
  "Bibliothek" a plan, a mix, a template, a preset and a room without plans go
  the same way, from the inspector's foot, Entf and the entry's menu alike, its
  undo (`useLibraryHistory`) behind them: the card stands until the next step
  and the status bar's arrows until the page is left; a row that goes with the
  focus on it hands the focus to what is chosen now (`ColumnBrowser`). Where no
  undo stands behind it — a template or a room in the room's inspector, a preset
  in the criteria panel — a menu's row turns into the question in place
  (`question` on a row of `InspectorMenuButton`, `InlineQuestion`), and the menu
  stays open meanwhile. A class, a room with plans and all data ask in
  `ConfirmDialog`, which counts what goes (`confirmFacts`); for a class and for
  all data its row "Backup sichern" ends the question and starts the backup; a
  room with plans comes back afterwards as well, so its dialog only counts.
- **A message stands where it belongs, and is rarely a card** (decision 0037).
  What the screen shows is not said again — a plan that opened, a class made, a
  room deleted after its question — but heard by a screen reader (`announce`). A
  refusal is said at the control that asked: under its field, or, on a blocked
  "Weiter", "Öffnen", "Entfernen" and the plan's exits, by the hint at the
  button for four seconds after a press (`useRefusalHint`), which a finger never
  saw on hover; the backup's password dialog tries the password and stays open
  on a wrong one; a seat let go on shows it is locked. A state or a confirmation
  the screen does not show goes to the status bar (above). The rest — errors, an
  undo, a note on the unexpected — is a toast over the middle of the status bar,
  never over the toolbar, the inspector or an open drawer: where the middle
  leaves it too little room it takes the middle of what they leave
  (`toastDock`), put away by a tap anywhere on it (DESIGNSYSTEM § 6f). A
  shortcut whose control is not in view keeps its toast.

## The criteria

- **A criterion is set in words, and the plan says what it came to.** Four named
  levels — Aus, Beachten, Wichtig, Sehr wichtig — stand for the weights 0–10
  (`utils/mixImportance.ts`); there is no slider and no fine tuning, the four
  levels are the whole scale. The panel reads as the student inspector does: a
  criterion is an `InspectorRow` under its family's `InspectorSection` (the
  class list's headings, Verlauf first), its icon and name on the left and on
  the right a scale — a dash on the baseline for Aus, three rising bars filled
  in the family's ink (`ImportanceScale`) — whose words stand in each step's
  tooltip and accessible name; its explanation stays under the name, and the
  fulfilment under that is a bar and a percentage. The mixing follows the plan's
  own section (see above), led by the preset, a section of its own
  ("Voreinstellung", `MixRecipeSection` — internally still a recipe) with the
  switch for all criteria beside its heading and the count of active criteria
  under its button: a button that opens the presets as a menu
  (`utils/mixRecipes.ts`) and sets all eighteen at once — "Standard" is the way
  back to the defaults — and the settings note which one they were set from
  (`presetId`). The menu lists the shipped presets and under a rule the
  teacher's own with a pencil and a bin (decision 0038; stored once for every
  class, `repositories/mixPresetStore.ts`, read through `useMixPresets`); an own
  or a changed preset describes itself in one short line from its weights — the
  highest level, two of its criteria and "+2" for the rest, a changed one led by
  "Angepasst" —, since the whole list is the criteria's below. Moving a
  criterion after choosing a preset names it "Klassenarbeit · geändert", after a
  reload too (`useMixRecipes`) — and rows under the button offer what can be
  kept, only while it can (`MixPresetActions`): the change in that preset (never
  in "Standard"), the mix as a new preset, named in a row of its own as a room
  is, and for a changed shipped preset "Original wiederherstellen". Kept is said
  to a screen reader alone, since the button names the result. How well the plan
  meets them is the status bar's to state, not the inspector's (see above);
  after the preset come "Hinweise" while the class and the room leave something
  unmet — more students needing a front seat "Sehr wichtig" than the front row
  holds, a wish answered with a distance wish (`MixHintsSection`, `useMixHints`,
  `model/feasibility.ts`); the section is not there otherwise. Decision 0018
  holds the reasons.

## Beyond the workspace

- **The projection carries one bar, and it is ink in both themes.** `/present`
  puts every control into `PresentationToolbar` under the plan — the two views,
  the two shapes, the draw, what to show, the size, the way out — while the head
  on top says what is on the wall — the view, the class under it, no count of
  seats — and has no way back of its own: that is "Beenden" in the bar, within
  reach at the board. Every button there carries its word under its icon
  (`barIconButtonClass`), so the bar stays on one line: at the board no tooltip
  explains an icon to a finger, and the word stays part of the button's
  accessible name. A window with no room to spare, a phone upright or held
  sideways (`bar-compact`: below `md`, or lower than 32rem), keeps it to one row
  too, which scrolls sideways with "Beenden" in sight beside it and leaves out
  the size slider a swipe would drag; two fingers, the wheel and `+`/`−` set the
  size there. A setting that is on reads as a selection
  (`--surface-option-selected`), never in solid blue, which marks the view on
  the wall (teacher's or students'). In fullscreen the head is not drawn and the
  bar lies over the plan, out of sight until the pointer nears the bottom edge,
  a tap lands there or the keyboard moves into it (`useEdgeReveal`). The plan is
  framed on the furniture, not on the empty 900×600 room: the board, the windows
  and the door come in from their walls to just beside the tables and furniture
  more than a gangway from them stays out (`featuresForTableFrame`,
  `frameContentBounds`), or a whiteboard got a quarter of its area filled; the
  exported sheet is framed the same way. The circle is framed on its ring the
  same way (`SimpleCircleView fit`), so 100 % fills the wall, and the draw works
  there too: it takes the circle's order as its pool and lights the drawn place
  (`CircleSpotlight`, the counterpart of `PresentationSpotlight`). After a tap
  the bar stays up five seconds rather than one and a half, and the projection
  shows no success message (`quietSuccessToasts`) and keeps the question whether
  the plan was in use for the way back (`holdUntilLeft`) — the wall faces the
  class; the contrast mode draws it black on white for a bright room, and the
  beamer keeps its own name rule (`spg.present.nameDisplay`, first names) apart
  from the editor's. Two fingers or one move the plan with every step they
  take, so a step changes the plan's transform and nothing else: the head is
  one element for as long as it says the same, the bar is memoised and gets
  handlers that keep their identity (only its size slider follows the zoom),
  and what the plan draws is one memoised subtree of `PresentationScene` — a
  new control on the page goes behind one of these three, never into the
  render a finger drives.
- **A tool used standing up is a route, not a panel.** "Wer kommt dran?"
  (`/wer-kommt-dran`), "Wo sitzt wer?" (`/wo-sitzt-wer`), "Gruppen bilden"
  (`/gruppen`), "Dienste verteilen" (`/dienste`) and the name game
  (`/namensspiel`) share `components/tools/ToolPage.tsx`: the way back on top,
  the answer in the middle, one action pinned to the bottom edge, as wide as a
  phone's thumb wants and no wider than 28rem on anything larger; inside a game
  the name game's way back leads to its choice of game first (`onBack`), while
  Alt/⌥+← leaves. They are `noindex` and store nothing — but for the duties,
  which go round fairly only because each class's duties and rounds are kept
  (`repositories/dutyStore.ts`, `utils/dutyDraw.ts`, decision 0028) and whose
  rota is a PDF in the frame every export shares (`scene/DutyRosterSheet`), and
  the name game's statistics — and are reachable from "Klassenwerkzeuge" at the
  foot of every toolbar ("Gruppen bilden" and "Dienste verteilen" also from the
  projection's bar); their way back goes through the history, so it returns to
  where they were opened from — the projection in the view it was left in. A
  tap on a seat in the projection marks its student as missing today: the seat
  is veiled in its own shape with its table's surface (`SeatShape.outline`), so
  it reads as nearly empty and no veil shows past the table's round corner, and
  in the teacher's view their photo turns grey and pale (`absentIds` on
  `SceneTable`); a second finger abandons the tap, so a pinch never marks anybody
  (`useTapGesture`). The bar counts them ("2 fehlen heute") and a press on the
  count lists them above it — a name brings that student back, "Löschen"
  everybody. The list hangs on the bar itself (`AbsentMenu`), not on `<body>`
  and not in the bar's row: in fullscreen only the projection is on screen, and
  a phone's row scrolls and would clip it; it follows its count when the row
  scrolls. The draws and the groups leave the missing out and say so under
  their title, and nothing is stored — a new day or a reload starts with
  everybody there (`absenceStore`, decision 0045). While
  the class sits in the circle, "Wer kommt dran?" draws from the circle and
  names who sits on either side (`findCircleLocation`) instead of a table; under
  the name it shows the plan or the circle, there before the first draw, with
  the drawn place lit, as "Wo sitzt wer?" does. Only the plan's height gives:
  the answer's card keeps one height, and who has been asked is one line that
  slides sideways, so the plan does not jump at a draw. Both name cards show
  the student's photo where there is one, and neither tool dims the rest of
  the plan (`spotlightDims={false}`): held close, the lit seat — amber,
  `spotlightSeatFill`, its name bold, the ring round it — is enough, while the
  projection darkens the rest for the back row. An empty state's button names the layer that supplies what
  is missing (`ToolEmptyState`'s `step`, read by `useSeatingWizard`), since the
  tool may have been opened from any layer. A new one of them needs a route, a
  `seoRoutes.json` entry, a `hidesFooter` entry and a `routeComponents` key —
  decision 0019 holds the reasons.
- **The pages beside the app share one frame** (`components/publicPage/`):
  `PublicPage` (every page's head above the page's column, across the window,
  with the wordmark beside the mark and "Zurück" when the visitor came from
  inside the site; the 404 page wears it too, and the start page in its own
  form: the same row in the page's column, on a hairline of that width, with a
  larger logo, scrolling away with the page, `headInColumn`, its logo flying to
  the workspace's and back, `useBrandFlight`, decision 0040), the type in
  `pageTokens.ts` — what stays in view while it is read sticks below the head
  (`lg:top-22`) — and `LegalPage`/`LegalSection` for the Impressum, the
  Datenschutzerklärung and the stand-in that forwards to an operator's own. None
  of them sets a minimum height: `App.tsx` makes the page a column at least as
  tall as the window, so the footer sits on its bottom edge however short the
  page is. The footer is one line of plain links — FAQ, feedback, support, the
  changelog, Datenschutz, Impressum — and nothing else; the legal pages stay
  words there rather than rows in the gear (§ 5 DDG: "easily recognisable"). The
  rules are in `docs/DESIGNSYSTEM.md` § 6d.
