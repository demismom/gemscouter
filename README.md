# Gem Scouter — GitHub Actions Setup

Fully automated eBay listing scout using GitHub Actions.
No Netlify, no backend, no servers. Just GitHub + the eBay API.

---

## How it works

```
Every hour, GitHub runs the scout automatically:

  GitHub Action
    → scripts/scout.js calls the eBay Browse API
    → fetches your 8 pinned items (licensed images + affiliate URLs)
    → searches all 6 categories for matching vintage/handmade items
    → filters out mass-produced results
    → saves everything to data/listings.json
    → commits the file back to your repo

  When someone visits gemscouter.com:
    → index.html loads
    → JavaScript fetches /data/listings.json
    → grid populates with real photos and affiliate links
```

---

## Setup (10 minutes)

### 1. Add these files to your gemscouter repo

Your repo should look like this after adding everything:

```
gemscouter/
├── index.html
├── package.json
├── .env.example
├── .gitignore
├── data/
│   └── listings.json        ← auto-updated by GitHub Action
├── scripts/
│   ├── scout.js             ← main script called by Action
│   ├── ebay-client.js       ← eBay API auth + calls
│   ├── filter-engine.js     ← authenticity scoring
│   └── scout-queries.js     ← what to search for
└── .github/
    └── workflows/
        └── scout.yml        ← GitHub Action definition
```

Commit and push everything.

---

### 2. Add your eBay credentials as GitHub Secrets

1. Go to your repo on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add these three:

| Name | Value |
|------|-------|
| `EBAY_CLIENT_ID` | Your Production Client ID from developer.ebay.com |
| `EBAY_CLIENT_SECRET` | Your Production Client Secret |
| `EBAY_CAMPAIGN_ID` | `5339145706` |

These are encrypted — GitHub never shows them in logs.

---

### 3. Trigger your first run

1. Go to your repo → **Actions** tab
2. Click **Scout Gems** in the left sidebar
3. Click **Run workflow** → **Run workflow**
4. Watch the logs — should take about 60 seconds
5. When it finishes, check `data/listings.json` in your repo

---

### 4. Check it works on your site

Visit `gemscouter.com` — within a minute of the Action completing,
your site will show real listings with real photos.

The Action also runs automatically every hour from now on.

---

## Testing locally before pushing

```bash
# Install dependencies
npm install

# Copy env file and add your credentials
cp .env.example .env
# Edit .env with your real keys

# Test auth works
npm run test-auth

# Run the full scout
npm run scout

# Check what was saved
cat data/listings.json | head -50
```

---

## Adding new pinned items

Edit `scripts/scout.js` and add the eBay item ID to `PINNED_IDS`:

```js
const PINNED_IDS = [
  '336428618001', // existing
  'YOUR_NEW_ITEM_ID', // add here
];
```

Commit and push — the next Action run will include it.

---

## Adding or changing categories

Edit `scripts/scout-queries.js`. Each entry has:
- `query` — what to search for
- `requireOneOf` — keywords that signal authentic/handmade
- `exclude` — keywords that disqualify a listing
- `limit` — how many results to fetch per run

---

## Troubleshooting

**Action fails with auth error**
→ Check your secrets are saved correctly in GitHub Settings

**listings.json is empty / no scouted items**
→ Check the Action logs (Actions tab → Scout Gems → latest run)
→ The filter may be too strict — loosen `requireOneOf` in scout-queries.js

**Images not loading on site**
→ The API returns licensed imageUrl values — they should load anywhere
→ Check the browser console for the actual URL being requested

**Site shows "Couldn't reach the collection"**
→ listings.json may not exist yet — trigger a manual Action run first
→ Or the JSON path is wrong — make sure data/listings.json is in your repo root
