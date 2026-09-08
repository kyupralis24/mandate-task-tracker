# Mandate Status Tracker

## GitHub Pages files
Upload these files to the repository root:

- `.nojekyll`
- `index.html`
- `styles.css`
- `app.js`
- `config.js`

`config.js` already contains the supplied Google Apps Script `/exec` URL.

## Google Apps Script

1. Open the Google Sheet.
2. Select **Extensions > Apps Script**.
3. Replace the existing Apps Script with `Code.gs` from this package.
4. If this is a new empty tracker, run `setupSheet()` once.
5. If upgrading the original 9-column tracker, run `upgradeSheetToV2()` once instead.
6. Select **Deploy > Manage deployments > Edit**.
7. Select **New version**, then click **Deploy**.
8. The deployment must execute as the sheet owner and allow the access level needed by the GitHub Pages site.

Do not run `setupSheet()` on a populated tracker because it clears and rebuilds the Tasks sheet.

## Required sheet columns

ID, Task, Owner, Priority, Status, Progress, Latest Update, Manager Attention, Decision / Support Required, Archived, Created At, Updated At

## GitHub Pages

Enable Pages under **Settings > Pages** using branch `main` and folder `/ (root)`.
After deployment, hard-refresh the site with `Ctrl + F5`.

## Important URL format

The API URL in `config.js` must be plain text inside quotes. It must not contain an HTML `<a href>` tag, `&quot;`, or other rich-text markup.
