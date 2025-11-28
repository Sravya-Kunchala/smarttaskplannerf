
Smart Task Planner
A modern, feature-rich task planning application built with React and Vite. Manage your tasks efficiently with an intuitive interface, priority settings, and real-time synchronization.

<img width="1918" height="967" alt="Image" src="https://github.com/user-attachments/assets/5079d959-9288-4b04-ae96-1c9dd7cfd2e7" />

<img width="1918" height="968" alt="Image" src="https://github.com/user-attachments/assets/3c527c3e-0347-40c0-a463-226a3ef49eb8" />


<img width="1918" height="965" alt="Image" src="https://github.com/user-attachments/assets/60d9c264-77c4-40b7-8af5-5b1524ee35e2" />

Live Application: https://smarttaskplannerf-azhk.vercel.app/
Backend API: https://smartplannerb-1.onrender.com


📋 Smart Task Planner
A modern, feature-rich task planning application built with React and Vite. Manage your tasks efficiently with an intuitive interface, priority settings, and real-time synchronization.
Show Image
Show Image
Show Image
Show Image
Live Application: https://smarttaskplannerf-azhk.vercel.app/
Backend API: https://smartplannerb-1.onrender.com

STEPD:
Node.js (v16.0.0 or higher)
npm (v7.0.0 or higher)
Git
Installation
1. Clone the repository:
bashgit clone https://github.com/Sravya-Kunchala/smarttaskplannerf.git
cd smarttaskplannerf
2. Install dependencies:
bashnpm install
3. Create environment file:
Create a .env file in the root directory:
envVITE_API_URL=https://smartplannerb-1.onrender.com
For local backend development:
envVITE_API_URL=http://localhost:3000
4. Start development server:
bashnpm run dev
Open your browser at http://localhost:5173


TECH STACK USED:
Frontend Framework

React 18.2.0 - UI library with modern hooks
Vite 5.0.0 - Fast build tool and dev server
JavaScript (ES6+) - Modern JavaScript

Styling

Tailwind CSS 3.3.6 - Utility-first CSS framework
PostCSS - CSS processing
Autoprefixer - Vendor prefixing

UI Components

Lucide React - Icon library

Deployment
Vercel - Frontend hosting

Render - Backend API hosting


Development Tools

ESLint - Code linting
npm - Package management
6. Build for production:
bashnpm run build
npm run preview

VIDEO:https://drive.google.com/file/d/1PSXUifiL6OmQDB2OoaTykmSH5KqfcT-m/view?usp=drivesdk

ASSUMPTION AND DECISIONS:
Assumptions Made

API Availability: Backend API is always available and running at the specified URL
Data Persistence: All task data is stored on the backend; no local storage fallback
User Authentication: Current version assumes single-user mode (no authentication required)
Browser Support: Modern browsers with ES6+ support (Chrome, Firefox, Safari, Edge - last 2 versions)
Network Connection: User has stable internet connection for API calls
Task Properties: Each task has: title, description, priority, category, status, and due date
Unique Identifiers: Backend generates unique IDs for tasks

Technical Decisions

React Without TypeScript: Used JavaScript for faster development; TypeScript can be added later
No State Management Library: React's built-in state is sufficient for current scale
Tailwind CSS: Chosen for rapid UI development and consistent styling
Vite Over CRA: Selected for faster build times and better developer experience
RESTful API: Standard REST endpoints for CRUD operations
Environment Variables: Used Vite's VITE_ prefix for environment variable access
