
# SCC Electronic Point of Sale (EPoS) System v0.5

This is a custom Point of Sale (PoS) system built with React and Tailwind CSS, designed for efficient transaction processing, member management, and inventory tracking.

## Features

* **Core PoS Operations**:
    * Process sales transactions with real-time subtotal, discount, and tax calculations.
    * Generate and display detailed receipts for completed transactions.
    * Support for currency formatting.
* **Member Management**:
    * Add, view, and edit member details.
    * NFC (Near Field Communication) integration for quick member identification.
* **Inventory Management**:
    * Track and manage inventory items.
* **Transaction History**:
    * View a comprehensive history of all processed transactions.
* **System Settings**:
    * Configure application-wide settings, such as tax rates.
* **Intuitive User Interface**:
    * Clean and responsive design utilizing Tailwind CSS.
    * Utilizes `lucide-react` icons for clear navigation and functionality representation.
* **Modular Screens**:
    * Dedicated screens for PoS, Members, History, Settings, Inventory, and a main Menu.

## How to run:

This system is a Next.js application and can be launched using standard Node.js/npm commands.

### Prerequisites

Before you begin, ensure you have the following installed:

* **Node.js**: [Download and install Node.js (LTS version recommended)](https://nodejs.org/en/download/) which includes `npm` (Node Package Manager).

* **Supabase Project**: You need an active Supabase project with `inventory`, `members`, and `transactions` tables configured. Make sure you have your **Project URL** and **`anon` key** readily available from your Supabase dashboard (usually found under Project Settings -> API).

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
    NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
    NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
    ```

    **Replace `YOUR_SUPABASE_PROJECT_URL` and `YOUR_SUPABASE_ANON_KEY` with your actual Supabase credentials.**

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

For actual deployment to a live server, you would typically use platforms like Vercel (recommended for Next.js), Netlify, or deploy to your own server. Consult the documentation for your chosen deployment platform for specific instructions.

## To-Do List and Possible Upgrades

There is a roadmap for future enhancements to make this PoS system even more robust and versatile:

* **Direct NFC input (without emulator)**
* **Pricing Options**
* **Order Processing**
* **Receipt Printing**
* **Built-in calc**
* **User Authentication and Role-Based Access Control**
* **Payment Gateway Integration**
* **Advanced Reporting and Analytics**
* **Refund and Return Processing**
* **Offline Mode Capabilities**
```
