# SEARS v3

**Shared Experiment Aggregation and Retrieval System** — an AI-powered electronic lab notebook for material science research.

Built for Iowa State University & University at Buffalo.

**Live site:** [https://sears-ub.us](https://sears-ub.us)

---

## What is SEARS?

SEARS is a full-stack platform for recording, aggregating, and retrieving material science experiment data. It replaces scattered paper notebooks and spreadsheets with a single secure system that a whole lab can share.

- **Shared** — multiple users (lab owners, scientists) contribute to the same data
- **Experiment** — the core unit; each experiment holds nine measurement types
- **Aggregation** — data enters via the web UI, file upload with AI parsing, or the command line
- **Retrieval** — query, view, and export data from anywhere
- **System** — web app, CLI, edge functions, local AI, auth, and storage working together

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 5, TypeScript 5 |
| UI | Tailwind CSS, shadcn/ui |
| Backend | Supabase (PostgreSQL, Auth, Storage, Edge Functions) |
| Local AI | Ollama (Llama 3.2) for parsing instrument files |
| CLI | Python 3 (`sears_cli`) |
| Hosting | Vercel |
| DNS | Cloudflare |

---

## Roles & Permissions

SEARS uses a three-tier role hierarchy, enforced at the database level with PostgreSQL Row-Level Security (RLS) — so the same rules apply whether a request comes from the web UI or the CLI.

| Role | Can do |
|------|--------|
| **Universal Owner** | Create labs, assign lab owners, view the whole platform |
| **Lab Owner** | Invite scientists, manage their own lab, full CRUD within it |
| **Scientist** | Create experiments, record measurements, upload files within their lab |

Each role is scoped to its own lab (universal owner excepted) and cannot access another lab's data.

---

## Getting Started (Local Development)

**Requirements:** Node.js 18+ and npm ([install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating))

```sh
# 1. Clone the repository
git clone <YOUR_GIT_URL>
cd SEARS-main

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

The app runs at `http://localhost:5173` with hot reloading.

---

## Environment Setup

Create the following environment variables (locally in a `.env` file, and in Vercel for production):

```sh
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Get both values from **Supabase Dashboard → Settings → API** (use the `anon` / publishable key — never the `service_role` key on the client).

---

## Backend Setup (Supabase)

For a fresh Supabase project:

```sh
# Link your local repo to the project
supabase link --project-ref <your-project-ref>

# Push all database migrations (tables, enum, RLS policies, triggers)
supabase db push

# Deploy the edge functions
supabase functions deploy invite-scientist
supabase functions deploy invite-lab-owner
supabase functions deploy send-invitation
```

Then in the Supabase Dashboard:

1. **Storage** → create a bucket named `experiment-files` (set to Private)
2. **Authentication → URL Configuration** → set the Site URL and add redirect URLs:
   - `https://sears-ub.us/auth/callback`
   - `https://sears-ub.us/reset-password`
3. **Project Settings → Authentication → SMTP** → configure a custom SMTP provider (e.g. Gmail or Resend) so invitation and password-reset emails send reliably

---

## Database Schema

Seven tables, all RLS-protected:

- **labs** — laboratory records
- **profiles** — user identities, roles, and lab assignment (linked to `auth.users`)
- **experiments** — experiment container with JSONB metadata
- **measurement_sections** — one per measurement type per experiment
- **measurements** — individual numeric data rows
- **experiment_files** — uploaded file metadata (bytes live in Storage)
- **messages** — in-lab messaging

**Nine measurement types:** thickness, uv_vis_nir, giwaxs, conductivity, skpm, iv, profilometry, mobility, ftir

---

## Edge Functions

Server-side logic running on Supabase (Deno). Each uses the Admin API so the caller's session is never disrupted.

| Function | Purpose |
|----------|---------|
| `invite-scientist` | Lab owner creates a scientist account |
| `invite-lab-owner` | Universal owner creates a lab owner and assigns them to a lab |
| `send-invitation` | Sends invitation emails |

Invited users receive the temporary password `TempPassword123!` and are prompted to change it after first login.

---

## The `sears` CLI

A Python command-line tool for bulk data entry directly to the database — using the same authentication and RLS as the web app.

**Install:**

```sh
chmod +x sears_cli
sudo mv sears_cli /usr/local/bin/sears
pip install requests   # or: sudo apt install python3-requests
```

Edit the top of the file to set `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

**Commands:**

```sh
sears login                                    # Authenticate
sears whoami                                   # Show your profile and role
sears experiments list                         # List recent experiments
sears experiments create --title "My Test"     # Create an experiment + all 9 sections
sears upload <exp-id> <type> <file>            # Parse a CSV/JSON file and insert measurements
sears add <section-id> --value 1.5 --unit nm --batch B01 --reading R01
sears logout                                   # Clear session
```

The CLI parses full UV-Vis-NIR spectra (all valid data points from both detector arms) and CSV files by matching column headers to the measurement type.

---

## AI-Powered File Parsing

When uploading instrument files through the web UI, SEARS uses a two-tier strategy:

1. **Smart parser (instant)** — reads CSV headers and JSON spectra directly, no AI
2. **Ollama fallback** — for unstructured formats, a local Llama 3.2 model parses the file

Ollama runs locally (`ollama pull llama3.2`) with CORS enabled via `OLLAMA_ORIGINS=*`. No cloud API, no cost, fully offline.

---

## Deployment (Vercel)

1. Push the repository to GitHub
2. In Vercel, create a new project and connect the GitHub repo
3. Add the environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
4. Ensure `vercel.json` is present in the repo root (rewrites all routes to `index.html` so client-side routing works):

   ```json
   { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
   ```

5. Deploy — the site builds and goes live in a minute or so

### Custom domain (Cloudflare)

1. Add your domain in **Vercel → Settings → Domains**
2. Add the DNS record Vercel provides in **Cloudflare → DNS**
3. **Set the proxy to "DNS only" (gray cloud)** — not proxied — to avoid an SSL redirect loop
4. Update the Supabase Auth Site URL and redirect URLs to the new domain

---

## Available Scripts

```sh
npm run dev      # Start development server
npm run build    # Production build
npm run preview  # Preview the production build locally
```

---

## Project Structure

```
src/
├── components/
│   ├── auth/           # Login, sign-up, password reset
│   ├── dashboard/      # Role-specific dashboards & shared layout
│   ├── experiments/    # Experiment forms, measurement sections, file upload
│   └── ui/             # shadcn/ui components
├── pages/              # Route pages (Labs, Profile, Experiments, etc.)
├── hooks/              # useAuth and others
└── integrations/
    └── supabase/       # Supabase client
supabase/
├── functions/          # Edge functions
└── migrations/         # SQL schema migrations
```

---

## License

© Iowa State University & University at Buffalo
