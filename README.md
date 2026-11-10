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

### Committee registration form

The form at `/join` follows the committee's official recruitment form. Its questions, options and rules live in `src/lib/committee-registration.ts`, which the page, the API routes (`src/app/api/committee-registration`) and the admin review page all share, so a change there applies everywhere and the form and the server always check the same things.

**Positions.** An application gives a first and a second choice, which must differ. A choice is either a Top Committee position (General Secretary, General Treasurer) or a department. When a department is among the choices the applicant also gives one department position: Head of Department, 1st Deputy Head, 2nd Deputy Head or EXCO Member.

**What is open.** Under **Committee Registration** in the admin console, admins open and close the form, set the term, deadline and introduction, and tick which positions take applications: each Top Committee position, and each of the four positions in each department separately. Nothing is open until it is ticked. Applicants are only offered what is open, and the server refuses anything else. Because the form has a single department position, an applicant who chooses two departments is offered the positions open in both.

**Where it is stored.** The server stores applications in the `committee_applications` Firestore collection, and the formal picture and supporting document in the private `committee-applications/` Storage folder; browsers cannot reach either. Firestore has no fixed schema, so new questions need no migration. Records from the earlier form lack the newer answers, and the admin page shows what they have.

**Photo uploads.** A formal picture can be up to 10 MB, more than the website's server accepts in one request (Vercel's limit is 4.5 MB), so the browser sends it straight to Storage:

1. `POST /api/committee-registration/photo-upload` checks the whole application and writes a ticket to `committee_upload_tickets`.
2. `storage.rules` lets the browser create the one file that ticket describes under `committee-application-uploads/`, and nothing else. It reads the ticket from Firestore, so deploying the rules needs Firebase's cross-service rules permission, which `firebase deploy` offers to grant the first time.
3. On submission the server reads the upload, confirms it is a real JPG, PNG or WebP image, re-encodes it as a JPEG and files it with the application, then deletes the upload and its ticket.

Uploads that are never submitted expire after 15 minutes and are cleared when the next applicant starts an upload. The supporting document (one file, up to 3 MB) still travels with the form.

**Tests.** `tests/unit` covers the rules of the form, `tests/rules` the Storage and Firestore rules, and `tests/e2e/join.spec.ts` the form in a browser. Its first group stubs the API; its second group submits for real and only runs against the emulators:

```bash
npm run test:rules
npm run dev:emulators -- npx playwright test tests/e2e/join.spec.ts
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
