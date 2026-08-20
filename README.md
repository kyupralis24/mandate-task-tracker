# Mandate Status Tracker

A compact GitHub Pages front end backed by Google Sheets through Google Apps Script.

## Set up Google Sheets
1. Create a Google Sheet and open **Extensions > Apps Script**.
2. Replace the editor contents with `Code.gs` from this package and save.
3. Select `setupSheet` in the function dropdown and click **Run** once. Approve permissions.
4. The `Tasks` tab is created and formatted automatically.

## Deploy Apps Script
1. In Apps Script choose **Deploy > New deployment**.
2. Type: **Web app**.
3. Execute as: **Me**.
4. Who has access: the broadest option your Workspace policy permits. For a GitHub Pages site without Google sign-in logic, anonymous access is required.
5. Deploy and copy the URL ending in `/exec`.
6. Paste that URL into `config.js`.

When Code.gs changes, use **Deploy > Manage deployments > Edit**, create a new version, and redeploy. Keep the same `/exec` URL.

## Publish on GitHub Pages
1. Create a repository and upload `index.html`, `styles.css`, `app.js`, and `config.js` to the repository root.
2. Open **Settings > Pages**.
3. Select **Deploy from a branch**, branch `main`, folder `/ (root)`, then Save.

## Sheet columns
Do not rename or reorder the columns: ID, Task, Owner, Priority, Status, Progress, Latest Update, Created At, Updated At.

## Important access note
If the Apps Script deployment allows anonymous access, anyone who obtains its URL can read or change task data. Do not store confidential, personal, regulated, or client-sensitive information in this version. For stricter access, use an authenticated backend or host the interface inside Apps Script/Google Workspace.
