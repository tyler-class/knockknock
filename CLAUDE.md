# Knock Knock

Conventions for working on Knock Knock, shared with the owner's other self-hosted Cloudflare apps.

Knock Knock has its **own visual language** (black, white and hi-vis yellow; Archivo, Geist and
Geist Mono; hard 1.5px ink borders; stepped extrusion shadows; the glass tab bar). Don't bring in
styling from the sibling apps (soft pills, circle icon buttons, tinted icon circles, hover shades,
focus rings, grain): the rules below are about workflow, behaviour, wording and data only. Match
this app's existing look for anything new.

## Workflow

- Start with `git pull --ff-only`.
- Every round of changes gets a new version number, without being asked: when you start making
  changes after the last push to `main`, bump the patch version in `package.json` first
  (0.1.0 → 0.1.1), so each push ships under its own version. Bump minor or major only when the
  owner asks. Mention the new version when you report or push.
- The MCP server reports `package.json`'s version (`src/worker/mcp.ts` imports it; a test in
  `test/api/mcp.test.ts` checks they match). Don't hard-code it.
- Verify with typecheck, lint, tests and `curl`; don't open a browser unless the owner asks.
- Push to `main` only when the owner says so. Deploying (`npm run deploy`) is a separate step,
  also only when asked.
- Files headed "Selfhost Kit: synced from tyler-class/selfhost-kit" (`src/*/kit/*`,
  `scripts/release.ts`, `.github/workflows/update.yml`) are overwritten by the kit's sync: make
  those changes in the kit, not here.

## Behaviour

- A sheet and its backdrop open and close together (nothing pops in or out partway), and
  `prefers-reduced-motion` turns motion off.
- If drag to reorder is added: start it after a short press on touch so a swipe still scrolls,
  support the keyboard, show the new order straight away and put the old one back if saving fails,
  and don't animate the dropped item back to where it started.
- Removing or changing something that can be undone (deleting an event, story or application,
  changing a status) shows a toast with **Undo** (the toast already supports an action). Keep the
  two-tap confirm only where undo isn't possible. Status changes undo by deleting the status
  events they wrote (status is derived from the timeline), and archiving a story undoes by
  unarchiving. Deleting an application, event, story or search is still a hard delete (it
  cascades to timelines, notes, copies and files), so those keep the two-tap confirm until the
  API can restore them.
- A filter shows the same choices and counts everywhere the same data appears: count in
  `src/client/lib/filters.ts`, not inline.
- An application, event or story is changed the same way wherever it appears: one shared sheet
  (`useSheets()`), as now.
- After a save, everything on screen updates straight away; nothing needs a reload.
- View choices (Pipeline view, stage and search; Stories filters) are remembered on the device, and
  put in the address when it makes sense to bookmark or share the view (`useViewState` in
  `src/client/lib/viewState.ts`; the address wins when present).
- A list or column with nothing in it is hidden or says clearly that it's empty.
- Phones: text wraps rather than running off the edge where the full text matters; notes fields
  grow with the text (`AutoTextarea` in `components/ui.tsx`). The pasted posting and pasted
  transcript fields stay fixed-height on purpose: they hold very long text.

## Wording

- Product nouns are capitalized; group headings are plural where they name a kind of thing.
- Ranges of times read "2:00 to 2:45 PM", not with a dash.
- Relative times are compact: "3h ago", "3d ago".

## Assistants (MCP)

- Archived or hidden things (archived stories, and archived searches if added) stay out of the
  normal tools. Give them a dedicated tool that finds them, says they're archived and how to bring
  one back if the owner asks (e.g. `update_story` with `archived: false`), and say so in the
  server's instructions. Archived stories have `list_archived_stories`.
- `find_applications` looks in the current search unless `all_searches` is true, and says how many
  more matches sit in past searches.
