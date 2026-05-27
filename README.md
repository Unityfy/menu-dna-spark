# Menu DNA

Menu DNA is a subscription-based SaaS platform that transforms a restaurant's static menu into a continuously evolving, data-driven decision system. It analyzes menu performance by combining sales, cost, prep effort, and demand behavior to generate actionable weekly optimization recommendations.

## Overview

Restaurant owners upload POS sales data or connect their POS system. Menu DNA normalizes the data, computes dish-level intelligence (profitability, kitchen stress, demand patterns), and produces a weekly action plan with prioritized recommendations. A built-in learning system adapts to which recommendations users approve or ignore, improving relevance over time.

s
## Target Audience

- Restaurant owners
- Restaurant managers
- Multi-outlet food business operators

## Core Capabilities

- **POS Data Ingestion** — CSV upload or direct POS sync with automatic normalization
- **Dish DNA Profiling** — Per-dish analysis of profitability, prep volatility, demand patterns, and kitchen stress
- **Menu Intelligence Scoring** — Overall menu health score with classification (stars, workhorses, opportunities, dogs, hidden gems)
- **Weekly Recommendations** — Seven prioritized recommendation types: price adjustment, promotional push, retention alert, cost review, operational fix, seasonal pivot, and menu engineering
- **Learning System** — Tracks user feedback (approve/ignore) and outcomes to calibrate future suggestions
- **Dashboard & Action Plan** — Visual dashboard with KPIs, top performers, risk flags, and a weekly action workflow

## Technology Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend:** Supabase (Auth, Postgres, Row Level Security, Edge Functions)
- **Data:** Live Supabase data only — no mock data

## Project Structure

```
src/
  components/
    dashboard/         # Dashboard widgets (KPIs, trends, performers)
    onboarding/          # 7-step onboarding wizard
    settings/            # Settings sections (CSV upload, POS sync)
    shared/              # Reusable UI pieces (score rings, badges, bars)
    ui/                  # shadcn/ui components
    layout/              # App shell and navigation
  hooks/                 # Data hooks (sales ingestion, dish profiles, recommendations)
  contexts/              # Auth context
  integrations/supabase/ # Supabase client and generated types
  pages/                 # Route-level pages

supabase/
  functions/             # Edge Functions for data processing
    ingest-sales/        # CSV/Excel normalization and storage
    compute-dish-dna/    # Dish-level metrics
    compute-menu-intelligence/  # Menu health scoring
    compute-recommendations/  # Weekly recommendation generation
    weekly-learning-job/ # Feedback/outcome analysis (Sunday 11pm)
    sync-pos-sales/      # Direct POS integration
```

## Key Architecture Patterns

- **Multi-tenant:** All data and queries are scoped to an active `restaurant_id`
- **RLS with security definer helpers:** `has_role()`, `get_user_restaurant_id()` prevent recursive policy checks
- **One task per screen:** Complex flows use a wizard pattern instead of nested modals
- **Immediate state updates:** UI reflects changes without waiting for server round-trips
- **Live data only:** The application exclusively uses real Supabase data; mock data is not permitted

## Getting Started

### Prerequisites

- Node.js (via [nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- A Supabase project (or use Lovable Cloud)

### Install & Run

```sh
# Install dependencies
npm i

# Start the development server
npm run dev
```

s
### Environment Variables

Required variables (managed via secrets):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Database Setup

The project uses Supabase migrations for schema changes. Run migrations via the Supabase CLI or Lovable Cloud dashboard.

Key tables:
- `restaurants` — Tenant records
- `sales_transactions` — Normalized POS sales data
- `menu_items` — Dish profiles with cost, prep time, and category
- `dish_dna_snapshots` — Computed dish metrics per week
- `menu_intelligence_snapshots` — Weekly menu health scores
- `recommendations` — Generated weekly suggestions
- `recommendation_actions` — User feedback (approve/ignore)
- `user_roles` — RBAC (owner / manager)

## Edge Functions

| Function | Purpose |
|----------|---------|
| `ingest-sales` | Normalizes and stores uploaded CSV/Excel sales data |
| `sync-pos-sales` | Fetches and normalizes data from connected POS systems |
| `compute-dish-dna` | Calculates profit DNA, kitchen stress, and demand patterns |
| `compute-menu-intelligence` | Aggregates dish scores into a menu health score |
| `compute-recommendations` | Generates prioritized weekly recommendations |
| `weekly-learning-job` | Analyzes 12 weeks of feedback/outcomes to update learning parameters |
| `weekly-recommendations-batch` | Batch recommendation generation trigger |
| `aggregate-sales` | Sales aggregation for reporting |
| `compute-outcomes` | Outcome tracking for the learning system |

## Design System

- **Dark monochrome first:** `#0a0a0a` background, `#1a1a1a`/`#2a2a2a` surfaces, `#e8e8e8` text
- **Subtle status accents:** warning `#d4a574`, opportunity `#7a9d7a`, info `#7a8a9d`
- **Typography:** Playfair Display for headings, DM Sans for body
- **Spacing:** 8px base unit with generous padding

## Custom Domain

a
The project is configured with a custom domain:
- **Production:** https://www.swadisham.com

## License

Proprietary — All rights reserved.
