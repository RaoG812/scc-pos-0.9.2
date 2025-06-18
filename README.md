```markdown
# SCC Electronic Point of Sale (EPoS) System v0.9.2

This is a custom Point of Sale (PoS) system built with React and Tailwind CSS, designed for efficient transaction processing, member management, and inventory tracking.

## Features

* **Core PoS Operations**:
    * Process sales transactions with real-time subtotal, discount, and tax calculations.
    * **Configurable Membership Discounts**: Discounts based on membership tiers (Basic, Gold, Supreme) are now adjustable directly within the application settings, removing the need for code edits.
    * Generate and display detailed receipts for completed transactions.
    * **Automated Receipt Closing**: Print receipt pop-up windows now close instantly after print initiation, improving workflow.
    * Support for currency formatting.
* **Member Management**:
    * Add, view, and edit member details.
    * NFC (Near Field Communication) integration for quick member identification.
* **Inventory Management**:
    * Track and manage inventory items, including available and reserved stock for order management.
* **Order Management**:
    * Create new customer orders with specific items and quantities.
    * Reserve stock for pending orders to ensure availability.
    * Fulfill pending orders, which processes the transaction and updates stock.
    * Cancel orders, releasing reserved stock back into available inventory.
* **Transaction History**:
    * View a comprehensive history of all processed transactions, with correct date display from the database.
    * Ability to delete individual or all transactions from history.
* **System Settings**:
    * Configure application-wide settings, such as tax rates and idle logout timers.
* **AI-Powered Enhancements**:
    * **Sales Reporting AI**: An integrated AI assistant for generating comprehensive sales and stock reports based on real-time data.
    * **Category Icon Suggester**: AI-powered suggestions for relevant icons to enhance custom category representation within the menu.
* **Customizable Menu Layouts**:
    * Create and manage multiple menu layouts.
    * Select an active menu layout to display specific categories on the PoS screen.
    * **Dynamic Category Integration**: Newly added categories automatically appear in the menu layout editor for inclusion.
* **Intuitive User Interface**:
    * Clean and responsive design utilizing Tailwind CSS.
    * Utilizes `lucide-react` icons for clear navigation and functionality representation, with all icon import issues resolved.
* **Modular Screens**:
    * Dedicated screens for PoS, Members, Inventory, Orders, History, Reports, Menu Layouts, and Settings.

## How to run:

This system is a Next.js application and can be launched using standard Node.js/npm commands.

### Prerequisites

Before you begin, ensure you have the following installed:

* **Node.js**: [Download and install Node.js (LTS version recommended)](https://nodejs.org/en/download/) which includes `npm` (Node Package Manager).

* **Supabase Project**: You need an active Supabase project with at least the following tables configured: `inventory`, `members`, `transactions`, `admin_users`, and `menu_layouts`. Ensure you have your **Project URL** and **`anon` key** readily available from your Supabase dashboard (usually found under Project Settings -> API).

### Installation

1.  **Clone the Repository (if applicable) or create project directory**:
    If you're getting these files as a fresh project, create an empty directory (e.g., `scc-pos-app`) and place all provided files inside it.
    If you have a Git repository, clone it:

    ```bash
    git clone <your-repository-url>
    cd scc-pos-app # Navigate into your project directory
    ```

2.  **Install Dependencies**:
    Open your terminal or command prompt in the project's root directory and run:

    ```bash
    npm install
    # or if you use Yarn:
    # yarn install
    ```

3.  **Configure Environment Variables**:
    Create a new file named `.env.local` in the root of your project (the same directory as `package.json`). Add your Supabase credentials to this file:

    ```dotenv
    # For client-side Supabase interactions (e.g., in app/page.tsx)
    NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
    NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY

    # For server-side API routes (e.g., in app/api/...)
    # These are used by `process.env.SUPABASE_URL` directly in API routes.
    # On Vercel, these MUST be set directly in Vercel project settings.
    SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
    SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
    ```

    **Replace `YOUR_SUPABASE_PROJECT_URL` and `YOUR_SUPABASE_ANON_KEY` with your actual Supabase credentials.**

    **Important for Vercel Deployment:**
    For production deployments on Vercel, you **must** configure `SUPABASE_URL` and `SUPABASE_ANON_KEY` directly in your Vercel project's **Environment Variables settings** (under Project Settings -> Environment Variables). Ensure their "Type" is set to **"Build & Runtime"** and they are applied to your production environment (Production, Preview, Development). Vercel does not read your local `.env.local` file for production builds.

### Running Locally (Development)

To start the development server, run:

```bash
npm run dev
# or if you use Yarn:
# yarn dev
```

The application will typically be accessible at `http://localhost:3000`. Any changes you make to the code will automatically refresh the browser.

### Building for Production

To create an optimized production build of the application:

```bash
npm run build
# or if you use Yarn:
# yarn build
```

This command compiles the application into the `.next` directory.

### Deploying for Production

To run the production build locally (after building):

```bash
npm run start
# or if you use Yarn:
# yarn start
```

For actual deployment to a live server, **Vercel is the recommended platform for Next.js applications**, as it natively supports serverless functions for API routes and optimal performance. Consult the documentation for your chosen deployment platform for specific instructions.

## To-Do List and Possible Upgrades

There is a roadmap for future enhancements to make this PoS system even more robust and versatile:

* **Built-in calculator**
* **User Authentication and Role-Based Access Control** (beyond simple admin user management)
* **Payment Gateway Integration**
* **Advanced Reporting and Analytics**
* **Refund and Return Processing**
* **Offline Mode Capabilities**
* **Improved Error Handling and User Feedback**
```
