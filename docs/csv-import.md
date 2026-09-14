# CSV Import Format

> **Status:** current · **Last reviewed:** 2026-09-14 · **Source of truth:**
> `src/utils/csv/`, `src/utils/data/csvUtils.ts`, `src/services/csvImportService.ts`

Which files the class list import accepts, how it recognises columns, and how
cell values become student attributes. The format is a contract with the
spreadsheets teachers keep and the exports school software produces: a change
must keep files that imported yesterday importing today.

## Pipeline

1. **File type.** Accepted are files ending in `.csv` or reported as a CSV MIME
   type (including `application/vnd.ms-excel`, which Windows uses for CSV).
   Anything else gets a specific explanation: Excel, other spreadsheets, a
   backup JSON, plain text, documents or images.
2. **Encoding.** A UTF-8 byte order mark settles it. Otherwise the first 512 KB
   are decoded as strict UTF-8; if that fails, the file is read as
   `windows-1252` and the teacher is told so — umlauts are where a wrong guess
   would show.
3. **Parsing** with Papa Parse (`header: true`, `skipEmptyLines`, automatic
   delimiter). Headings are trimmed and lower-cased. Title lines above the real
   header row ("Schülerliste 5a — Stand …") are dropped: when one of the first
   five lines has at least two cells and a known heading, everything above it
   goes. A file whose first line already qualifies, or where no line does, stays
   untouched.
4. **Analysis** (`analyzeCsvFile`) checks the structure, detects name columns,
   a known export format and the classes in the file, and hands the first 50
   rows to the import dialog.
5. **Teacher's choices** (`CsvImportSelection`): which name column(s), which
   class, whether to apply the recognised format.
6. **Import** (`parseCsvFlexible`): apply the format preset, keep the chosen
   class, reject more than 36 rows, map every row, resolve partner names, and
   accept as many students as the class still has room for.

Files of 40 KB or more are parsed in a dedicated worker
([worker-protocol.md](worker-protocol.md#csv-worker)); smaller ones on the main
thread.

## Matching headings

Every comparison goes through `normalizeHeaderKey`: Unicode NFC, lower case,
`ä → ae`, `ö → oe`, `ü → ue`, `ß → ss`, remaining accents stripped, then
everything except `a–z` and `0–9` removed. "Vordere Plätze", "vordere plaetze"
and "Vordere-Plaetze" all become `vordereplaetze`. The lists below are written
in that normalised form.

### Name columns

| Kind       | Headings                                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------------------------ |
| First name | `vorname`, `vornamen`, `rufname`, `firstname`, `givenname`, `forename`                                       |
| Last name  | `nachname`, `nachnamen`, `familienname`, `langname`, `zuname`, `lastname`, `surname`, `familyname`           |
| Full name  | `name`, `fullname`, `schueler`, `schuelerin`, `schuelername`, `vollstaendigername`, `student`, `studentname` |

- A `name` column next to a first-name column and without a last-name column is
  read as the **surname** — that is how WebUntis and most German school exports
  label it.
- When the file has two or more kinds, the dialog asks: first name, last name,
  first and last name combined, or the ready-made name column.
- When **every** filled name reads "Nachname, Vorname" (exactly one comma), the
  names are turned around to "Vorname Nachname". A single cell with a comma
  changes nothing.
- Names are sanitised: Unicode NFKC, `<script>`/`<style>` blocks and HTML tags
  removed, control characters replaced, whitespace collapsed, cut to 120
  characters (`MAX_STUDENT_NAME_LENGTH`). Rows without a name are skipped.

### Class column

`klasse`, `klassen`, `klassenbezeichnung`, `stammklasse`, `lerngruppe`, `class`.
When it holds more than one distinct value, the dialog asks which class to
import. That filter runs before the size check, so a whole-school export is not
rejected for being too large.

### Attribute columns

The template headings come from `csvSchema.ts`; the aliases from
`csvColumnVocabulary.ts`. When several accepted headings are present, the first
non-empty cell wins.

| Attribute             | Template heading (DE / EN)       | Also accepted                                                                                     | Values        |
| --------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------- | ------------- |
| `restless`            | Unruhig / Restless               | `unruhig`, `restless`                                                                             | yes/no        |
| `shy`                 | Schüchtern / Shy                 | `schuechtern`, `shy`                                                                              | yes/no        |
| `concentrationIssues` | Ablenkbarkeit / Distracted       | `ablenkbarkeit`, `konzentration`, `distracted`, `distractible`                                    | yes/no        |
| `needsFrontSeat`      | Vordere Plätze / Front row       | `vordereplaetze`, `hoerundsehschwaeche`, `hoerschwaeche`, `sehschwaeche`, `frontrow`, `frontseat` | yes/no        |
| `prefersWindow`       | Fensterplatz / Window seat       | `fensterplatz`, `amfenster`, `fenster`, `windowseat`, `window`                                    | yes/no        |
| `prefersDoor`         | Türplatz / Door seat             | `tuerplatz`, `andertuer`, `tuer`, `doorseat`, `door`                                              | yes/no        |
| `performanceStrong`   | Leistungsstark / High performer  | `leistungsstark`, `highperformer`, `strong`                                                       | yes/no        |
| `performanceWeak`     | Leistungsschwach / Low performer | `leistungsschwach`, `lowperformer`, `weak`                                                        | yes/no        |
| `gender`              | Geschlecht / Gender              | `geschlecht`, `gender`                                                                            | see below     |
| `height`              | Körpergröße / Height             | any heading **containing** `height`, `groesse`, `grosse`                                          | see below     |
| `languageSkill`       | Sprachniveau / Language level    | any heading **containing** `sprachniveau`, `sprache`, `language`, `deutschkenntnisse`             | see below     |
| `socialRole`          | Soziale Rolle / Social role      | any heading **containing** `sozialerolle`, `rolle`, `role`, `social`                              | see below     |
| special needs         | —                                | `besonderebeduerfnisse`, `besonderheiten`, `specialneeds`                                         | see below     |
| wish partners         | Wunschpartner / Wish partner     | `wunschpartner`, `wishpartner`, `preferredpartner`                                                | up to 3 names |
| avoid partners        | Distanzwunsch / Avoid partner    | `distanzwunsch`, `distanzpartner`, `avoidpartner`                                                 | up to 3 names |

For the headings matched by substring, the first column in the file whose
heading contains a pattern is used.

**Values.** Unrecognised values leave the attribute unset; they are never an
error.

- **Yes/no:** `ja`, `yes` or `1`, case-insensitive. Anything else is "no". A
  student marked both high and low performer ends up as neither.
- **Gender:** `mädchen`, `girl`, `female`, `w`, `weiblich`, `f`, `frau` and any
  value starting with `w` → girl; `junge`, `boy`, `male`, `m`, `männlich`,
  `mann` → boy; `divers`, `diverse`, `d`, `non-binary`, `nonbinary`, `nb` →
  diverse.
- **Height:** a number is read as centimetres (values up to 3.5 as metres):
  up to 150 → small, 175 and above → tall, otherwise medium. Words: `klein`,
  `kurz`, `short`, `small`, `s`, `xs` → small; `mittel`, `medium`, `average`,
  `normal`, `m` → medium; `groß`, `tall`, `lang`, `hoch`, `l`, `xl` → tall.
- **Language level:** matched by substring, checking the levels in this order:
  DaZ support (`daz`, `daf`, `zweitsprache`, `fremdsprache`, `forderung`,
  `language support`), native (`muttersprache`, `native`, `deutsch`), fluent
  (`fliessend`, `fluent`, `c1`, `c2`), intermediate (`fortgeschritten`,
  `intermediate`, `b1`, `b2`), beginner (`anfanger`, `beginner`, `a1`, `a2`).
  The first match wins. Support comes first because its markers are more
  specific than `deutsch`: "Deutsch als Zweitsprache" is a DaZ student, plain
  "Deutsch" a native speaker. (Until 2026-09-14 native was checked first, and
  such cells were read as native.)
- **Social role:** `mediator`, `vermittler`, `schlichtend`, `beruhigend` →
  mediator; `anführer`, `leader` → leader; `einzelgänger`, `loner`,
  `introvertiert` → loner; `mittelpunkt`, `social hub`, `beliebt`, `popular` →
  social hub; `neutral`, `keine`, `none` → no role.
- **Special needs:** a comma-separated list. `unruhig`/`restless`,
  `schüchtern`/`shy`, `konzentration`/`ablenkbarkeit`/`distracted`,
  `leistungsstark`/`high performer`, `leistungsschwach`/`low performer` set the
  matching flag; any entry containing `hör`, `seh`, `brille` or `front` sets
  `needsFrontSeat`.
- **Partners:** comma-separated names, matched case-insensitively against the
  names **in the same file**. At most three per student; the student's own name
  and unknown names are dropped.

## Known export formats

A preset recognises an export and translates it into the vocabulary above —
it is never a second parser. The teacher sees which format was found and can
import without it.

| Preset              | Required headings               | At least one of                                                                               | Translation                             |
| ------------------- | ------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------- |
| WebUntis            | `langname`, `vorname`           | `kurzname`, `externername`, `externeid`, `schuelernummer`, `eintrittsdatum`, `austrittsdatum` | —                                       |
| Schulmanager Online | `nachname`, `vorname`, `klasse` | `strasse`, `plz`, `ort`, `telefon`, `anrede`, `mobil`                                         | —                                       |
| SchILD-NRW          | `nachname`, `vorname`           | `jahrgang`, `schuelerid`, `fachklasse`, `schulnummer`, `statistikkennzeichen`                 | `geschlecht`: `3` → m, `4` → w, `6` → d |

The best-scoring preset wins (two points per required heading, one per
additional hit). The heading rename tables are deliberately empty: they were
written without a real export at hand, and a wrong rename would silently feed
the wrong column into the seating plan. Filling them in once a genuine export
confirms the headings is a data change in `csvPresets.ts`, not a code change.

## Limits and error messages

- **36 students** (`MAX_STUDENTS`): a file with more rows — after the class
  filter — is rejected. When the class has fewer free places than the file has
  students, the first ones are imported and the teacher is warned.
- Problems are reported with a specific message key in the `toast` namespace
  (`csv.emptyFile`, `csv.delimiterMismatch`, `csv.noNameColumn`,
  `csv.noHeaderRow`, `csv.noRows`, `csv.noNames`, `csv.tooManyRows`, the
  `csv.fileType*` family). They stay on screen for 12 seconds and offer the
  format example where it helps (`csvImportDiagnostics.ts`).
- A single column containing `;`, a tab or `|` is reported as a delimiter
  problem; headers that match nothing known as a missing header row rather than
  a missing name column.

## Template and export

`csvSchema.ts` is the shared column contract: the downloadable template
(`klassenliste_vorlage.csv` / `class_list_template.csv`, headings in the UI
language, comma-separated, five example rows) and the student export both use
it. Its values are plain strings, not translation keys, because they are part
of the file format. Tests round-trip the template through the parser, so a
heading or value that the import cannot read fails the build.
