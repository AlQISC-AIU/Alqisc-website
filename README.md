# AL-QISC Website

Official website for the Al-Qur'an and Islamic Club at Albukhary International University.

The website shares information about the club, its departments, programmes, classes, events, articles, and community activities.

## Development

Install the project dependencies:

```bash
npm install
```

Start the local development server:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

Environment configuration is required locally and on the deployment platform. Private configuration values must not be committed to the repository. `.env.example` lists every setting.

### Firebase

The website shares one Firebase project with the AL-QISC mobile app: `al-qisc-dev` for testing and `al-qisc-prod` for the live site. Events and announcements live in the app's feed (`public_content`), so whatever the admin publishes under **Events & Feed** shows on the website and in the app.

Run the whole site against local Firebase emulators, with sample data and no real project (needs Java 11+):

```bash
npm run dev:emulators
```

The emulator admin account is printed when it starts (see `scripts/seed-emulators.mjs`).

This repository is the only place that deploys the shared Firestore and Storage rules and indexes. A deploy replaces them for the website and the app at once, so the scripts run the rules tests first:

```bash
npm run test:rules         # emulator tests for firestore.rules and storage.rules
npm run deploy:rules:dev   # al-qisc-dev
npm run deploy:rules:prod  # al-qisc-prod
```

For correct canonical links, social previews, and sitemap URLs, configure:

```bash
NEXT_PUBLIC_SITE_URL=https://www.alqisc.com
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=verification-token-from-search-console
NEXT_PUBLIC_BING_SITE_VERIFICATION=verification-token-from-bing-webmaster-tools
```

After deployment, add the production domain in Google Search Console and submit
`https://your-production-domain.example/sitemap.xml`. Google has retired its old
sitemap ping endpoint, so Search Console is the supported submission method.

## Status

This project is under active development.
