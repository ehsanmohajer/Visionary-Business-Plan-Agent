
# Visionary - Business Plan Agent 🚀

Visionary is a high-end interactive tool designed for modern entrepreneurs to transform sparks of ideas into structured, professional business proposals. Built with a focus on Finnish and International market standards, it bridges the gap between chaotic thoughts and investor-ready documentation.

## 🌟 Key Features

- **Interactive AI Wizard**: A 7-step guided questionnaire that covers everything from value propositions to complex financial projections.
- **Bilingual Core**: Fully supports **English** and **Finnish (Suomi)**, catering to local expertise with a global mindset.
- **AI-Driven Generation**: Powered by Google's Gemini 3 Pro model to generate deep competitive analysis, strategic recommendations, and executive summaries.
- **Financial Visualizations**: Instant generation of Startup Cost Breakdowns (Doughnut), Monthly Expense Analysis (Stacked Bar), and 12-Month Revenue & Profit Projections (Line Chart).
- **Tiered Access Model**:
  - **Free**: 1 plan/day, basic analysis, 5 saved plans (FIFO storage).
  - **Plus**: 5 plans/day, PDF Export, 50 saved plans.
  - **Pro**: 15 plans/day, PDF Export, Unlimited plans, Priority Mentorship.
- **Advanced Admin Dashboard**: Manual approval system for bank transfer receipts, user management, and communication portal.
- **Modern UI/UX**: Ultra-sleek design with Dark Mode support, built for high conversion and professional aesthetics.

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Charts**: Recharts
- **AI**: Gemini API (@google/genai)
- **Utilities**: html2canvas, jsPDF (for high-fidelity PDF exports)

## ⚙️ Quick Start

1. Install dependencies: npm install
2. Start dev server: npm run dev

## 🔐 Environment

Create a .env.local file in the project root with:

- VITE_GEMINI_API_KEY
- VITE_FIREBASE_API_KEY
- VITE_FIREBASE_AUTH_DOMAIN
- VITE_FIREBASE_PROJECT_ID
- VITE_FIREBASE_STORAGE_BUCKET
- VITE_FIREBASE_MESSAGING_SENDER_ID
- VITE_FIREBASE_APP_ID

## ☁️ Cloud Storage (Firebase)

All user data is stored in Firebase (Auth + Firestore). This includes:

- Users and admin profiles
- Saved plans
- Payment receipts
- Messages and coupons

Passwords are handled by Firebase Authentication and are not stored in Firestore.

### Admin setup

Create an admin user in Firebase Authentication, then add a user profile document in Firestore:

- Collection: users
- Document ID: the admin user's UID
- Fields: role: "admin", tier: "pro", subscriptionStatus: "active"

## 💼 Business Logic & Storage

### Data storage

All application data is stored in Firebase Firestore. There is no local persistence except for dark mode preference.

## 🚀 Deploy to Vercel

- Framework: Vite
- Build Command: npm run build
- Output Directory: dist
- Add the same environment variables in the Vercel dashboard

LocalStorage keys used:

- visionary_users
- visionary_plans
- visionary_receipts
- visionary_messages
- visionary_coupons
- visionary_revenue
- visionary_darkmode

Notes:

- Saved plans use FIFO logic based on the user tier.
- Receipt uploads are stored as Base64 strings in localStorage (for demo/admin review).
- Clearing browser storage resets all data.

### User interactions (main flows)

- **Landing → Pricing → Auth**: Users pick a plan, then sign up or log in.
- **Wizard (7 steps)**: Users answer guided questions and submit the final step to generate a plan.
- **Plan generation**: The app sends the form data to Gemini and shows the plan with two tabs: Plan and Analysis (charts).
- **User dashboard**: Users see usage, storage limits, saved proposals, and payment status.
- **PDF export**: Shown for paid tiers; free tier is locked. The current UI shows a placeholder action in the demo.
- **Contact**: Users can send messages to the admin from the contact section.

### Admin interactions

- **Quick Admin Login**: A shortcut exists on the auth screen.
- **Receipt review**: Admin can approve or reject bank transfer receipts.
- **User messages**: Admin can see user messages and reply via email.

---

**Developed by Ehsan Mohajer Koohestani - Sani Studio**
*Empowering the next generation of visionary founders.*
