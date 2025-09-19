# QualityControl

This repository contains a single Create React App-based frontend for the Battery Quality Control system. 

Deployment link: https://battery-qc-system.web.app/

Quick start
1. Install dependencies:

```bash
npm install
```

2. Run development server:

```bash
npm start
```

3. Build for production:

```bash
npm run build
```

What is in this repo now
- `package.json` and `node_modules/` — Node project files and dependencies
- `src/` — React application source
- `public/` — static public assets and `index.html`
- `build/` — local build output (ignored by git typically)
- `.firebase/`, `.firebaserc`, `firebase.json` — Firebase CLI local state and config (ignored)
- `.github/` — CI/workflow definitions

Firebase configuration
- Firebase is initialized in `src/firebase.js`. For local development, put sensitive values in `.env.local` using `REACT_APP_FIREBASE_*` names (see below). `.env.local` is in `.gitignore` by default.

Recommended environment variables (add to `.env.local`):

- `REACT_APP_FIREBASE_API_KEY`
- `REACT_APP_FIREBASE_AUTH_DOMAIN`
- `REACT_APP_FIREBASE_PROJECT_ID`
- `REACT_APP_FIREBASE_STORAGE_BUCKET`
- `REACT_APP_FIREBASE_MESSAGING_SENDER_ID`
- `REACT_APP_FIREBASE_APP_ID`
- `REACT_APP_FIREBASE_MEASUREMENT_ID`

Notes and next steps
- `.firebase/` is ignored in `.gitignore` so local emulator state is not committed.
- If you want to preserve separate git history for the previous nested `frontend` repo, you'd need to use `git subtree` or `git filter-repo`. I flattened the tree into the root.

If you want me to run a build or wire additional CI, say which command you want me to run next.