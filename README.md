# PCB Product Assistant

A full-stack web application plus a Tampermonkey userscript for streamlining PCB Store product management. The **web app** handles AI prompt management, work reports, and team task tracking, while the **Product Assistant** userscript automates product-page editing directly inside the PCBStore admin panel.

## 🚀 Features

### Web Application
- **SEO Product Prompt Builder** — Compose and store reusable AI prompts (static + main template) for generating product descriptions, key features, FAQs, specs, and meta tags
- **Category Prompt Builder** — Maintain two-step AI prompts for category-level content generation
- **Report Management** — Create hourly/daily work reports tracking descriptions, FAQs, key features, specifications, meta titles, warranty claims, categories, attributes, and more; supports custom fields
- **WhatsApp Export** — One-click formatting of reports for WhatsApp sharing
- **Date Range Reports** — Aggregate reports across custom date ranges with daily summaries
- **Task Manager** — Create, assign, filter, sort, and paginate team tasks with status flow (Not Started → Running → On Hold → Completed), due dates, progress tracking, and link attachments
- **Public Task Board** — A read-only public view of tasks (no login required)
- **Admin Panel** — User management with role-based access (admin / product_manager / user)
- **JWT Authentication** — Secure token-based auth with role-based route protection
- **Health & Session Diagnostics** — Built-in `/api/health` and `/api/session-test` endpoints

### Product Assistant (Tampermonkey Userscript)
A floating panel injected into `https://admin.pcbstore.net/admin/product/*` that provides:

- **Short Description Formatter** — Paste plain text; first line becomes an `<h2>` heading, remaining lines become a bullet list; auto-fills the Quill editor
- **Description Paste Editor** — Paste rich HTML, strip background/inline colors, and inject cleaned content into the specification Quill editor (multi-strategy: `dangerouslyPasteHTML`, `setContents`, synthetic paste)
- **Keyword Highlighter** — Add keywords and highlight them in the description using the CSS Custom Highlight API (non-destructive, visual only)
- **Meta Title & Description Filler** — Fill meta fields with live character counters (60 / 160 char limits)
- **FAQ Importer** — Parse question/answer pairs and auto-fill the FAQ section
- **Specification Table Importer** — Parse grouped key→tab→value lines and fill the specification table
- **Warranty Claims Selector** — Match and select warranty options by category prefix
- **Field Completion Dashboard** — Real-time status grid showing 18 product fields with a progress ring
- **Session Stats Tracker** — Counts short descriptions, descriptions, FAQs, spec groups/items, warranties, categories, and attributes filled during the session; copyable and resettable
- **Alt+Q Toggle** — Show/hide the panel with a keyboard shortcut

## 🛠 Tech Stack

### Backend
- **Runtime**: Node.js with Express.js
- **Database**: MongoDB Atlas with Mongoose ODM
- **Authentication**: JWT (jsonwebtoken) with Bearer token middleware
- **Security**: bcryptjs for password hashing, CORS with configurable origins
- **Session Store**: connect-mongo (for legacy session support alongside JWT)
- **Logging**: Morgan (dev / combined modes)
- **Utilities**: uuid, dotenv
- **Dev**: nodemon for hot-reload

### Frontend
- **Framework**: React 19 with Vite 7
- **Styling**: Tailwind CSS 4 with tailwind-merge & class-variance-authority
- **UI Components**: Radix UI (Dialog, Dropdown Menu, Tabs, Slot)
- **Icons**: Lucide React
- **HTTP Client**: Axios with Bearer token auth
- **Routing**: React Router 7
- **Notifications**: react-hot-toast
- **Date Handling**: date-fns
- **Build Tool**: Vite with @vitejs/plugin-react

### Product Assistant Userscript
- **Platform**: Tampermonkey / Greasemonkey
- **Target**: `https://admin.pcbstore.net/admin/product/*`
- **Tech**: Vanilla JS, CSS Custom Highlight API, Quill editor integration
- **Storage**: localStorage for config and session stats

## 📋 Prerequisites

- **Node.js** (v16 or higher) — [Download](https://nodejs.org/)
- **MongoDB Atlas** account — [Sign up](https://www.mongodb.com/atlas)
- **pnpm** (recommended) or npm
- **Git** — [Download](https://git-scm.com/)
- **Tampermonkey** browser extension (for the Product Assistant userscript)

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone git@github.com:faketi101/pcbstore-product-assistant.git
cd pcbstore-product-assistant
```

### 2. Automated Setup
The start scripts auto-detect your local IP and configure `.env` files for both backend and frontend.

#### Linux / macOS
```bash
./start.sh
```

#### Windows
```bash
start.bat
```

The script will:
- Detect your local network IP address
- Ask you to choose between localhost or network access
- Automatically configure `.env` files for both backend and frontend
- Install dependencies if needed
- Start both servers

### 3. Install the Product Assistant
1. Install the [Tampermonkey](https://www.tampermonkey.net/) browser extension
2. Create a new userscript and paste the contents of `assistantScripts/productAssistant.js`
3. Navigate to any product page on `https://admin.pcbstore.net/admin/product/*`
4. Press **Alt+Q** to toggle the assistant panel

## 📖 Manual Setup

### Backend
```bash
cd backend
pnpm install
cp .env.example .env
# Edit .env with your MongoDB connection string and settings
pnpm start        # production
pnpm run dev      # development (nodemon)
```

### Frontend
```bash
cd frontend
pnpm install
cp .env.example .env
# Edit .env with the backend API URL
pnpm dev          # development
pnpm build        # production build
```

## 🌐 Access URLs

### Live
- **Production**: [https://pcb.tarikul.dev/](https://pcb.tarikul.dev/)

### Local
```
Local Access:
  Backend:  http://localhost:5000
  Frontend: http://localhost:5173

Network Access (example):
  Backend:  http://192.168.1.100:5000
  Frontend: http://192.168.1.100:5173
```

## 📚 API Documentation

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/login` | User login (returns JWT) |
| POST | `/api/logout` | Logout (client-side token removal) |
| GET | `/api/me` | Get current user (requires token) |
| POST | `/api/change-password` | Change password |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports/hourly` | Get hourly reports (filterable) |
| POST | `/api/reports/hourly` | Create hourly report |
| PUT | `/api/reports/hourly/:id` | Update hourly report |
| DELETE | `/api/reports/hourly/:id` | Delete hourly report |
| GET | `/api/reports/daily/:date` | Daily report for a date |
| GET | `/api/reports/daily` | Daily reports with date range |

### Product Prompts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/prompts` | Get user's prompts |
| POST | `/api/prompts` | Save prompts |
| DELETE | `/api/prompts` | Reset all prompts to default |
| DELETE | `/api/prompts/main` | Reset main prompt only |
| DELETE | `/api/prompts/static` | Reset static prompt only |

### Category Prompts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/category-prompts` | Get category prompts |
| POST | `/api/category-prompts` | Save category prompts |
| DELETE | `/api/category-prompts` | Reset both to default |
| DELETE | `/api/category-prompts/1` | Reset prompt 1 only |
| DELETE | `/api/category-prompts/2` | Reset prompt 2 only |

### Tasks
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/tasks/public` | None | Public task list |
| GET | `/api/tasks/users` | Token | Users list (for filters) |
| GET | `/api/tasks/my-tasks` | Token | Current user's tasks |
| GET | `/api/tasks/all-tasks` | Token | All tasks |
| GET | `/api/tasks/:id` | Token | Single task |
| PUT | `/api/tasks/:id` | Token | Update task (role-scoped) |
| GET | `/api/tasks/admin/tasks` | Admin | Admin task list |
| POST | `/api/tasks` | Admin | Create task |
| PUT | `/api/tasks/admin/:id` | Admin | Admin update task |
| DELETE | `/api/tasks/:id` | Admin | Delete task |
| GET | `/api/tasks/admin/users` | Admin | Users with roles |

### System
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check (DB, env, IPs) |
| GET | `/api/session-test` | Session diagnostics |

## ⚙️ Configuration

### Environment Variables

#### Backend (.env)
```env
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_jwt_secret
SESSION_SECRET=your_session_secret
FRONTEND_URL=http://localhost:5173
PORT=5000
NODE_ENV=development
COOKIE_SECURE=false
COOKIE_DOMAIN=
```

#### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000
```

### Network Configuration
1. **Local Development** — Use `localhost` for single-machine development
2. **Network Access** — Use your LAN IP (e.g. `192.168.1.100`) for multi-device access
3. **Production** — Configure with your domain, enable HTTPS, set `COOKIE_SECURE=true`

## 🧪 Development

### Available Scripts

#### Backend
```bash
cd backend
pnpm run dev       # Start with nodemon (hot-reload)
pnpm start         # Production server
pnpm run test:db   # Test MongoDB connection
```

#### Frontend
```bash
cd frontend
pnpm dev           # Development server
pnpm build         # Production build
pnpm preview       # Preview production build
pnpm lint          # ESLint
```

#### Utility Scripts
```bash
node backend/scripts/addAdminUser.js       # Create an admin user
node backend/scripts/testMongoConnection.js # Test DB connection
node backend/scripts/testFilter.js          # Test task filters
```

### Project Structure
```
pcbstore-product-assistant/
├── backend/                     # Express.js API server
│   ├── config/                  # DB connection, default prompts
│   │   ├── database.js
│   │   ├── defaultPrompts.js
│   │   └── defaultCategoryPrompts.js
│   ├── middleware/              # Auth & admin middleware
│   │   ├── auth.middleware.js   # JWT token verification
│   │   └── admin.middleware.js  # Admin role check
│   ├── models/                  # Mongoose schemas
│   │   ├── User.model.js       # User, prompts, reports
│   │   └── Task.model.js       # Task management
│   ├── routes/                  # API route handlers
│   │   ├── auth.routes.js
│   │   ├── prompt.routes.js
│   │   ├── categoryPrompt.routes.js
│   │   ├── report.routes.js
│   │   └── task.routes.js
│   ├── scripts/                 # CLI utilities
│   └── server.js                # App entry point
├── frontend/                    # React SPA
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   │   ├── ui/              # Primitives (Button, Card, Badge, etc.)
│   │   │   ├── tasks/           # Task CRUD components
│   │   │   └── reports/         # Report form & views
│   │   ├── pages/               # Route pages
│   │   │   ├── Home.jsx         # Dashboard menu
│   │   │   ├── ProductPrompt.jsx
│   │   │   ├── CategoryPrompt.jsx
│   │   │   ├── Reports.jsx
│   │   │   ├── UserTasks.jsx
│   │   │   ├── PublicTasks.jsx
│   │   │   └── AdminPanel.jsx
│   │   ├── services/            # API service layer
│   │   ├── context/             # AuthContext (JWT)
│   │   ├── config/              # API base URL config
│   │   ├── lib/                 # Utilities (cn helper)
│   │   └── utils/               # Report formatting
│   └── vite.config.js
├── assistantScripts/            # Tampermonkey userscripts
│   ├── productAssistant.js      # Main product assistant (v4.2)
│   ├── autoFill.js              # Auto-fill helper
│   └── doubleClickToInternalLink.js
├── start.sh                     # Linux/macOS launcher
├── start.bat                    # Windows launcher
└── README.md
```

## 🚀 Deployment

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Configure production MongoDB URI
- [ ] Set strong `JWT_SECRET` and `SESSION_SECRET`
- [ ] Set `FRONTEND_URL` to the production domain
- [ ] Enable HTTPS and set `COOKIE_SECURE=true`
- [ ] Configure CORS allowed origins
- [ ] Set `COOKIE_DOMAIN` for subdomain support if needed
- [ ] Build frontend: `cd frontend && pnpm build`
- [ ] Configure firewall rules and reverse proxy

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style
- Follow ESLint configuration
- Use meaningful commit messages
- Test your changes thoroughly
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

**Built with ❤️ for efficient PCB Store product automation management by TARIKUL ISLAM**
