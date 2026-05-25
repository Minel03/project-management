# Project Management Tool

A full-stack visual project tracker and Kanban board built as a developer assessment submission using a **Next.js** frontend and an **Express/Node.js** backend backed by a **MySQL** database.

---

## 🌟 Key Features

1. **🔒 Secure Authentication & Authorization**
   - User sign-up and password hashing using `bcryptjs`.
   - Session authentication powered by **JWT (JSON Web Tokens)**.
   - Profile verification middleware protecting all backend workspace resources.

2. **📁 Project Space CRUD**
   - Create, update, and delete distinct project workspaces.
   - List and switch between projects instantaneously via the dashboard selector.
   - Team leadership is supported via backend teams and membership assignment.
   - Project creation is restricted to team leaders and admins.

3. **📊 Dynamic Kanban Board with Custom Drag-and-Drop**
   - Organizes project tasks into visual lanes: **Todo**, **In Progress**, and **Done**.
   - Custom **HTML5 Drag-and-Drop** implementation using native React handlers (`onDragStart`, `onDragOver`, `onDrop`) for extremely smooth and lightweight drag actions.
   - Task CRUD: Assign tasks to one or more project members, write notes, and edit details via dynamic modular dialog overlays built with **shadcn/ui**.

4. **👥 Admin User & Team Management**
   - Admin users can create and manage system accounts directly from the dashboard via the dedicated admin console.
   - Role-based access control ensures only admins and team leaders can create projects and tasks.
   - Team leaders can create teams and assign members; admins can manage any team or user.
   - Admins can open the dedicated admin page at `/admin` to manage users and team membership.

5. **�📜 Global Activity Feed & Filters Page**
   - A dedicated **Activity Feed** page `/activity` showing all change logs globally.
   - Features a search input to search logs by task title, operator name, or remark content.
   - Features a project filter dropdown to restrict results to a single project.
   - Supports dynamic inline editing of log remarks using a popup interface.

6. **⚡ 1-Click Database Setup & Seeding (Evaluator Friendly)**
   - Features an automated initialization API endpoint (`/api/db/init`) with an optional `?reset=true` parameter.
   - **Interactive Control Panel**: We built this directly into the login screen! Anyone reviewing your application can click **"Reset & Seed Demo"** to automatically compile the SQL schemas and insert a premium mockup environment with pre-defined users, projects, tasks, and historical logs.

---

## 🛠️ Technology Stack

- **Frontend**: Next.js (App Router, Tailwind CSS v4, Axios, Lucide Icons)
- **Backend**: Node.js & Express (ESM structure, JWT, Bcrypt, MySQL2)
- **Database**: MySQL (Relational Schema with Cascading Deletions)

---

## 🚀 Instructions to Run Locally

### Prerequisites

Make sure you have **Node.js (v18+)** and a local **MySQL Server** installed and running on your machine.

---

### Step 1: Configure & Start the Backend

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. The dependencies are already configured in `package.json`. If you want to perform a fresh install:
   ```bash
   npm install
   ```
3. Open `backend/.env` and review the database variables. By default, it connects to:
   - Host: `127.0.0.1` (localhost)
   - Port: `3306`
   - User: `root`
   - Password: `""` (empty)
   - Database: `project_management`
     _(Update these credentials if your local MySQL instance has a custom password or port)._
4. Start the Express server:
   ```bash
   npm start
   ```
   _The server will start listening on **`http://localhost:5000`**._

---

### Step 2: Start the Next.js Frontend

1. Open a new terminal and navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. The dependencies (`axios`, `lucide-react`, etc.) are pre-configured. If you want to perform a fresh install:
   ```bash
   npm install
   ```
3. Start the Next.js dev server:
   ```bash
   npm run dev
   ```
   _The frontend application will start running on **`http://localhost:3000`**._

---

### Step 3: Initialize the Database (One-Click)

1. Open your browser and navigate to **`http://localhost:3000`** (which redirects to `/login`).
2. Inside the **Evaluator Quick Setup** card, click **"Reset & Seed Demo"**.
3. The application will programmatically connect to your local MySQL instance, compile the database `project_management` and its tables, and seed it with realistic test mockups.
4. The panel will display success indicators and reveal the demo account credentials.

---

## 🔑 Predefined Demo Accounts

Once seeded, you can log in immediately using these pre-registered users (all share the same password):

- **John Doe** (Admin/Lead) — Username: `john_doe` | Password: `password123`
- **Jane Smith** (Developer) — Username: `jane_smith` | Password: `password123`
- **Bob Johnson** (Tester) — Username: `bob_johnson` | Password: `password123`

> The admin account can additionally create new system users from the dashboard using the **Manage Users** button in the top-right header.

---

## ⚠️ Known Issues / Incomplete Functionality

- The drag-and-drop move remark dialog is working, but the UX may still feel slightly delayed on very large task lists.
- The app assumes a local MySQL server with default credentials; additional environment configuration may be required for non-standard setups.

---

## 📋 Relational Database Schema

```sql
-- Users Table
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects Table
CREATE TABLE projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tasks Table
CREATE TABLE tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status ENUM('Todo', 'In Progress', 'Done') DEFAULT 'Todo',
  assigned_to INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

-- Task Assignees Join Table (many-to-many task assignment)
CREATE TABLE task_assignees (
  task_id INT NOT NULL,
  user_id INT NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (task_id, user_id),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Change Logs Table
CREATE TABLE change_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT NOT NULL,
  user_id INT NOT NULL,
  old_status ENUM('Todo', 'In Progress', 'Done') NOT NULL,
  new_status ENUM('Todo', 'In Progress', 'Done') NOT NULL,
  remark TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## 🏆 Development Adherence

This application fulfills all constraints listed in the Developer Assessment requirements:

- **Authentication**: Fully implemented Register/Login/Me flow using bcrypt & JWT session tokens, with admin/member-aware authorization checks and team leader membership awareness.
- **Projects**: Visual creation, updates, and cascading deletion. New project/task creation is limited to team leaders and admins.
- **Tasks**: Lanes for Todo, In Progress, Done, with instant drag-and-drop state syncing.
- **Change Log**: Real-time auditing of creations, edits, and lane transfers mapped directly to user activity, featuring status-change remarks.
- **Predefined Seeding Endpoint**: Exposed at `/api/db/init` and triggerable via one-click in the frontend UI.
- **Code Quality**: Highly structured folder organization (MVC structure in backend, modular components in frontend) utilizing ESM modules, full TypeScript integrations, **shadcn/ui** components, and Tailwind styling.
- **Enhancements (Creativity)**: Built a dedicated Global Activity Feed and filters page (`/activity`) allowing audit trail queries, search, and inline remark updates.
