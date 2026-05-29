# Project Management Tool

A full-stack project management and Kanban board application built with a Next.js frontend, an Express/Node.js backend, and a MySQL database.

The app supports role-based project workspaces, shared task status, multi-assignee tasks, due dates, task activity logs, comments, and optional checklist/subtasks for splitting work between collaborators.

## Key Features

### Authentication and Authorization

- User registration and login with hashed passwords using `bcryptjs`.
- JWT-based authentication.
- Protected API routes through backend auth middleware.
- Role-aware access for admins, team leaders, and members.

### Projects and Teams

- Create, update, delete (with a themed modal), and switch between project workspaces.
- Projects are associated with teams. Admins and team leaders can select/change the team for a project workspace.
- Admins and team leaders can create projects. Leaders can only create projects for teams they lead.
- Admins can manage users, teams, leaders, and team membership from `/admin`. A debounced search bar and paginated results are available on `/admin` to easily manage and search the system users list.
- Users can only access and view projects that belong to the teams they lead or belong to.

### Theme Support

- Light, dark, and system theme modes are available from the app header.
- The default theme is `system`, so the UI follows the user's OS color preference until they choose a specific mode.
- Theme preference is saved locally and restored on future visits.
- A pre-hydration theme script prevents the page from flashing the wrong theme on load.
- Theme-aware styling is applied across the dashboard, Kanban board, activity feed, admin console, login/register pages, and reusable dialogs/modals.

### Kanban Board

- Tasks are grouped into `Todo`, `In Progress`, and `Done`.
- Tasks can include an optional due date shown on cards and in the task details view.
- Drag-and-drop moves tasks between columns.
- Moving a task records a status-change activity log with an optional remark.
- Task status is shared per task, not per assignee. If John and Jane share one task, moving it to `In Progress` moves the shared task for both.

### Task Collaboration

- Tasks can be assigned to multiple users (restricted to members of the project's assigned team, including the team leader).
- When a task first moves to `In Progress`, the app records who started it and displays `Started by <username>`.
- Clicking a task card opens a task details view.
- The task details view contains:
  - Description, assignees, and due date
  - Started-by indicator
  - Comments
  - Checklist/subtasks with optional individual owners selected through a searchable picker
  - Subtask completion toggles
- Clicking the pencil icon opens the edit task dialog for task metadata only: title, description, assignees, status, due date, and remark.

### Activity Logs

- Task creation, status changes, detail edits, comments, and subtask changes are recorded in `change_logs`.
- The dashboard shows a project activity sidebar.
- `/activity` provides a global activity feed with search and project filtering.
- The global activity feed supports the same light/dark/system theme toggle as the dashboard.
- Admins can see global logs; non-admin users can see logs for projects/tasks they can access.
- Log remark owners can edit their own remarks.

### Database Setup and Demo Data

- `/api/db/init` initializes the database and creates the core schema.
- `/api/db/init?reset=true` resets and seeds demo users, teams, projects, tasks, and activity logs.
- In the login screen, `Create Tables` runs `/api/db/init` and preserves existing data.
- In the login screen, `Load Demo Data` runs `/api/db/init?reset=true`, clears existing app tables, and loads the demo workspace.
- The backend also runs a startup migration that ensures collaboration tables exist:
  - `task_assignees`
  - `task_comments`
  - `task_subtasks`
  - `tasks.started_by`
  - `tasks.due_date`

**Security note (demo only)**

- The `/api/db/init` endpoint and the login-screen DB buttons are provided for demo and assessment convenience. In production this endpoint should be restricted; do not leave it publicly accessible.
- Recommended: protect the endpoint with authentication and an admin-only check (for example `protect()` + `isAdmin()` middleware). You can also hide the UI buttons in production builds.
- This repository seeds an admin account during demo initialization so reviewers can authenticate and run the init/seed endpoints safely. Use the seeded admin (`john_doe`) or your own admin user before calling the endpoint.

Example curl (run as admin with a JWT):

```bash
curl -X GET "http://localhost:5000/api/db/init?reset=true" \
  -H "Authorization: Bearer <ADMIN_JWT>"
```

If you prefer not to expose the init endpoint, run the SQL in `backend/controllers/dbController.js` manually or convert it to a migration/seed script (recommended for production deployments).

### Deployment environment variables (recommended)

Two env vars control the demo DB init feature and should be set appropriately when deploying (for example on Vercel):

- `ENABLE_DB_INIT` (backend): when set to `true` the `/api/db/init` route is mounted. Default should be `false` in production.
- `NEXT_PUBLIC_ENABLE_DB_INIT` (frontend): when set to `true` the login UI shows the `Create Tables` / `Load Demo Data` buttons. Keep this `false` in production.

Recommended Vercel settings for production:

- `ENABLE_DB_INIT=false`
- `NEXT_PUBLIC_ENABLE_DB_INIT=false`

For preview or development deployments you can set both to `true` to enable the demo workflow, but always protect the backend route with authentication and an admin-only check.

## Technology Stack

- Frontend: Next.js App Router, React, TypeScript, Tailwind CSS, Axios, React Select, Lucide Icons, shadcn-style UI components
- Backend: Node.js, Express, ESM modules, JWT, bcryptjs, MySQL2
- Database: MySQL

## Run Locally

### Prerequisites

- Node.js 18 or newer
- MySQL server running locally

### 1. Configure and Start the Backend

```bash
cd backend
npm install
npm start
```

The backend runs on:

```text
http://localhost:5000
```

Review `backend/.env` before starting. The default expected MySQL setup is:

```text
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=project_management
```

Update these values if your local MySQL server uses different credentials.

### 2. Start the Frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on:

```text
http://localhost:3000
```

### 3. Initialize the Database

Open the app in the browser and go to:

```text
http://localhost:3000
```

From the login screen, use one of the database setup buttons:

- `Create Tables`: creates or updates the database tables without deleting existing data.
- `Load Demo Data`: resets the app tables and loads sample users, teams, projects, tasks, and logs.

You can also call the API directly:

```text
GET http://localhost:5000/api/db/init?reset=true
```

## Demo Accounts

After seeding, all demo accounts use:

```text
password123
```

Available seeded users include:

| Name        | Username      | Role   |
| ----------- | ------------- | ------ |
| John Doe    | `john_doe`    | admin  |
| Alice Lead  | `alice_lead`  | leader |
| Mike Lead   | `mike_lead`   | leader |
| Jane Smith  | `jane_smith`  | member |
| Bob Johnson | `bob_johnson` | member |
| Lisa Green  | `lisa_green`  | member |
| Tom Adams   | `tom_adams`   | member |
| Sam Wilson  | `sam_wilson`  | member |

## Current Task Workflow

1. Admins or team leaders create projects and tasks.
2. A task can have one or more assignees.
3. A task can optionally include a due date.
4. Any authorized assignee, project owner, or admin can update the task.
5. Dragging a task between columns updates the shared task status.
6. Moving a task to `In Progress` records the first starter in `started_by`.
7. Users open the task details view to discuss work through comments or split work through checklist items.
8. Checklist items can be assigned to individual users and completed independently.

## Theme Behavior

The frontend uses `frontend/src/context/ThemeContext.tsx` for theme state. The supported values are:

- `system`
- `light`
- `dark`

If no preference is saved, the app defaults to `system` and follows `prefers-color-scheme`. Choosing a theme stores it in `localStorage` under `theme`. The root layout applies the saved/system theme before hydration to reduce visual flicker.

## Database Schema Overview

The app uses these main tables:

- `users`
- `teams`
- `team_members`
- `projects`
- `tasks`
- `task_assignees`
- `task_comments`
- `task_subtasks`
- `change_logs`

Core relationship summary:

- A project belongs to one owner user.
- A task belongs to one project.
- A task can have many assignees through `task_assignees`.
- A task can have many comments through `task_comments`.
- A task can have many checklist items through `task_subtasks`.
- A task can record one `started_by` user.
- A task can have an optional `due_date`.
- Change logs belong to tasks and users.

## Useful Scripts

Backend:

```bash
cd backend
npm start
npm run server
```

Frontend:

```bash
cd frontend
npm run dev
npm run build
npm run start
npm run lint
```

## Verification Notes

- `npm run build` in `frontend` currently passes.
- `npm run lint` may still report pre-existing lint issues in older files, mostly strict TypeScript `any` usage and React hook lint rules.
- Next.js may warn about multiple lockfiles if a parent `package-lock.json` exists outside this repository.

## Known Issues / Incomplete Functionality

- Task drag-and-drop utilizes the HTML5 Drag and Drop API, which does not support touch gestures on mobile devices. Mobile users can change a task's status via the Edit Task Dialog instead.
- The app assumes a local MySQL instance unless `.env` is changed.
- `Started by` currently records the first user who moved the task to `In Progress`. It is an audit-style indicator, not a live "currently working" lock.
- Comments and checklist/subtasks live in the task details view. The edit dialog is intentionally limited to task metadata.
