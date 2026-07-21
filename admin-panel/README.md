# Asali Swad — Admin Panel

Admin dashboard for **Asali Swad**, an Indian e-commerce platform. Built with Next.js and a custom design system for managing products, orders, and platform operations.

Live: [admin.asaliswad.com](https://admin.asaliswad.com)

## Tech Stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4 (`@theme inline`), class-based dark mode
- **State management:** Zustand
- **Package manager:** pnpm (workspace-based)

## Features

- **Auth:** Connects to the `admin-auth` module on the backend — a fully separate auth boundary from the storefront, with its own JWT secrets and middleware.
- **Theming:** Dark/light theme built on CSS custom properties, managed via Zustand with a hydration fix (`suppressHydrationWarning` on `<html>`) to avoid SSR/CSR mismatch flicker.
- **Design system:** 5-color brand palette — primary `#059669`, alt `#065F46`, accent gold `#D4A24E` — plus an SVG background crossfade effect.

## Getting Started

### Prerequisites

- [pnpm](https://pnpm.io)
- Access to the [asaliswad-backend](https://github.com/rahuladhikaey/asaliswad-backend) API (local or deployed)

### Installation

```bash
pnpm install
```

### Environment Variables

Set the backend API URL and any other required environment variables in a `.env.local` file at the project root (e.g. `NEXT_PUBLIC_SERVER_URL`).

### Running the project

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Build for production

```bash
pnpm build
pnpm start
```

## Deployment

Deployed on [Vercel](https://vercel.com).

## Known Issues / Notes

- Previously had a middleware bug where the exported function was named `proxy` instead of `middleware` in `middleware.ts`, silently disabling route protection — fixed, but worth double-checking on any middleware refactor.
- A CORS misconfiguration (wildcard origin + credentials) was flagged and should be verified as resolved before each deploy.

## License

Proprietary — all rights reserved.
