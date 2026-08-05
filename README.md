# PCBStore Product Assistant

PCBStore Product Assistant is a full-stack internal productivity application for managing reusable AI prompts, work reports, users, and team tasks. The repository also contains Tampermonkey userscripts that automate common product, category, glossary, and internal-link workflows in PCBStore.

Production site: [https://pcb.tarikul.dev](https://pcb.tarikul.dev)

## Features

### Web application

- Dynamic prompt builders generated from administrator-managed templates
- Per-user prompt overrides with individual or full reset to template defaults
- Role-based, configurable report templates with grouped fields and counters
- Hourly reports, daily summaries, date-range reporting, and WhatsApp-friendly output
- Team task management with assignments, filters, links, progress, due dates, and status tracking
- Public read-only task board at `/tasks/public`
- Admin tools for tasks, reports, prompt templates, report templates, and user accounts
- JWT authentication, active-account checks, and role-based API protection
- Health and session diagnostic endpoints
- Localhost, LAN, and production API configuration through environment variables

### Browser automation scripts

The `assistantScripts/` directory contains standalone Tampermonkey userscripts:

| Script | Purpose |
| --- | --- |
| `productUploadAssistant.js` | Main product upload assistant for descriptions, metadata, FAQs, specifications, warranties, field status, and session statistics |
| `autoFill.js` | Bulk FAQ and specification-table importer |
| `internalLinkAssistant.js` | Bulk internal-link insertion with templates, queue editing, and backup/restore |
| `doubleClickToInternalLink.js` | Turns selected specification text into an internal link |
| `productScreenshot.js` | Captures a timestamped product-page screenshot when a product is saved |
| `frontendToBackendProductSearch.js` | Opens the matching admin product search and copies frontend specifications |
| `categoryTreeOrganizerV2.js` | Extracts and exports the admin category hierarchy |
| `glossaryUploadAssitant.js` | Assists with glossary content, SEO metadata, FAQs, validation, and progress tracking |
| `glossaryTermExporter.js` | Exports glossary terms across paginated admin results |

`productAssistant (Copy).js` is an older retained copy. Use `productUploadAssistant.js` for the current product-upload workflow.

## Tech stack

### Backend

- Node.js and Express 4
- MongoDB with Mongoose 8
- JWT bearer authentication and bcrypt password hashing
- Express sessions stored with `connect-mongo` for session diagnostics and legacy support
- CORS, Morgan, dotenv, and UUID

### Frontend

- React 19 and React Router 7
- Vite 7
- Tailwind CSS 4
- Radix UI primitives and Lucide icons
- Axios and Fetch API
- react-hot-toast and date-fns

## Requirements

- Node.js `^20.19.0` or `>=22.12.0` (required by the installed Vite version)
- pnpm
- A MongoDB database, such as MongoDB Atlas
- Git
- Tampermonkey or another compatible userscript manager if browser automation is needed

## Getting started

### 1. Clone the repository

```bash
git clone git@github.com:faketi101/pcbstore-product-assistant.git
cd pcbstore-product-assistant
```

### 2. Configure the backend

```bash
cd backend
cp .env.example .env
pnpm install
```

Update `backend/.env` with at least:

```env
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster/database
JWT_SECRET=replace_with_a_long_random_secret
SESSION_SECRET=replace_with_another_long_random_secret
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
COOKIE_SECURE=false
COOKIE_DOMAIN=
```

`FRONTEND_URL` may contain comma-separated origins in production. Development mode accepts all origins; production mode only accepts configured origins plus the built-in localhost origins.

### 3. Configure the frontend

```bash
cd ../frontend
cp .env.example .env
pnpm install
```

Set the backend origin in `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000
```

The frontend builds API requests as:

```text
${VITE_API_URL}/api
```

If `VITE_API_URL` is not defined, `frontend/src/config/api.config.js` falls back to `http://localhost:5000`.

### 4. Start the application

Run each service in a separate terminal:

```bash
# Terminal 1
cd backend
pnpm run dev
```

```bash
# Terminal 2
cd frontend
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173). The API runs at [http://localhost:5000](http://localhost:5000), and its health endpoint is [http://localhost:5000/api/health](http://localhost:5000/api/health).

## One-command launchers

After adding the MongoDB URI and secrets to the backend environment, the repository launchers can configure local/LAN URLs, install missing dependencies, and start both services.

Linux or macOS:

```bash
chmod +x start.sh
./start.sh
```

Windows:

```bat
start.bat
```

Both launchers detect a LAN IP and offer localhost or network access. They update `FRONTEND_URL` in `backend/.env` and `VITE_API_URL` in `frontend/.env`; they do not generate database credentials or application secrets.

## Initial data and migrations

The dynamic prompt system needs prompt-template documents. For an existing installation that still stores product/category prompts on users, run:

```bash
cd backend
node scripts/migratePrompts.js
```

Useful maintenance commands include:

```bash
pnpm run test:db
pnpm run migrate:user-status
node scripts/migrateCustomWorkSections.js          # dry run
node scripts/migrateCustomWorkSections.js --apply  # apply after reviewing output
```

`backend/scripts/addAdminUser.js` creates a fixed demo administrator account. If it is used for initial local setup, change its password immediately and do not use the demo credentials in production.

## Available commands

### Backend

```bash
cd backend
pnpm start                 # run with Node
pnpm run dev               # run with nodemon
pnpm run test:db           # test the MongoDB connection
pnpm run migrate:user-status
```

### Frontend

```bash
cd frontend
pnpm dev                   # start Vite on port 5173
pnpm build                 # create the production build
pnpm preview               # preview the production build
pnpm lint                  # run ESLint
```

The Vite development server binds to `0.0.0.0`, so it can be reached from other devices on the same network when the firewall and environment URLs allow it.

## Authentication and roles

Login returns a JWT that the frontend stores in `localStorage` and sends as a bearer token:

```http
Authorization: Bearer <token>
```

Tokens expire after 24 hours. Protected requests also verify that the user still exists and is active.

Roles are stored as normalized strings. `admin` grants access to the admin APIs and interface. Other role names can be created through report templates and assigned to users; report templates determine the report fields available for those workflows.

## Main frontend routes

| Route | Access | Description |
| --- | --- | --- |
| `/login` | Public | Sign in |
| `/` | Authenticated | Application home |
| `/prompts/:slug` | Authenticated | Dynamic prompt builder |
| `/reports` | Authenticated | Work reports and history |
| `/tasks` | Authenticated | User task board |
| `/tasks/public` | Public | Read-only public task board |
| `/admin` | Admin | Tasks, reports, templates, and users |

The legacy `/product-prompt` frontend path redirects to its dynamic prompt route.

## API overview

All endpoints are under `/api`. Except for login and the public task board, application endpoints require a bearer token. Admin routes require the `admin` role.

### Authentication

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/api/login` | Public | Sign in and receive a JWT |
| `POST` | `/api/logout` | Public | Acknowledge client-side logout |
| `GET` | `/api/me` | Authenticated | Get the current user |
| `POST` | `/api/change-password` | Authenticated | Change the current password |

### Dynamic prompt templates

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/api/prompt-templates/active` | Authenticated | List active prompt templates |
| `GET` | `/api/prompt-templates/by-slug/:slug` | Authenticated | Get a template merged with the current user's overrides |
| `POST` | `/api/prompt-templates/:id/overrides` | Authenticated | Save user prompt overrides |
| `DELETE` | `/api/prompt-templates/:id/overrides` | Authenticated | Reset all overrides for a template |
| `DELETE` | `/api/prompt-templates/:id/overrides/:promptKey` | Authenticated | Reset one prompt override |
| `GET/POST` | `/api/prompt-templates` | Admin | List or create templates |
| `GET/PUT/DELETE` | `/api/prompt-templates/:id` | Admin | Read, update, or delete a template |

The legacy `/api/prompts` endpoint remains available for the older product prompt storage format.

### Reports and report templates

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET/POST` | `/api/reports/hourly` | Authenticated | List or create hourly reports |
| `PUT/DELETE` | `/api/reports/hourly/:id` | Authenticated | Update or delete an hourly report |
| `GET` | `/api/reports/daily/:date` | Authenticated | Get a daily report |
| `GET` | `/api/reports/daily` | Authenticated | Get reports for a date range |
| `GET` | `/api/reports/admin/reports` | Admin | Filter user reports |
| `GET` | `/api/reports/admin/daily` | Admin | View admin daily summaries |
| `GET` | `/api/reports/admin/range` | Admin | View admin range summaries |
| `GET` | `/api/report-templates/current` | Authenticated | Get the current user's role template |
| `GET` | `/api/report-templates/active` | Authenticated | List selectable active templates |
| `GET/POST` | `/api/report-templates` | Admin | List or create report templates |
| `PUT/DELETE` | `/api/report-templates/:id` | Admin | Update or delete a report template |

### Tasks

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/api/tasks/public` | Public | Get the public task list |
| `GET` | `/api/tasks/users` | Authenticated | Get users available for filtering |
| `GET` | `/api/tasks/my-tasks` | Authenticated | Get tasks assigned to the current user |
| `GET` | `/api/tasks/all-tasks` | Authenticated | Get the authenticated task list |
| `GET/PUT` | `/api/tasks/:id` | Authenticated | Read or update a task within role rules |
| `GET` | `/api/tasks/admin/tasks` | Admin | Get the admin task list |
| `POST` | `/api/tasks` | Admin | Create a task |
| `PUT` | `/api/tasks/admin/:id` | Admin | Update a task as admin |
| `DELETE` | `/api/tasks/:id` | Admin | Delete a task |
| `GET` | `/api/tasks/admin/users` | Admin | Get assignable users and roles |

### User administration and diagnostics

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET/POST` | `/api/admin/users` | Admin | List or create users |
| `PATCH/DELETE` | `/api/admin/users/:id` | Admin | Update or delete a user subject to admin safety rules |
| `GET` | `/api/health` | Public | Check server, environment, and MongoDB status |
| `GET` | `/api/session-test` | Public | Inspect or test session persistence |

## Installing a Tampermonkey script

1. Install Tampermonkey in the browser.
2. Create a new userscript.
3. Copy the complete contents of the required file from `assistantScripts/` into the editor.
4. Save the userscript and open one of the URLs in its `@match` metadata.
5. For `productUploadAssistant.js`, press `Alt+Q` to show or hide the assistant.

These scripts depend on the current PCBStore page markup. Review and test selectors after major admin/frontend updates.

## Project structure

```text
pcbstore-product-assistant/
├── assistantScripts/             # Tampermonkey browser automation
├── backend/
│   ├── config/                    # Database and default templates
│   ├── middleware/                # JWT and admin authorization
│   ├── migrations/                # Package-exposed data migrations
│   ├── models/                    # User, task, prompt, and report schemas
│   ├── routes/                    # Express API route handlers
│   ├── scripts/                   # Setup, test, and migration utilities
│   ├── .env.example
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/            # Shared, task, report, and admin UI
│   │   ├── config/                # API base URL configuration
│   │   ├── context/               # Authentication context
│   │   ├── pages/                 # Route-level screens
│   │   ├── services/              # Backend API clients
│   │   └── utils/                 # Report formatting helpers
│   ├── .env.example
│   ├── package.json
│   └── vite.config.js
├── start.sh                       # Linux/macOS launcher
├── start.bat                      # Windows launcher
└── README.md
```

## Production notes

- Set `NODE_ENV=production`.
- Use strong, independent values for `JWT_SECRET` and `SESSION_SECRET`.
- Set `FRONTEND_URL` to every allowed production frontend origin.
- Serve both applications over HTTPS and set `COOKIE_SECURE=true`.
- Set `COOKIE_DOMAIN` only when cross-subdomain cookies require it.
- Run `pnpm build` in `frontend/` and serve `frontend/dist` through the deployment web server or reverse proxy.
- Proxy API traffic to the backend port and keep MongoDB credentials outside source control.
- Confirm `/api/health` reports a connected database after deployment.

## Contributing

Before opening a pull request:

```bash
cd frontend
pnpm lint
pnpm build
```

There is currently no automated backend test suite, so backend changes should also be exercised against a development database.
