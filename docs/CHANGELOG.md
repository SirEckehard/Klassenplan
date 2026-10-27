# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Improved

- On a phone, ticked students are edited in the same sheet as a single student, with every attribute named and "mixed" where only some of them have it. Ticking opens nothing and leaves the list in view; the switch at the right of the status bar shows how many are ticked and opens the sheet, and the ✕ that takes the place of the class count lets them go. The bar of icons above the list is gone
- On a phone, the class list starts sooner: the search takes the line above it, and one button beside it holds the filter and the sort, with a dot while a filter hides students. The list's head says "Select all" and how many students a search or filter left, and each row's checkbox stands beside the name, its markers under the name
- On a phone or a tablet held upright, the seating plan turns a quarter with the board at the bottom, so it fills the screen instead of a third of it and the names are about half again as large. The room itself stays as it is; only the picture turns

### Fixed

- On a phone, the note above the plan that the class has changed no longer squeezes its text into a column one word wide behind its buttons: the buttons now go below the text

## [3.2.1] - 2026-10-26

### Added

- "Theme as the system" in the settings menu: light or dark follows the device again, also when it turns dark in the evening. Switching the theme by hand still holds whatever the device does; a theme chosen in an earlier version is let go once, so every device starts on its system's

### Improved

- A locked seat keeps its gender colour: it shows its lock in blue and a blue edge all round instead of a blue fill. The lock is a plain icon without its round plate, and the names beside it have a little more room
- The marks on the seats of a plan – where a dragged student would land, the green flash after a drop, the seats a marker or a criterion points at – keep clear of the table's edge and follow its rounded corners, so the table no longer cuts them off; a held seat shows its blue edge all round instead of only towards its neighbour, and the seating circle marks its places the same way
- On a sheet framed on its tables ("Enlarge the plan"), the board, windows and door are drawn a little lighter, so the seats stand out
- The export's "Legend" switch is greyed out while the sheet carries neither markers nor gender colours, since the legend would have nothing to explain
- When a layer cannot be shown, its error message stands as a card in the middle of the workspace instead of a band across it, without an empty inspector beside it or a switch for a toolbar that is not there

### Fixed

- Two windows of Klassenplan – two browser tabs, or the installed app beside a tab – no longer undo each other's work: saving in one put every class the other had changed back to what it had been. Each window now keeps the class it has open, and opening a class reads what the other window saved
- A window that comes back to the front shows what another window changed in its open class meanwhile and goes on from there, instead of saving its older class list or plan over it later; its undo starts afresh then, as after opening a class
- Undo right after restoring a backup no longer writes the class list, the plan or the room from before the restore into the restored class: a restore that replaces everything starts the undo history afresh, as opening another class does
- A storage read that fails no longer lets the next change wipe every class's record of the plans in use, its duties or the name game's statistics
- With the device's storage full, Klassenplan still opens the stored classes instead of its first screen, and a class switch that cannot load the class says so
- Edits made in the moment another class opens or the page is left, while a save was still being written, are no longer lost
- A student's photo is no longer deleted when another class is opened after deleting the student and undoing it, after removing the photo and undoing it, or after removing a photo and adding a new one
- On an iPhone and an iPad a .klassenplan backup can be chosen for restoring; the Files app no longer greys it out
- Creating a class, or deleting another one, no longer clears the open class's undo
- Opening a saved plan of the open room, or undoing a step of the plan or the room, no longer brings back students deleted since, nor their old names, markers and photos
- A seat lock no longer stays hidden yet binding after opening an older mix or undoing the removal of a table: after the undo it follows its student back to their seat, and a mix that seats the student elsewhere lets it go
- A student deleted from the class leaves the seating circle too: the circle, its export and the projection no longer show them, and "Who's next?" no longer draws them there
- Swapping two students by hand right after another change no longer goes without an undo step
- Taking back a room loaded from a template no longer deletes it when a mix was made in it
- A seating circle still being worked out when another class or room opens no longer lands in that class or room
- After restoring a backup of the open class, its plan no longer reads as unsaved
- Right after "Save as new plan", or saving a plan without a name, the plan no longer reads as unsaved, and leaving the plan layer no longer saves it a second time
- Rearranging seats by hand and opening another plan, room or mix within a few seconds no longer counts the other one as used
- The projection no longer shows a plan made for tables the room no longer has, nor counts it as presented
- "Where does who sit?" and "Who's next?" no longer answer from a plan made for tables the room no longer has, and the space bar on the projection no longer draws from one
- The export no longer takes a plan of empty seats alone for a plan and prints an empty sheet
- The layer switch no longer leads from the class straight to the plan while a student has no name; it says so, as the way to the room does
- "Print" on an iPhone and an iPad opens the PDF without a message about a blocked pop-up
- "Back" on an empty projection answers a mouse click again
- A CSV import reads "sehr unruhig" or "sehr schüchtern" as restless or shy instead of asking for a front seat; only an entry about hearing, sight or glasses asks for one, and "gehört" no longer does
- A CSV import cut off at 36 students no longer leaves wish and distance partners pointing at students who did not come in
- "Enlarge the plan" no longer draws the plan smaller than the whole room where the tables and cabinets reach to the walls
- On a sheet framed on its tables, the board, windows and door no longer cover the photos above the seats where moving them aside leaves the plan as large as it was
- Locking or unlocking a seat no longer changes the size of every other name in the plan
- After switching the theme by hand, a change of the device's theme no longer switches it back
- Working out the seating circle anew while it is still being worked out keeps its progress on screen until it is done
- On a phone, the iPhone's installed app included, the opened student's panel keeps clear of the home indicator
- On a phone, the table buttons under the room tell a screen reader which table they add, not only their number of seats
- A PDF of a sheet without a title is named in the language the app shows ("Seating Plan", "Circle Plan") instead of always in German
- A backup from before classes is imported under a name in the language the app shows ("Imported Class")
- "Delete all data" also removes the seating circle's setting for its connections

## [3.2.0] - 2026-10-22

### Added

- "Notes" in the seating plan's inspector name what a class and its room cannot meet: more students needing a front seat than the front row holds, students who all keep a distance from each other with fewer tables than they are, a wish answered with a distance request, a student wished for by more classmates than can sit around anybody
- Backups are saved as .klassenplan files, and in Chrome and Edge a double-click on one opens the installed app and restores it; older .json backups still import
- "Als App installieren" in the gear menu shows how to install Klassenplan in the browser it is open in – Safari, Firefox and a Chrome or Edge that has not offered it yet included
- A guide for a school's IT: installing Klassenplan on every computer by policy, hosting it, and keeping the data across sign-outs

### Improved

- Mixing weighs every criterion the way the inspector shows it: who sits next to whom counts at the seat partner, at the same table and at the seat directly beside, in front of or behind at the next table – seen from the board, with no aisle in between – and the fulfilment beside each criterion counts the same, against what the class and the room allow. Plans meet preferred partners and distance requests far better, above all at single desks, and the percentages mean what they say: 100 % is as good as the class and the room allow
- "Mix" tries three starts and keeps the best plan – and still takes less time than one took before
- The inspector of the seating plan and the circle shows the plan itself: its name, whether it is saved, saving it ("Save plan") or keeping a copy beside it ("Save as new plan"), and opening another plan of the class – one of another room opens that room – the mixing criteria follow below. Saving is no longer an entry of the toolbar, as a room's template already was not; Ctrl/⌘+S still saves straight away
- Classes no longer open a dialog: a new class is named right in the class menu of the header – or, the very first one, on the start card – and Enter creates and opens it. While no student is open, the inspector of the class layer shows the class itself, where its name, school year and notes are changed, as in "Bibliothek"; the class menu renames a class in place, and a change no longer brings a message
- Every inspector is renamed where it names what it shows – in its header, as a student's name already was: a class, a room, a plan, a template and the export sheet's title. A click opens the name as a field, Enter keeps it and Esc takes it back, and no field under the heading repeats it any more. A saved plan is renamed at once, as in "Bibliothek"; "Save as new plan" keeps a copy beside it under a free name, which you then rename
- Every inspector – criteria, room, export sheet and "Bibliothek" – is laid out like the student inspector: one row per setting with its icon and its explanation under the name, fewer and more logically ordered sections, a short scale for a criterion's importance, and menus instead of long lists for the preset, a plan's room, and the room's rooms, templates and – once its tables stand – its setup
- "Front seats" at "Very important" keeps the students needing one in the front row, and who sits beside whom there follows the other criteria; at the levels below, the row behind it counts as a front seat too, and only a criterion weighed more moves a student further back. The recommendation and the presets set "Very important", and a class keeps the front row it had
- "Gender" counts diverse as a gender of its own and a table as mixed while no gender holds more than half of it; it is offered once two different genders are in the class
- "Repetition" weighs a plan by how recent it is, whatever the number of plans, and parts the pairs who sat together most often first
- The seating circle keeps students with a distance request, restless and distractible students apart where it can, as weighted for the mix
- A room is saved as a template in the room's inspector instead of a dialog: the name – the room's own to begin with – is typed in place, and a name a template already carries offers to replace that template
- "Bibliothek" asks for a template's name as the room's inspector does instead of adding a number to a name that is taken
- "Add student" and "Create placeholders" stand under "Add" in the class's toolbar, as the room's tables do; "Manage" keeps the class list's import, export and printing
- Searching the class list opens the student the search clearly means in the inspector while you type – the only one found, or the only one whose name or first name it is or starts with. Enter opens the first student found
- On an iPad in portrait, ticking several students opens their shared settings in the inspector, as on a larger screen
- Tapping the student who is open in the class list again closes the inspector – on an iPad in landscape the column folds away again
- The settings gear sits at the top right of the start page and of the pages beside the app – the same menu as in the app. The footer is now a single line of links, and every page opened from the start page or the footer offers "Back"
- The settings gear lists the FAQ beside feedback and the changelog, and shows all its entries at once – it scrolls only in a window too short for them
- Messages glide in at the top right, the newest on top, and glide out again. A message stays while the pointer rests on it, the keyboard is in it or Klassenplan is in the background; a thin line shows how long it remains, and a swipe to the right puts it away. With "Reduce motion" set in the system they come and go without animation
- "Check for updates" in the settings gear answers in its own row – "Current · v3.2.0" with a check – instead of with a message over the menu
- The frame round a student's photo or initial in the class list, the inspector and "Bibliothek" shows the gender's colour, as on the seating plan; on the export's note list it does so too, and the export's "Gender colors" switch turns it off there
- Every row of the student inspector is the same height, whether it holds a switch, choices or a menu, and so is every button in it
- "Fulfilment" in the status bar of the seating plan switches the values per criterion on and off; the inspector no longer repeats it in a row of its own
- The room's inspector keeps the class's other rooms under the room's name: "New room" as a button of its own, and "Open a room …" for the others, instead of a section "Rooms" beside the section "Room"
- The "Recipes" that set all criteria at once are called "Presets" now, in the inspector, the FAQ and on the start page
- The FAQ explains how the mixing reads neighbours and how the fulfilment is counted
- The FAQ explains installing the app browser by browser

### Fixed

- "Mix" with every criterion off was not random: restless students always sat apart and at the tables added last. Now every arrangement is equally likely
- "Repetition" counts only the plans that were really in use: its value no longer falls while you mix again and again, and a plan no longer counts as a repetition of itself once it was presented, exported or saved. Mixing no longer avoids the pairs of earlier mixes either – that the next mix turns out differently is left to chance and the other criteria
- After the room was set up anew with other tables, the seating plan no longer shows the old plan on the new tables, its students beside the tables and on top of each other: it is mixed for the new tables, and where that cannot happen on its own the tables stay empty with a notice and "Mix again now". Such a plan is neither saved, exported nor presented, and its fulfilment is no longer shown
- Opening a saved plan whose tables differ from the ones on screen – another room's plan above all – no longer mixes it over at once; it stays as it was saved
- Two students needing a front seat could be seated at one desk even when they keep a distance from each other or are both restless
- The refinement after the construction could hand back a plan worse than the one it started from, paired the weak students left over when "Support (heterogeneous)" was on, and read a distractible student beside a restless one in one direction only
- The first plan of a class set the weights of "Front seats" and "Support (heterogeneous)" itself instead of mixing by the teacher's
- Highlighting "Repetition" right after a mix marked every pair as repeated
- Students' photos show on the plan and in the circle from the start – they used to appear only on hover, which a finger on a touch screen cannot do. The setting starts at "On" once on every device; "On hover" can still be chosen
- On an iPad, drawing a selection box across the room or dragging a student scrolled the page instead
- Turning a table by its handle follows the pointer again – it turned around a point beside the table, so a small table jumped or turned the wrong way
- In "Bibliothek", F2 put the focus in the name of every entry chosen afterwards as well, not only in the one it was pressed on
- The button in a message – "Update", "Undo" – could hardly be seen in light mode

## [3.1.4] - 2026-10-15

### Improved

- Internal improvements

## [3.1.3] - 2026-10-15

### Improved

- Internal improvements

## [3.1.2] - 2026-10-12

### Added

- "Hand out duties" among the class tools: name duties such as board duty or sweeping, set how many students each needs, and draw them in fair turns – whoever has had the fewest duties so far goes first, and nobody gets two at once. If someone drops out, you replace just that person. The duties and the last 20 rounds are kept with the class, and the rota saves as a PDF to put up

### Improved

- "Print" on the export page now opens the browser's print dialog straight away instead of a PDF in a new tab. Paper size, orientation and margins are set already, every page of a list goes on a sheet of its own, and the printout matches the preview – sharper, too, since the plan is no longer printed as an image. On an iPhone and an iPad the PDF still opens in a tab
- The class list and the printed note list can be sorted by last name as well. "Name A–Z" is now called "First name A–Z", and the note list's "Alphabetical" "By first name". The last word of a name counts as the last name, so "Anna von Berg" comes under B
- In the student inspector, social role and language level take one row each instead of a list of four or five: the value stands on a button that opens the choices as a menu, with "None" or "Not specified" first to take it back. Both rows carry the icon of their criterion before their name
- On a wide screen the student inspector no longer has a close button – its column folds away from the status bar. The name gets the room, and "Student 1 of 24" with the arrows beside it is larger. On a phone and a tablet the button stays
- Stepping through the class list with the arrow keys no longer draws a blue frame round the row, since the opened row's bar already shows where you are; reaching a row with Tab still shows it

### Fixed

- In dark mode the inspector's column was a lighter shade than the toolbar; both edges of the workspace now share the same one
- In the seating plan, names on turned tables came out smaller than the rest, because room was kept on every seat for the lock that only appears under the mouse. That lock now lies over the name while it shows, and where a lock is always drawn – on a touch screen, or once a seat is locked – the name moves aside from it instead of shrinking, so the names are as large as on the exported sheet
- The narrow toolbar could be scrolled sideways

## [3.1.1] - 2026-10-11

### Added

- A note list to print: "List" on the export page puts the class on paper with room to write beside every name – ruled lines for observations, or a grid of empty columns to tick off whose heads take a date or a topic. It goes by table as in the plan, round the circle or by name, runs to as many pages as it needs and is saved as one PDF. "Print list" in the class's toolbar opens it straight away, even before the first mix.

### Improved

- Klassenplan installed as an app opens on the class instead of the start page, and its shortcuts lead to the "Library" and to exporting
- The small print of the toolbar, the inspector and the menus grows with the text size set in the browser
- "Mix" takes about half as long: the plan is refined once instead of twice
- "Mix" weighs earlier neighbours alike in every step: recent plans more than old ones, plans in use more than mixes that were only tried. The arrangement a mix builds is no longer broken up for its own pairs
- The interface is set in Atkinson Hyperlegible Next, a typeface drawn for legibility: similar letters such as I, l and 1 or O and 0 are told apart, which helps on a projector and for names on small seats. Headings in Source Serif 4 replace Instrument Serif and are no longer thin at small sizes
- The "Klassenplan" wordmark is set in Onest, where the "l" stands level with the "K", and is drawn from outlines, so it keeps its letterforms in the app, in the files of the brand kit and on the signature of every exported sheet ("Klassenplan.de") instead of following the interface font
- The start page's hero title and the page titles get more line spacing, so the descenders of one line no longer touch the next

### Fixed

- After restoring a backup with "Replace", the seating plan was rearranged as soon as it was opened. It now stays as it was saved
- After every mix, the "Recent mixes" held a different plan from the one on screen
- Restoring a backup with "Replace" while another class was open than when the backup was made overwrote the open class with the other one – its students, plans, mixes and room. It happened on an iPad and in Safari every time. Each class now comes back as the backup holds it
- A save that failed was only reported once the tab was left, and was not tried again, so changes could be lost without notice. It is now said at once, "Not saved" stays in the status bar until a save works – a click there tries again – saving is retried on its own, and leaving the page asks first
- After Safari closed the database connection in the background, every later save failed until the page was reloaded. The connection is now reopened
- A class whose creation could not be saved still appeared in the class list, and a second attempt was refused as a duplicate name
- A backup made right after an edit could miss that edit
- A student locked to a back seat of a table taken out of the mix – or of a table at the back while the room fills from the front – got a neighbour when mixing. Mixing now seats nobody there
- In the "Library", deleting or changing a plan, mix or room of another class said nothing when it could not be saved, and "Template deleted" appeared even when the template was not
- Leaving the seating plan a second time without naming it turned the automatic save into a plan of its own, so the "Library" filled up with plans named after a date and time
- The class list template and the exported class list opened in Excel set to German as a single column, with the umlauts garbled. In German they are now separated by semicolons and open as a table
- Moving the open plan into another room of the class in the "Library" threw away what was not saved in that room yet. It is now kept in a plan of that room
- Half a minute into the projection, the question whether the plan was only a test appeared on the wall in front of the class. It now waits until the projection is left
- The check that tells an old browser why the page stays empty was kept by the browser for a year after an update
- An image or PDF exported between midnight and two in the morning carried the previous day's date in its file name
- In an exported image or PDF, letters such as ğ, ş, ł or ő in a name were drawn in another font than the rest
- A student who was removed stayed in the others' wish and distance lists, unseen: the place counted against the limit of three, and the fulfilment of the wishes could never reach 100 %
- On a large screen a long class list had a second scrollbar beside its own, which moved the whole class layer by a few pixels. Only the list scrolls now

## [3.1.0] - 2026-10-07

### Added

- The export sheet's inspector switches the gender colours off: "Gender colours", for the seating plan and the circle alike
- A table can be taken out of the mix: in the inspector of a table, or of several, keeps it in the room but leaves it empty when mixing – drawn with a dashed edge. A student can still be put there by hand. The room's status bar counts only the seats in the mix
- A room can be filled from the front: with more seats than students, in the room's inspector seats the class from the board backwards, so the spare seats are at the back
- The class list is walked with the keyboard: ↑ and ↓ go from student to student and open each in the inspector, Home and End go to the ends, and the focus stays in the list. From the inspector, Alt/⌥+↑ and Alt/⌥+↓ go on to the previous or next student

### Improved

- Height is small, tall or not set – "Medium" is gone, since it never changed a seat. A class list that says "Medium" still imports, as no height
- On a phone the status bar states the class layer's count as a bare number, as on the room layer; the plan layer's fulfilment no longer carries an icon
- The inspector's arrows go through the students in the order the class list shows them – sorted, searched and filtered – and its "Student 2 of 5" counts the same way as the list's numbers

### Fixed

- On an iPhone the plan layer's status bar covered the fulfilment
- In dark mode the browser's bar above the start page and the other pages stayed white when the phone itself was set to light
- The focus ring of a row in a dropdown – the partner list, the menus, the "Library" – was cut off at the edges
- After the notice about local storage was acknowledged, a black strip that could be scrolled stayed under the workspace

## [3.0.0] - 2026-10-06

### Added

- The "Library" takes the place of the "Plans, mixes & neighbourhoods" dialog: a page of its own, laid out as a file manager shows folders: the classes, a class's rooms with its recent mixes and neighbourhoods, a room's plans, and the room templates, side by side in columns. It opens on the plan that is open, in its room, in its class. What is chosen is read and changed in the inspector – renamed, moved to another room or a new one, duplicated, deleted – the path stands in the status bar, and "Open" takes the choice into the workspace: a plan, a room, a class, a mix, or a template as a new room. Another class can be looked through without opening it. A class's "Neighbourhoods" list its students, and a student's neighbours in the next column, most often first and with their photos. Arrow keys, Enter, F2 and Delete work as in a file manager; on a phone the columns follow one another
- A class keeps its rooms – the classroom, the lab – each with its own tables and plans. The room inspector names the open room and lists the class's rooms under "Rooms": a new one is named and made there, another opens as it was left, seating, locked seats and open plan included, and each is renamed and removed in its row. A saved plan or a mix opens the room it was made in; a template opens as a room of its own, and the message after it offers the way back. "Save plan" says which room the plan goes into once a class has more than one
- A new workspace around the three layers of a class – Class, Room, Plan: the open class is named in the header, the toolbar sits on the left, the stage in the middle and the inspector on the right. A status bar under the stage says where things stand, carries undo and redo, and leads back and on. On a desktop the window no longer scrolls as a page; the toolbar, the stage and the inspector scroll on their own
- The inspector: whatever is selected – a student, a table, a room element, several ticked students – is edited in one panel on the right instead of in the list rows. On a tablet in portrait it opens as a drawer from the status bar, on a phone as a sheet
- Plans in use can be marked by hand: in a plan's inspector in the "Library", "Used" says whether it counts for the neighbourhoods, and "Detect automatically", switched off, leaves the class to that mark alone – presenting, exporting and saving no longer note anything. Switched back on, the plans detected before count again. The neighbourhoods name each plan they rest on by its name, date and room
- "Attributes" asks one question of the whole class at once – "Who is currently restless?" – with one tap per student, and "Relationships" shows who wants to sit next to whom: a card per pair with both faces, the pairs who named each other first and marked, and under "No wish yet" who has named nobody
- In the seating circle the inspector says how many table neighbours still sit side by side and names the pairs the circle split up
- Coming from an earlier version, a short summary shows once what the new design changed – the three layers, the rooms and the "Library" – and starts the tour on request. The "Library" has a tour of its own, and the class layer's tour points out its three views and the "Library"
- Criteria are set in words – Off, Consider, Important, Very important – and recipes set all sixteen at once, "Recommended mix" among them
- Three class tools, each a screen of its own: "Who's next?", "Where does who sit?" and "Build groups", reachable from "Class tools" at the foot of every toolbar
- The settings menu in the header – the same place on every layer – holds theme and language, the update check and clearing all data, then feedback, the changelog with the running version, the GitHub repository and the legal pages; the workspace has no page footer any more. Every help dialog ends with a link to the part of the FAQ that answers the screen it was opened on
- An error screen offers a prepared email with a reference code; nothing is sent automatically
- A browser too old for Klassenplan – often the built-in one of an interactive whiteboard – shows a notice with the versions it needs instead of a blank page: Chrome or Edge 111, Safari 16.4, Firefox 128
- Shortcuts on a single key – "?", P, F, 1–3, Q/E and others – can be switched off in the settings menu, so speech input cannot set them off by mistake
- "Reset" in a class's "Neighbourhoods" in the "Library" forgets every neighbourhood of the class in one click – for a new school year, say: earlier saved plans and mixes no longer count either, and the message after it takes it back

### Improved

- The toolbar has the same shape on every layer: the view first, then what can be added, the view settings and managing the class, and at its foot the "Library", the class tools, the backup and support
- The room is set up from the inspector while nothing is selected: "Set up from scratch" places as many tables of one kind as the class needs, and Ctrl/⌘+Z brings back what stood there; "Templates" keeps the room for other classes and opens a kept one as a room of the class. It replaces the dialog that covered the room
- Tables and room elements are added with a click or Enter as well as by dragging: they land on the free spot nearest the middle of the room, and a window or a door on the first free stretch of wall. The arrow keys move room elements too – along their wall if they hang on one – a key held down is one undo step, and deleting, cutting, pasting or duplicating tables and room elements together is one undo step as well
- The markers on a seat explain themselves: pointing at one names it and marks the seats it concerns. Dragging works the same in the plan and the circle, with a ring on the target and a confirmation after the drop
- The projection has one bar under the plan, a contrast mode for bright rooms and its own name rule (first names)
- A plan is named where it is saved, and "Mix" and the two ways out – present and export – sit in the status bar
- Menus and panels of the header and the toolbar can be reached, used and closed with the keyboard
- Creating placeholders adds as many as the class has room for, says in one message how many there are, and opens the first of them for its name
- On a phone the toolbar opens as a drawer from the left end of the status bar, where a tablet has its switch, the mirror of the inspector on the right; the blue "Options" button that floated over the stage is gone. On a phone the header shows the open class as a mark, so all three layers stay in reach
- In the seating plan the arrow keys move from seat to seat, as they do round the circle: Enter picks a student up, the arrows choose the seat, Enter puts them down
- Ticking several students who differ in gender, height, language level or role shows the values some of them have, outlined in dashes, instead of looking as if nothing were set
- The window seat has the window's icon; the picture icon now only means photos
- English says "mix" throughout – only the circle's purely random shuffle is still called "shuffle" – and names and percentages are written as each language writes them
- The browser bar and the installed app's splash screen take the page's own paper colour
- The changelog's texts load with the changelog, and more than 200 texts nothing used any more are gone: the first visit downloads about 7 KB less
- "Attributes" on a phone and a tablet: the question takes the whole width, the way on to the next attribute stays in reach above the status bar instead of hiding behind it, and every row shows the student's photo or initial. Its buttons are grey, so the status bar's "Next" stays the one blue button
- On a phone the criteria live only in the drawer from the status bar, and the room's setup only in the inspector; "Mix", "Align" and "Shuffle" show their icon alone, so the toolbar's switch stays in reach
- The way on reads "Next" on every layer; its tooltip and its name for screen readers say where it leads. On a desktop and an interactive whiteboard the buttons at the right of the status bar carry their words, on a phone and a tablet their icons alone
- The inspector's column folds away on every layer, the class included, from a small switch at the right end of the status bar – the mirror of the toolbar's at the left end – so the plan gets the width; an iPad in landscape starts with it folded, opening or ticking a student brings it back, and the choice is kept per device
- On a tablet or an interactive whiteboard the room's toolbar scrolls with a finger where it is taller than the screen
- On a touch screen the controls are a fingertip's size: switches in the inspector and on the export page work from their name as well, value chips, the class list's checkboxes, "Remove photo", the size slider of the projection, the room's locks and rotation handle grow to about 44px, and a tap explains the nearest badge on a seat instead of having to land on its few pixels
- On an interactive whiteboard the toolbar starts with its labels, and every button of the projection's bar names itself under its icon; a touch screen shows no tooltip to explain an icon
- The projection frames the tables: the board, the windows and the door come in from their walls to just beside them, and furniture far from them stays out, so on an interactive whiteboard the names come out about twice as large. After a tap its bar stays up for five seconds
- Messages appear at the top right, just under the header, instead of over Help and the settings; the projection shows no success messages
- In the seating plan the status bar carries "Present" and, at its outer end, "Export", on a narrow phone "Export" alone, with "Present" at the foot of the toolbar. The line on the left no longer counts the seats – the plan shows whether it is there – and neither does the projection's top strip
- Offline, a small cloud beside the toolbar's switch says so instead of a badge covering that switch, and on a phone the jump to the ends of the class list hangs above the status bar instead of slipping into it
- The first screen, before there is a class, has the toolbar too, with what needs a class greyed out, and the card asking for a class in the middle of the stage
- The seating circle fills the interactive whiteboard in the projection, and "Who's next?" draws from the circle there and on its own screen, naming who sits on either side
- On the export page one switch shows or hides all room elements at once, and a plan exported from the circle opens with the circle on the sheet
- On a tablet the status bar says the number alone where the full line did not fit
- The room selects in the one blue of the interface; guides and collision marks follow light and dark mode
- The photo setting "Hover" now reads "On hover" and is left out on a touch screen, where it showed a photo only while a finger rested on the seat
- The keyboard on a tablet names what Enter does while naming a class: "Next", and "Done" at the last student
- New shortcuts: "Mix" is Ctrl/⌘+Enter, as ⌘+M minimised the window on a Mac. On the export page P saves the PDF of the arrangement on the sheet and Ctrl/⌘+P prints; Ctrl/⌘+S and Ctrl/⌘+E work in the seating circle as well
- Names on the seats are larger in the plan, the circle, the projection and every export: a long name breaks into two lines – "Paul" over "Zimmermann" – instead of shrinking to a smudge, full names always stand on two lines, and the names of a plan share one size, so only a conspicuously long one is set smaller. On a table turned at a slant the name and its markers use the width the seat has across its middle and keep clear of the lock
- The exported sheet uses the page: it is framed on the tables as the projection is, with the board, the windows and the door moved up to them, narrower margins and a one-line header in both orientations – the plan comes out about a third larger in portrait and two thirds larger in landscape. "Enlarge the plan", switched off, goes back to the whole room in its outline. On the circle's sheet the ring fills the page and its places grow with the space between them
- In the seating circle "Shuffle" is the blue button of the status bar, beside "Sync with Plan", now the quiet "Align", instead of an entry in the toolbar
- On a phone and a tablet the export page's settings open as a drawer from the status bar, as a layer's do, instead of under the sheet
- A tap beside the toolbar's or the inspector's drawer, or beside a student opened on a phone, closes it
- At the left of its status bar the seating plan says how well it meets the criteria – "Fulfilment 55 %"; pressing it shows the value of each criterion and brings the inspector into view, on a phone over the plan
- The student inspector reads Person, Learning, Behaviour, Social, Seat & room and Language, with the partners first under Social. Every attribute that has a marker on the seat shows that marker's icon, language level and social role stand as a list under their name, a long name wraps in the header instead of being cut off, and the arrows to the previous and next student sit beside the position
- The lists of preferred and avoided partners take a search that ignores case and accents; Enter takes the first match. The list is taller and stays open when the page scrolls – on a tablet the on-screen keyboard scrolled it away from under the finger
- "Native" is now "First language" – in the inspector, on the seat's marker and in the CSV export and its template; the import reads the old words and the new ones
- The seats' colours for gender – green, lilac and blue – come in quieter tones that suit light and dark mode, the export's legend explains them, and the gender chosen in the inspector shows the colour it gives the seat
- "Repetition" no longer splits up a pair that wants to sit together while preferred partners are considered – a wish in either direction is enough
- A plan whose tables differ from those of its room – a lab plan saved before there were rooms, say – asks in the "Library" whether it belongs in a room of its own, right above the way to move it there
- The start page, the FAQ, the support page and the legal pages wear the new design
- Saving a large backup no longer holds up the page for seconds
- Updated dependencies
- On an iPad mini in portrait the header shows the open class as a mark, as on a phone, so it no longer slides under the layer switch

### Removed

- The slider for each criterion: the four words are the whole scale
- The row of round criterion buttons under the plan on a phone and the "Set up classroom" button above the room, which repeated what the drawer holds
- The shortcuts for the circle PDF and for PNG on the export page, where Ctrl/⌘+Shift+T reopened the last closed browser tab and Ctrl/⌘+Shift+C and +I opened the developer tools

### Fixed

- A student's, a plan's or a template's name longer than 120 characters made the next backup unreadable on import; the name fields now take no more than a backup reads back, as the class dialog's do
- A class note longer than 120 characters made the next backup unreadable on import; a note now takes up to 2,000 characters, and backups written before read back
- Loading a room template or "Set up from scratch" left the open plan open, and the next save – the one before exporting or presenting included – wrote the new room over that plan with no way back. Replacing the room now lets go of the plan, and the next save starts a new one
- Preferred partners entered as a list – in the sample class, for one – counted as none: both partner criteria disappeared and the mix ignored the wishes. And a mutual wish further down a student's list lost out to a one-sided one higher up
- A photo replaced or removed while it was still loading could come back
- Opening a saved plan that has no seating circle left the circle of the plan before on screen; the plan then counted as changed at once, and exporting or presenting from the circle saved that foreign circle into it
- After opening another class, Ctrl/⌘+Z in the room or the plan could bring back the room and the plan of the class left behind, students and all; and a mix still running when another class opened was written into that class. The room and the plan now start afresh with each class, and such a mix is dropped
- Restoring a backup with "Merge" replaced every class and every template on the device with the backup's, although it promised to add them. It now adds the backup's classes – a name that is taken gets a number, "7b (2)" – and the templates whose name is free, leaves every class that is there as it was, and says what came
- The space bar draws a student and + zooms in presentation mode, and the space bar draws on "Who's next?" – the help promised all three
- Ctrl/⌘+S in the seating circle opened the browser's own save dialog
- A typed angle wraps round as a turn does: 360° is 0°, −90° is 270°
- Voice control finds the fulfilment button by the words it shows
- Hints that pointed to places the redesign had moved – the footer, "step 3", the portrait icon in the list – now name where things are
- Escape closes an opened student on a phone
- Saving could offer to rename a plan and then refuse: the save panel and the ways out now find the open plan the way saving does
- A long name fits its field in the inspector instead of being cut off at the edge
- On a phone the toolbar's panels and menus – adding a student, the class tools, the backup – opened out of sight behind the toolbar
- On a narrow phone such as the iPhone 16 Pro the class's name pushed the "Class" layer off the header
- A long press on a table or the floor of the room opens a menu that stays open after the finger lifts and never lies under it. It used to close the moment the finger lifted, a finger that trembled started a drag instead, and near the top edge the menu slid under the finger, so lifting it chose the entry there – removing a table nobody meant to
- The FAQ placed "Present" in the middle of the status bar; it is at the right end. Help and FAQ now mention tapping and the two-finger zoom
- On a touch screen a long press on the empty floor of the room – to paste what had been copied – took the room editor down to an error screen
- A room element dragged from the toolbar and taken back by the browser – a swipe, a palm on the board – was placed wherever the next finger lifted over the room
- With a default text size larger than 16px set in the browser, the layout and the toolbar disagreed about whether the window was a phone, a tablet or a desktop: on a tablet-sized window the toolbar stood above the stage and pushed the room and the plan out of sight
- Opening the workspace or a class tool directly showed the page footer under it
- In the seating circle on a phone, "Align" pushed the toolbar's switch out of reach
- "Shuffle randomly" in the circle came out in some orders more often than in others and left about one student in eight where they were; every order is equally likely now, and locked students stay put
- In the sample class the windows and the door hung a little away from the walls, where no teacher could place them
- Offline, the "Library", the settings menus, the CSV example and the English texts no longer take the room editor or the whole app down to an error screen when their part of the app has not been loaded yet: a message says why they do not open. A page that has not been loaded yet shows a notice with the way back instead of reloading into the browser's offline page, and checking for updates offline says it needs a connection instead of reloading
- The app works offline from the first visit on: it no longer has to be reloaded once before the service worker takes over
- Served over plain HTTP – on a school's own server, say – or in a private window, where the browser allows no service worker, Klassenplan works offline as a whole again: once it has loaded, it keeps all its parts in the browser's cache instead of only those already opened
- "Clear all data" in the settings menu and the "Library" in the footer's menu closed together with the menu and did nothing
- Once Klassenplan had been opened in a browser, `/robots.txt`, `/sitemap.xml` or `/.well-known/security.txt` opened there showed the app's "page not found" instead of the file
- A dialog opened with the mouse did not show which of its buttons Enter would press – in "Delete class", "Cancel" was chosen without looking chosen. The chosen button now wears a ring a little off its edge, in light and dark mode

## [2.2.0] - 2026-09-17

### Added

- The collapsed sidebar can now do everything the expanded one can: a ring around the icon shows how important a criterion is, and a right click, a long press, `Shift+F10` or the right arrow key opens its slider – with the name, the explanation and the value, just like in the expanded view. A button at the top of the bar switches all criteria on or off. A one-time hint points this out the first time
- "Restore defaults" sets every criterion back to its recommended importance – next to the "All criteria" switch. The switch itself remembers your values when you turn it off and restores exactly those when you turn it back on, instead of filling in the same number everywhere

### Improved

- The classroom (step 2) and the export bar follow the same pattern as the seating plan when collapsed: the same icons, the same actions – and what only the expanded view used to show, the export title for instance, now sits behind a right click or a long press. Expanded and collapsed are the same controls at two densities
- Criteria your class has no data for no longer act unnoticed: their importance drops to 0 as soon as the sidebar hides them – even when "All criteria" or the defaults had set them before
- "Distractibility" can be used as soon as there is one student with concentration issues and at least one restless student in the class – it took two students with concentration issues before, although the criterion also governs the distance to restless classmates. The sidebar and the shuffle history show the higher of its two weights for it
- New preview screenshots on the start page – they show the reworked state of the app

### Fixed

- Names that would look the same on the tables are now told apart everywhere: "Frida Ehrmann" and "Frida Emmerich" become "Frida Eh." and "Frida Em." – in the seating plan, in presentation mode, in the seating circle, in print and in every export. A name is only lengthened as far as telling it apart requires; all other names stay the way you set them
- The hint below the name display in the view settings now says how many names were lengthened to tell them apart – and, separately, how many students carry the same full name and therefore cannot be told apart. Before, it only counted duplicate first names
- In the shuffle history under "Plans, shuffles & neighbourhoods", the names of the criteria were always in German, in the English interface as well

## [2.1.1] - 2026-09-16

### Improved

- The start page loads faster and with far less data: the preview screenshots come in the size they are shown at instead of as originals almost 3,000 pixels wide, and only the visible screenshot and the next one load instead of all six at once. The font is requested earlier, and text no longer shifts once it has arrived
- For offline use, a first visit stores about 4 MB in the background instead of almost 16 MB – the screenshot originals, which the app never shows, are no longer part of it
- The backup, the CSV import and "Alle Pläne anzeigen" load the first time they are used, so every page starts with over a tenth less to download
- Accessibility: the dots under the start page preview are easier to hit, and screen readers and voice control know the logo link by the word it shows – "Klassenplan – Zur Startseite" instead of "Zur Startseite"
- Updated dependencies

### Fixed

- On a first visit, German pages showed up in English for a moment before switching to German. The language now follows the address alone: English under `/en`, German everywhere else

## [2.1.0] - 2026-09-16

### Added

- Klassenplan can be tried without data of your own: "Beispielklasse laden" – in the empty class list and in the "Hinzufügen" menu – creates a class with 24 invented students, drawn pictures and a furnished classroom. It is an ordinary class and can be deleted like any other. Once it exists, the button switches to it instead of creating a second one
- On the first visit, a short tour points out the most important controls of the class list, the classroom and the seating plan – from the backup behind the settings gear in the footer to the sidebar, the view settings, the statistics and the seating circle. It can be switched off and started again from the help dialog at any time. The sidebar now starts collapsed on a first visit – the tour and the help dialog show how to expand it

### Removed

- The "Verfeinern" (refine) button in the seating plan. Measurements showed that refining a shuffled plan a second time does not reliably make it better – a point or two for 24 students, at times even worse for 36. "Mischen" still refines the plan automatically as soon as a criterion is active
- The shortened name shown next to long names in the class list. How names appear on the tables – first name only, first name + last-name initial, or first and last name – is chosen in the view settings instead

### Improved

- Various adjustments: "Clear all data" also removes the student photos right away, "Deutsch als Zweitsprache" is recognised as a language level on CSV import, the shuffle history keeps the refined plan, the two performance criteria can no longer apply at the same time, and self-hosted instances can link their own legal notice and privacy policy – plus internal clean-up and revised documentation

## [2.0.4] - 2026-09-09

### Added

- Class lists exported from WebUntis, Schulmanager Online and SchILD-NRW are recognised on import. The dialog names the format it found, preselects the sensible name column and can import the file without the preset if the recognition is wrong
- An export holding several classes now asks which class to import, instead of stopping at the 36-student limit
- "Check for updates" in the footer asks the server for a new version on the spot and offers the reload right away, instead of leaving it to the next visit

### Fixed

- CSV files saved on Windows are read with the right encoding – umlauts no longer arrive as replacement characters
- A column named "Name" next to a "Vorname" is read as the surname, the way WebUntis and most German school exports label it. "First name + last name" was impossible to pick for those files before
- A title line above the header row ("Schülerliste 5a – Stand …") no longer breaks the import
- Names written as "Müller, Anna" in a single column are imported as "Anna Müller" – only when every row of the file follows that pattern
- The "New version available" notice vanished after about a millisecond instead of waiting to be clicked: a toast meant to stay open was handed a duration `setTimeout` cannot represent

### Improved

- Column headings are matched regardless of how umlauts are spelled ("Vordere Plätze" and "Vordere Plaetze" both work), and the export spellings "Langname", "Familienname", "Zuname", "Rufname" and "Schüler" are understood
- The hint shown for an empty class, the format example and the FAQ now say that a list from WebUntis, Schulmanager or SchILD can usually be uploaded unchanged, instead of only pointing at the template to fill in by hand
- A tab left open – on the projector for a whole school day, say – checks for a new version once an hour, when it becomes visible again and after the connection returns. Before, that only happened on page load
- Updated dependencies

## [2.0.3] - 2026-09-08

### Improved

- On phones, a jump button in the class list takes you down to the "Continue" button at the end and back up to the top again – it only went down before. The system setting for reduced motion is honoured

### Fixed

- Presentation mode now frames only the furnished part of the room instead of always the whole 900×600 one: the names get as large as the device allows – most noticeably on tablets held in portrait
- "Who's next?": the spotlight radius follows the seat instead of being a constant, so it highlights a single student at group tables again instead of three at once
- The toolbars in presentation mode wrap on narrow screens instead of running past the edge: the student and teacher views show as icons there, and the back button moves to a row of its own
- In the class list's bulk selection, the eight trait switches wrap on phones instead of overflowing the card; so do the tabs under "Plans, shuffles & neighbourhoods"
- The bars for saving, presenting and exporting – in the seating plan as well as the seating circle – wrap cleanly on narrow screens, and button labels are no longer broken mid-word
- Sidebar and canvas in steps 2 and 3 take their direction from the same source that decides rail vs. phone sheet, so a tablet no longer stacks the rail on top of the canvas
- The sort order of the class list survives leaving step 1 and coming back. Search and filter still reset on purpose – they hide students, and a hidden class on return would read as data loss

## [2.0.2] - 2026-09-05

### Fixed

- Menus with an input field could not be typed into on phones and tablets: opening the on-screen keyboard is what repositions the menu, and repositioning took the focus off the field, closing the keyboard again. Affects "Add" in the class list as well as search and filter
- Opening a menu reliably puts the cursor in its first field or on its first entry

## [2.0.1] - 2026-09-05

### Added

- **Plan usage record** – Klassenplan quietly notes which seating plans were really in use, derived from presenting, printing/exporting, saving under a chosen name and rearranging seats by hand. Nothing has to be ticked, only seating neighbourhoods and timestamps are stored, and everything stays on the device
- **"Who has sat next to whom"** – a third tab in the plan history ranks the pairs that have shared a table, with the date they last did and the plans the evaluation rests on; individual plans can be excluded
- **Backup reminder** – a notice when the last backup is more than 30 days old; it can be postponed or switched off for good
- **Persistent browser storage** – creating the first class asks the browser to exempt the data from its automatic clean-up, and a warning appears when storage runs low

### Improved

- More compact work in the class list – a tidied-up class bar, a new menu for adding students, and space-saving controls for search, filter and sorting
- Tablets in portrait now show the sidebar and the classroom at the same time; drag areas follow the input method instead of the window width
- "Optimize" is now called "Refine" – the name describes better what the function does
- The export remembers whether needs and connection lines are printed, and the PDFs have their own shortcuts (`Ctrl/Cmd+Shift+T` for the seating plan, `Ctrl/Cmd+Shift+C` for the seating circle)
- Extended FAQ – how data can be lost, how to take it to a new device, how often a backup makes sense, and how the repetition avoidance works
- Linguistically reworked texts throughout the app, more consistent terms and clearer hints
- The offline notice shrinks to an icon after a moment
- The traffic-light colors of the statistics display are stricter: green from 80 %, yellow from 50 %
- Updated dependencies

### Fixed

- Escape now closes only the topmost dialog and no longer the view underneath
- The grid setting takes effect in all views immediately

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
