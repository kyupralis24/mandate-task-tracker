# Mandate Status Tracker v2

## New functionality
- Light and dark modes, remembered in the browser
- Completed tasks remain visible by default
- Optional **Hide completed** toggle
- Management summary uses the current visible/filter view
- Inline status editing
- Clickable five-bar progress editing
- Archive, restore, and permanent deletion from the archive
- Duplicate task
- Manager-attention flag
- Decision/support request field

## Existing tracker upgrade
1. Back up your Google Sheet.
2. Replace the old Apps Script with `Code.gs`.
3. In Apps Script, select and run `upgradeSheetToV2` once.
4. Approve permissions if requested.
5. Use **Deploy > Manage deployments > Edit**.
6. Select **New version**, then deploy it.
7. Replace the four GitHub Pages files with `index.html`, `styles.css`, `app.js`, and `config.js`.
8. Preserve your existing `/exec` URL in `config.js`.

Do not run `setupSheet` on an existing tracker because it clears the Tasks sheet. Use `upgradeSheetToV2` instead.

## New sheet order
ID, Task, Owner, Priority, Status, Progress, Latest Update, Manager Attention, Decision / Support Required, Archived, Created At, Updated At

## Summary behaviour
The summary always uses the tasks visible under the current search, status, owner, and Hide completed settings. Completed tasks are included by default. When Hide completed is selected, completed tasks are omitted from both the table and generated summary.

## Deletion safety
Tasks are archived first. Permanent deletion is available only in the archive and requires confirmation.
