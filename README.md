# Our Moments

**Our Moments** is a private web application for a couple to discover activities, save
ideas and memories, and keep track of important occasions and dates.

The application will use GitHub Pages for free static hosting and Supabase for free-tier
authentication, PostgreSQL storage, and authorization policies.

## Requirements Summary

### Core Use Cases

- Invite exactly two partners to a shared private workspace.
- Suggest an activity and let both partners mark interest or availability.
- Store information about places, recipes, gifts, trips, and other ideas.
- Record memories with optional text, dates, ratings, and images.
- Track important occasions such as anniversaries, birthdays, and reservations.
- Receive reminders for upcoming occasions.
- Search and filter saved items.

### Assumptions

- The first release is for one couple, but the data model should support a future
  multi-couple or subscription model.
- The app is a responsive web application for desktop and mobile browsers.
- Each partner has a separate account, while data belongs to a shared couple workspace.
- Email/password authentication is sufficient for the MVP; social sign-in may be added later.
- The app will use Supabase-hosted PostgreSQL and Supabase Auth.
- Hosting must remain on the GitHub Pages free tier.
- GitHub Pages serves static files and cannot run Next.js server code or API routes.
- Public source code is acceptable only if database data is protected by Supabase RLS policies.
- Images are compressed in the browser and stored in a private Supabase Storage bucket.

### Out of Scope for the MVP

- Public profiles or social sharing
- Real-time chat
- Calendar synchronization
- Push notifications
- Native iOS or Android applications
- Artificially generated suggestions
- Automated location or reservation booking

## Recommended Technology Stack

| Area | Choice | Reason |
| --- | --- | --- |
| Framework | React + Vite | Builds a static application that GitHub Pages can host |
| Language | TypeScript | Shared types and stronger maintainability across UI and server code |
| Hosting | GitHub Pages | Free static hosting through GitHub Actions |
| Data | Supabase PostgreSQL | Managed relational database with a free tier |
| Database access | Supabase JavaScript client | Direct, authenticated browser queries protected by RLS |
| Authentication | Supabase Auth | Secure accounts, sessions, email confirmation, and password recovery |
| Authorization | Supabase Row Level Security | Keeps one couple from reading or changing another couple's data |
| Styling | Tailwind CSS | Fast, consistent responsive UI with low CSS maintenance |
| Components | shadcn/ui and Radix UI | Accessible components that remain part of the application codebase |
| Forms and validation | React Hook Form and Zod | Typed forms and matching server-side validation |
| Testing | Vitest and React Testing Library | Fast unit and component tests |
| End-to-end testing | Playwright | Verifies critical browser workflows |
| Deployment | GitHub Actions | Builds and deploys every change made to the main branch |

## Scalable Architecture

Use a modular monolith for the MVP. It is simpler to operate than microservices while
still separating features and keeping future extraction possible.

- **Presentation:** React pages, layouts, and reusable UI components.
- **Application:** Feature-specific hooks and service boundaries.
- **Domain:** Types and rules shared by application features.
- **Infrastructure:** Supabase authentication, database access, storage, and email adapters.
- **API boundary:** Supabase queries and RPC functions protected by session checks and RLS.
- **Data:** Supabase PostgreSQL.

Start with a couple-scoped authorization model:

1. A user belongs to one couple workspace.
2. Every workspace resource has a `coupleId`.
3. Every query filters by the current user's authorized `coupleId`.
4. Mutations verify the couple relationship before writing.

This prevents an MVP account from becoming a security boundary that is difficult to correct later.

## Proposed Project Structure

```text
our-moments/
├── src/
│   ├── app/                    # Root routing and application providers
│   ├── assets/                 # Images and bundled assets
│   ├── pages/                  # Page-level React components
│   ├── main.tsx                # Browser entry point
│   └── styles.css              # Global and Tailwind styles
├── components/
│   ├── ui/                     # Generic reusable interface components
│   └── shared/                 # Layout, navigation, and cross-feature components
├── features/
│   ├── activities/             # Activity suggestions and decisions
│   ├── memories/               # Stored memories and personal information
│   ├── occasions/              # Important dates and reminders
│   ├── couple/                 # Couple membership and workspace settings
│   └── dashboard/              # Upcoming and recent content
├── lib/
│   ├── auth/                   # Session and authorization helpers
│   ├── supabase/               # Supabase client and database helpers
│   ├── email/                  # Email delivery adapter
│   ├── validation/             # Shared schema utilities
│   └── utils/                  # Small framework-independent helpers
├── supabase/
│   ├── migrations/             # Versioned SQL schema and RLS migrations
│   └── seed.sql                # Optional development seed data
├── public/                     # Static assets
├── tests/
│   ├── fixtures/               # Reusable test data
│   └── setup.ts                # Shared test setup
├── e2e/                        # Playwright browser workflows
├── .env.example                # Documented environment variable names
├── .github/workflows/          # GitHub Pages deployment workflow
├── vite.config.ts              # Vite configuration
├── tailwind.config.ts          # Tailwind configuration
├── tsconfig.json               # TypeScript configuration
└── package.json                # Scripts and dependencies
```

### Folder Responsibilities

- `app/` defines routes and layouts. Route handlers should contain no complex business logic.
- `components/ui/` contains low-level reusable controls.
- `components/shared/` contains navigation and visual elements shared across features.
- `features/` is the main feature boundary. Each feature owns its components, schemas,
  server actions, and tests.
- `lib/` contains adapters and infrastructure that features can reuse.
- `supabase/` owns SQL migrations and seed data.
- `tests/` and `e2e/` contain test support and automated browser checks.
- `.env.example` documents required configuration without exposing secrets.

## Core Dependencies

### Runtime

- `react`
- `react-dom`
- `react-router-dom`
- `typescript`
- `@supabase/supabase-js`
- `tailwindcss`
- `@radix-ui/*` components as selected
- `react-hook-form`
- `zod`
- `@hookform/resolvers`

### Development

- `vitest`
- `@testing-library/react`
- `@testing-library/jest-dom`
- `@playwright/test`
- `eslint`
- `@vitejs/plugin-react`
- `vite`
- `typescript-eslint`
- `prettier`
- `prettier-plugin-tailwindcss`

Pin versions through a lockfile and use a CI job to run linting, unit tests, migrations,
and the production build. Apply all package upgrades deliberately.

## Incremental Development Roadmap

### Milestone 1: Project Foundation

- Initialize React, Vite, TypeScript, Tailwind, ESLint, and Prettier.
- Configure public environment variables for the Supabase project URL and publishable key.
- Add a baseline health page and unit test.
- Configure Vitest and Playwright.
- Create the GitHub Pages deployment workflow.
- Configure the Vite base path for the GitHub Pages repository URL.

**Exit criteria:** the app runs locally, tests pass, and the foundation is ready for Supabase.

### Milestone 2: Authentication and Private Workspace

- Configure Supabase Auth and GitHub Pages redirects.
- Add sign-up, sign-in, sign-out, and password recovery.
- Create the couple and membership tables.
- Add an invite flow and workspace-scoped authorization helpers.
- Add RLS policies that allow only two workspace members to access workspace data.

**Exit criteria:** two accounts can join one workspace and neither partner can access another workspace.

### Milestone 3: Dashboard and Shared Profile

- Add workspace navigation and couple settings.
- Show upcoming occasions and recent saved items.
- Add loading, empty, and error states.

**Exit criteria:** both partners can use the shared shell and settings are safely scoped.

### Milestone 4: Important Dates

- Create, edit, archive, and delete occasions.
- Support birthdays, anniversaries, reservations, and custom labels.
- Add upcoming and overdue views.

**Exit criteria:** occasion CRUD is covered by unit, authorization, and browser tests.

### Milestone 5: Activity Suggestions

- Create activity records with notes and tags.
- Mark an activity as interested, planned, or completed.
- Filter by category and status.

**Exit criteria:** both partners can collaboratively manage the activity list.

### Milestone 6: Memories and Saved Information

- Add text records and optional compressed image uploads.
- Record dates, locations, ratings, and tags.
- Implement search and filtering.

**Exit criteria:** the couple can create, retrieve, and organize memories reliably.

### Milestone 7: Reminders

- Add in-app reminder scheduling linked to shared occasions.
- Add snooze and dismiss actions.
- Keep reminder state couple-scoped and protected by Row Level Security.
- Email delivery remains optional until the scheduling path is stable.

**Exit criteria:** scheduled reminders are traceable and duplicate sends are prevented.

### Milestone 8: Hardening and Production

- Add Supabase database backup and restore procedures supported by the chosen plan.
- Run security review and dependency updates.
- Add logging, metrics, and error reporting.
- Add a production GitHub Pages workflow and end-to-end smoke test.
- Configure custom redirects and verify Supabase allowed redirect URLs.

**Exit criteria:** deployment is repeatable and critical flows are monitored.

Future milestones may add object storage, calendar integrations, richer search, or a mobile
application only after the current workflows are stable.

## Free-Tier Constraints

- GitHub Pages hosts only static files. It does not run application servers or scheduled jobs.
- Supabase has a free-project limit, database pause policies, storage limits, bandwidth
  limits, and authentication limits. Confirm the current limits on the Supabase billing page
  before creating the project.
- GitHub Actions provides hosted build minutes, but deployment itself does not require a
  paid GitHub plan for a public repository.
- A private repository may require GitHub Pages availability on a paid GitHub plan; use a
  public repository unless private Pages access is confirmed available.
- GitHub Pages cannot provide server-side secrets or hide the application source.
- Supabase RLS is mandatory. A URL or API key alone must never grant access to private data.

## Database Setup

Database changes are stored as ordered SQL files in `supabase/migrations/`. The workspace
migration creates the couple and membership tables, limits each workspace to two members,
and enables row-level security. The invite migration adds a one-time code that expires after
seven days. The occasions and activity migrations add couple-scoped records and RLS
policies. The memories migrations add saved information, tags, locations, ratings, and
private compressed image uploads. Apply each migration once in the Supabase SQL Editor, then keep the SQL file in
Git so the schema can be reproduced. Never put a service-role key or database password in the
browser app.

## Local Development

### Milestone 1: Completed Foundation

Run these commands from the project folder:

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

The development server prints a local URL, usually `http://localhost:5173`.

### GitHub and GitHub Pages Setup

1. Create a GitHub repository for this project.
2. Push the current `main` branch to GitHub.
3. Open **Settings > Pages**.
4. Set **Source** to **GitHub Actions**.
5. Confirm the deployment workflow finishes successfully.
6. Visit the Pages URL displayed under **Settings > Pages**.

For local development, store these two client settings in `.env.local` (ignored by Git).
The GitHub Pages build reads the same settings from GitHub Actions repository secrets:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

These are browser-facing Supabase project settings, not database passwords or service-role
keys. Never put a Supabase secret/service-role key in the Vite app or GitHub Pages build.

## Quality and Security Rules

- Never trust client-supplied IDs for authorization.
- Validate all server-side input with Zod.
- Keep secrets in environment variables.
- Scope every database query to the authenticated couple workspace.
- Use the Supabase typed client and parameterized queries.
- Enable Row Level Security on every user-owned table.
- Use RLS policies or RPC functions for every authorization decision.
- Test destructive actions and authorization failures.
- Do not log personal notes, email addresses, tokens, or passwords.
- Keep migrations backward-compatible where possible.
