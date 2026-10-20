# JobHunt

Personal job discovery dashboard built with Next.js App Router, Prisma, Supabase PostgreSQL, Tailwind CSS and Lucide. It imports real public listings from configured Greenhouse and Lever boards, permitted JSON Feeds, Remotive, Himalayas, and Arbeitnow. It never submits applications.

## Setup

1. Install Node.js 20.9+ and enable Corepack. Run `corepack yarn install` (or `yarn install` when Corepack provides Yarn on your PATH).
2. Create a Supabase PostgreSQL database. Copy `.env.example` to `.env.local` and set `DATABASE_URL`, `DIRECT_URL`, a random `CRON_SECRET`, and your chosen `APP_PASSWORD`. Use the Supabase transaction pooler for `DATABASE_URL` and direct connection for `DIRECT_URL`.
3. Also make these variables available to Prisma CLI in `.env` or your shell. Run `corepack yarn db:migrate` and `corepack yarn db:seed`.
4. Run `corepack yarn dev`, open `http://localhost:3000`, and select **Refresh jobs**.

For Vercel, set the same four environment variables and deploy. In GitHub Actions, set `APP_URL` to the deployed site and `CRON_SECRET` to the matching secret. The included workflow calls `/api/sync` every six hours. Vercel function duration must allow enough time for configured boards; the route sets `maxDuration = 300`.

## Data behavior

- A provider and external ID uniquely identify a listing. A normalized original URL or company, title and location key catches cross-provider duplicates.
- Eligibility is an estimate based on stated geography. A generic “remote” label remains **unknown**. Check the original listing before applying.
- Scores are deterministic matches against saved preferences. Missing facts are omitted from the score denominator rather than treated as negative. Country restrictions cap the score.
- Greenhouse list responses often omit a publication timestamp, so those jobs show when first discovered. Lever also does not consistently supply publication dates. Remotive and Arbeitnow dates come from their public responses.
- A sync failure leaves existing jobs intact and is recorded under Settings. There are no placeholder jobs.
- Discovery imports and displays remote roles only. Jobs first discovered more than seven days ago are removed during each scheduled sync unless saved or marked as applied. Saved jobs and application history remain available even when older or no longer listed by a provider.
- The application uses one password from `APP_PASSWORD`. It stays locked when that variable is missing. A successful login sets a seven-day HTTP-only session cookie; changing the password invalidates existing sessions. Use HTTPS and a password that is hard to guess.

## Provider references

- [Greenhouse Job Board API](https://docs.greenhouse.io/job-board): public per-company board GET endpoint, optional `content=true`.
- [Lever Postings API](https://github.com/lever/postings-api): public per-company, paginated postings endpoint.
- [Remotive API terms](https://remotive.com/remote-jobs/api): show Remotive attribution and send readers to the Remotive URL; its public feed is delayed by 24 hours.
- [Himalayas Remote Jobs API](https://himalayas.app/docs/remote-jobs-api): search remote listings eligible for Nigeria; show Himalayas attribution and use its `applicationLink` for Apply actions.
- [Arbeitnow public API](https://www.arbeitnow.com/api/job-board-api): public JSON feed with pagination links.
- [JSON Feed 1.1](https://www.jsonfeed.org/version/1.1/): add a company feed URL in Settings when the employer publishes job posts through this format and permits reuse. Items need a title and URL to appear as jobs.

The seeded company board identifiers were checked against their public career boards: [GitLab](https://job-boards.greenhouse.io/gitlab), [Remote](https://job-boards.greenhouse.io/remotecom), and [Sonar](https://jobs.lever.co/sonarsource). Add further public identifiers in Settings after verifying their career pages.
