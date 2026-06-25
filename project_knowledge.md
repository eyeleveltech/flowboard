# FlowBoard Project Audit & Knowledge Base

This document provides a comprehensive overview of the `flowboard-main` project, including its architecture, technology stack, database schema, backend APIs, and frontend components.

## 1. High-Level Architecture

FlowBoard is a full-stack Social Media Management Tool designed to manage content calendars, client approvals, and post scheduling.

- **Frontend:** A React 18 Single Page Application (SPA) built with Vite.
- **Backend:** A RESTful Node.js/Express API.
- **Database:** PostgreSQL accessed via Prisma ORM.
- **Real-time & Queues:** Socket.io for real-time updates and BullMQ (Redis) for background jobs.

---

## 2. Technology Stack

### Frontend
- **Framework:** React 18 (via Vite)
- **Routing:** React Router v7
- **State Management:** Zustand (global UI state) & React Query (server state & caching)
- **Styling:** Tailwind CSS + shadcn/ui + class-variance-authority + clsx
- **Icons:** lucide-react
- **Drag & Drop:** @hello-pangea/dnd (for Kanban boards or lists)
- **Date Handling:** date-fns + react-day-picker
- **HTTP Client:** Axios
- **Real-time:** socket.io-client

### Backend
- **Framework:** Node.js + Express
- **Database ORM:** Prisma
- **Authentication:** JWT (JSON Web Tokens) & bcrypt for password hashing
- **Queue System:** BullMQ (backed by Redis)
- **Real-time:** Socket.io
- **AI Integrations:** OpenAI & Anthropic SDKs included

---

## 3. Database Schema (Prisma)

The database models revolve around the core workflow of social media management:

- **User**: System users including various roles (`SUPER_ADMIN`, `ADMIN`, `EDITOR`, `MANAGER`, `CLIENT`, etc.).
- **Client**: Represents brands or companies being managed. Contains brand colors, platforms, and portal settings.
- **Post**: The core entity representing a social media post. Contains media, caption, hashtags, and a robust status workflow (`IDEA`, `DRAFT`, `REVIEW`, `APPROVED`, `CLIENT_APPROVED`, `SCHEDULED`, `PUBLISHED`, etc.).
- **ChecklistItem**: Tasks associated with a specific post to track progress.
- **Comment**: Internal or client discussions on specific posts.
- **PostActivity**: Audit logs tracking the history of changes/actions on a post.
- **HashtagSet**: Reusable groups of hashtags for clients.
- **Notification**: Alerts delivered to users regarding post updates or mentions.

---

## 4. Backend API Routes

The Express application is modularized into several feature-based routers (found in `backend/src/routes`):

1. **`auth.js`**: Login, registration, and token management.
2. **`users.js`**: User CRUD operations and role management.
3. **`clients.js`**: Client management, including portal configurations.
4. **`posts.js`**: Core post CRUD, status updates, and assignments.
5. **`comments.js` & `checklist.js`**: Nested resources for posts.
6. **`activities.js`**: Fetching audit logs for posts.
7. **`hashtags.js`**: Managing reusable hashtag sets.
8. **`calendar.js`**: Optimized queries for fetching posts in calendar views.
9. **`bulk.js`**: Bulk actions (e.g., mass approving or deleting posts).
10. **`notifications.js`**: Fetching and marking notifications as read.
11. **`ai.js`**: AI-powered features (e.g., caption generation).
12. **`bio.js`**: Handling public "Link in Bio" endpoints.
13. **`health.js`**: System health check endpoint.

---

## 5. Frontend Structure

The frontend is highly componentized, separating page-level logic from reusable UI elements.

### Key Pages (`frontend/src/pages/`)
- **`Dashboard.jsx`**: High-level metrics and overview.
- **`Posts.jsx` & `PostDetail.jsx`**: List/Kanban view of posts and granular post editing.
- **`PostForm.jsx`**: Creation and editing interface for posts.
- **`Calendar.jsx`**: Visual calendar representation of scheduled content.
- **`Approvals.jsx`**: Dedicated view for items needing internal or client review.
- **`Clients.jsx`, `ClientDetail.jsx`, `ClientPortal.jsx`**: Internal client management and external-facing client approval portals.
- **`Login.jsx`**: Authentication entry point.
- **`Settings.jsx`**: User and workspace configurations.
- **`LinkInBio.jsx`**: Renderer for public-facing bio links.

### Reusable Components (`frontend/src/components/`)
- **`Layout.jsx`**: The main application shell wrapping authenticated routes (Sidebar, Header).
- **`ProtectedRoute.jsx`**: Router guard ensuring the user is authenticated.
- **`PostCard.jsx`**: UI representation of a single post in lists or boards.
- **`NotificationBell.jsx`**: Real-time notification dropdown.
- **`StatusBadge.jsx` & `PlatformBadge.jsx`**: Consistent visual indicators for post states and social networks.
- **`ui/`**: Directory containing low-level primitive components (buttons, inputs, dialogs) mostly generated via `shadcn/ui`.

---

## 6. Audit Summary & Observations

- **Robust State Machine**: The `PostStatus` enum indicates a very mature, multi-step approval workflow tailored for agencies (incorporating both internal review and external client approval).
- **Modern React Architecture**: The combination of `Zustand` and `React Query` is an industry best practice for separating UI state from server cache.
- **Scalable Backend**: Using BullMQ indicates the system handles heavy background tasks asynchronously (e.g., actual publishing to social media APIs or processing AI requests), ensuring the Express API remains responsive.
- **Real-time Ready**: The inclusion of Socket.io suggests that comments, status changes, and notifications update live across clients without needing a page refresh.
