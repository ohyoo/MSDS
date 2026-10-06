# Deployment

The application is a standalone, static-exported Next.js site that can be linked from the existing MSDS website. Its deterministic guide and all browsing/planning features work entirely in the browser. An optional AI-backed guide runs as a separately hosted Node.js service; it is not needed for GitHub Pages.

## Release prerequisites

Use Node.js 22 or later. Review academic content before publishing an official advising resource: confirm source freshness, recommended versus specialty elective membership, and program review of interpretive summaries and pathway mappings. Per-record `sourceVerification` and `lastChecked` distinguish verified metadata from pending facts; unknown requirements remain unknown.

Build and validate the exact checkout to be deployed:

```sh
npm ci
npm run validate-data
npm run typecheck
npm run lint
npm run test
npm run build
```

Run browser smoke tests when Chromium and its system dependencies are available:

```sh
npm run test:e2e
```

In the Codex cloud environment, replace `npm ci` with `npm ci --cache /workspace/.npm-cache`; Playwright uses `/usr/bin/chromium`. On another machine, install Chromium with `npx playwright install chromium` and the documented system dependencies if necessary. Dependency installation, compilation, and schema validation do not independently verify academic accuracy.

## GitHub Pages: primary publishing workflow

The repository includes `.github/workflows/pages.yml`. A push to `main` or manual workflow dispatch validates data, runs unit tests and lint, builds the static site using Node.js 24 and `NEXT_PUBLIC_BASE_PATH=/MSDS`, and deploys `out/` through GitHub Pages.

1. In the repository, open **Settings → Pages** and set **Source** to **GitHub Actions** if it is not already configured.
2. Push the reviewed changes to `main`, or run **Publish Curriculum Explorer** from the **Actions** tab.
3. Inspect the build and deploy job results. The workflow publishes the expected project URL: <https://ohyoo.github.io/MSDS/>.
4. Verify that URL directly, including assets, navigation, source links, course details, search, shortlist, guide, and mobile layout.

GitHub Pages does not host the optional Node.js guide service. The default deterministic guide remains fully available. To connect a separately deployed service, add its public URL to the workflow's build environment as `NEXT_PUBLIC_MSDS_GUIDE_ENDPOINT`; never add an API key to public build variables. Rebuild to change this endpoint.

For a custom domain or a different repository name, adjust `NEXT_PUBLIC_BASE_PATH` to the actual hosting path. A domain-root deployment uses an empty base path. Do not reuse the `/MSDS` build at a different path.

## Preview the exact Pages build

```sh
NEXT_PUBLIC_BASE_PATH=/MSDS npm run build
NEXT_PUBLIC_BASE_PATH=/MSDS npm run start
```

Open <http://localhost:3000/MSDS/>. `npm run start` uses the included static-file preview server; `PORT` defaults to `3000`. The server binds to `0.0.0.0`. For a domain-root preview, leave `NEXT_PUBLIC_BASE_PATH` unset for both the build and server.

The deployable files are in `out/`. Any ordinary static HTTPS host can serve them. Content changes require a new build and deployment. Catalog refreshes happen in a development/maintenance checkout, where their output can be reviewed, rather than inside web requests.

## Vercel

1. Import the Git repository as a Next.js project.
2. Select a Node.js version satisfying `package.json` (`>=22`). Use the normal `npm run build` command and framework defaults for the output directory.
3. Use an empty `NEXT_PUBLIC_BASE_PATH` for a domain-root deployment. If desired, set `NEXT_PUBLIC_MSDS_GUIDE_ENDPOINT` to a separate public guide service URL at build time.
4. Deploy a preview and check navigation, course details, source indicators, mobile layout, guide fallback, and elective interactions.
5. Publish the reviewed release to the production domain.

Vercel is an alternative deployment path; the included publishing automation targets GitHub Pages.

## Cloudflare

Cloudflare Pages can host the current `out/` static export with build command `npm run build`. Use an empty `NEXT_PUBLIC_BASE_PATH` for a domain-root site. The browser guide remains functional without a Worker.

The optional guide service uses Node.js HTTP APIs and is not preconfigured as a Cloudflare Worker. A future full-server Next.js deployment would require an adapter such as OpenNext for Cloudflare and separate runtime verification. That adapter is not required for the current static site.

## Optional provider configuration

| Variable           | Meaning                                                                                                     |
| ------------------ | ----------------------------------------------------------------------------------------------------------- |
| `MSDS_AI_API_KEY`  | Provider credential, supplied only to the server                                                            |
| `MSDS_AI_ENDPOINT` | HTTPS OpenAI-compatible chat-completions endpoint; defaults to `https://api.openai.com/v1/chat/completions` |
| `MSDS_AI_MODEL`    | Provider model identifier; defaults to `gpt-4.1-mini`                                                       |

Use secure environment settings on the separate guide host. Never commit `.env.local`, include values in documentation, or use a `NEXT_PUBLIC_` secret. Restrict provider network access to the configured destination where the host supports that control.

The service runs with:

```sh
npm ci
npm run guide:serve
```

Host-provided environment variables are read at startup. For a local `.env.local` file, load it explicitly:

```sh
node --env-file=.env.local --import tsx server/guide-server.ts
```

It listens on `0.0.0.0` at `MSDS_GUIDE_PORT` (default `8787`) and accepts `POST /api/guide`. Configure comma-separated `MSDS_ALLOWED_ORIGINS` to the exact allowed browser origins; the default is `http://localhost:3000,https://ohyoo.github.io`. An origin excludes path components, so the GitHub Pages origin is `https://ohyoo.github.io`, not `https://ohyoo.github.io/MSDS/`. Serve it through HTTPS in production, and apply suitable rate/cost controls at the host before exposing a paid provider publicly.

For local testing, set `NEXT_PUBLIC_MSDS_GUIDE_ENDPOINT=http://localhost:8787/api/guide` in `.env.local`, then restart development or rebuild the static site. For production, use the full HTTPS URL ending in `/api/guide`. This URL is public; provider credentials remain exclusively on the guide server.

The provider must accept JSON response formatting. The app validates its response as existing context course codes and a permitted follow-up enum, then produces all explanatory text and links from local data. Missing credentials, invalid output, request failures, and an eight-second timeout retain deterministic functionality. Live provider integration remains unverified until tested with an authorized credential.

## Operational checks and privacy

After deployment, verify the static homepage and guide through the application UI. If configured, separately verify the external guide endpoint and permitted-origin behavior. Confirm unknown metadata is visibly unknown, source links open the intended UConn pages, advisory language is available, and the guide works with no AI key.

The app saves course-code shortlists in browser local storage, not on the server. It does not persist guide questions or ask for personal records. A configured provider receives the submitted question and minimal relevant local content; review that provider's policies before enabling it for students. Host access logs and analytics, if added by the deployment platform, require their own review. Do not configure request-body logging for the guide endpoint.
