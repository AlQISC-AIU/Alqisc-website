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

Environment configuration is required locally and on the deployment platform. Private configuration values must not be committed to the repository.

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
