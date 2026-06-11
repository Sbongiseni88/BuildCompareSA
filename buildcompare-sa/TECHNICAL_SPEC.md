# BuildCompare SA - Technical Specification

## 1. Executive Summary

**BuildCompare SA** is a B2B SaaS platform for South African contractors bidding on government tenders. Contractors upload a Bill of Quantities and receive a symmetric five-store supplier price matrix (Builders Warehouse, Cashbuild, Leroy Merlin, BUCO, Build it), BCCEI-gazette-compliant labour estimates, project budget tracking, and a tender-grade sourcing-file export.

---

## 2. Technology Stack

### Core Framework
- **Next.js 16** (App Router) - React framework; all server logic lives in its API routes
- **TypeScript** - Type-safe JavaScript for improved developer experience
- **React 19** - UI component library with hooks
- **Supabase** - Authentication + RLS-protected Postgres
- **DeepSeek (canonical) / Groq (fallback)** - AI extraction & pricing chain
- **Python scraper microservice** (`scraper/`) - Playwright over Browserbase CDP, port 8001

### Styling
- **Tailwind CSS** - Utility-first CSS framework
- **Custom CSS Variables** - Industrial theme (Yellow/Black/Slate)
- **CSS Animations** - Micro-interactions and transitions

### Icons
- **Lucide React** - Modern icon library with 1000+ icons

### State Management
- **React useState/useEffect** - Local component state
- **Props drilling** - Parent-to-child data flow

---

## 3. Architecture Overview

```
buildcompare-sa/
├── src/
│   ├── app/
│   │   ├── globals.css      # Global styles and theme
│   │   ├── layout.tsx       # Root layout with metadata
│   │   └── page.tsx         # Main application entry
│   ├── components/
│   │   ├── Header.tsx       # Navigation header
│   │   ├── Dashboard.tsx    # Main dashboard view
│   │   ├── VisualSearch.tsx # OCR/Image upload component
│   │   ├── PriceComparison.tsx # Price comparison table
│   │   ├── AIConcierge.tsx  # AI chatbot sidebar
│   │   ├── ProjectsManager.tsx # Project folder management
│   │   └── index.ts         # Component exports
│   ├── data/
│   │   └── mockData.ts      # Mock data and generators
│   └── types/
│       └── index.ts         # TypeScript type definitions
```

---

## 4. Feature Specifications

### 4.1 Visual Search & OCR

**Purpose:** Allow contractors to upload photos of materials or handwritten Bill of Quantities for automatic extraction.

**Components:**
- Drag-and-drop zone with visual feedback
- File type validation (images, PDF)
- Simulated OCR processing with progress steps
- Extracted materials list with quantity display

**User Flow:**
1. User drags image/PDF onto drop zone OR clicks "Browse Files"
2. System displays upload progress
3. AI processes image (simulated with 4 steps)
4. Extracted materials displayed with quantities
5. User confirms to proceed to price comparison

**Technical Implementation:**
```typescript
interface UploadedFile {
  id: string;
  name: string;
  type: 'image' | 'document';
  url: string;
  processedAt?: Date;
  extractedMaterials?: Material[];
}
```

### 4.2 Professional Dashboard

**Purpose:** Central hub for contractors to view project overview, stats, and quick actions.

**Features:**
- Welcome section with personalized greeting
- Stats cards (Active Projects, Total Savings, Comparisons Today, Avg. Savings)
- Project list with budget progress bars
- Quick action cards (Quick Price Check, Price Alerts, Bulk Order)

**Key Metrics Displayed:**
- Total/Active project count
- Cumulative savings in ZAR
- Daily comparison count
- Average savings percentage

### 4.3 Project Folders

**Purpose:** Organize materials and costs by construction site/project.

**Features:**
- Project creation modal
- Search and filter functionality
- Status management (active, completed, on-hold)
- Budget tracking with visual progress
- Materials list per project
- CRUD operations (Create, Read, Update, Delete)

**Data Model:**
```typescript
interface Project {
  id: string;
  name: string;
  location: string;
  createdAt: Date;
  totalBudget: number;
  spent: number;
  status: 'active' | 'completed' | 'on-hold';
  materials: Material[];
}
```

### 4.4 Live Price Comparison

**Purpose:** Compare material prices across multiple suppliers in real-time.

**Features:**
- Material search with autocomplete
- Region selector (Gauteng, Cape Town, Durban)
- Advanced filters (radius, sort order, supplier type)
- Comparison results table with:
  - Supplier info and ratings
  - Unit and total pricing
  - Stock availability
  - Delivery info and fees
  - Distance from location
- Best price highlighting
- Potential savings calculation

**Suppliers Included:**
1. Builders Warehouse (chain)
2. Leroy Merlin (chain)
3. Cashbuild (chain)
4. Mica Hardware (chain)
5. Local independent yards

**Material Categories:**
- Cement & Concrete
- Bricks & Blocks
- Steel & Reinforcement
- Timber & Wood
- Plumbing
- Electrical
- Paint & Coatings
- Roofing
- Tiles & Flooring
- Hardware & Fasteners

### 4.5 AI Concierge Sidebar

**Purpose:** Provide intelligent assistance for material selection and quantity calculations.

**Features:**
- Collapsible sidebar interface
- Chat message history
- Typing indicator animation
- Quick prompt suggestions
- Context-aware responses
- Minimizable design

**AI Response Types:**
- Quantity recommendations based on project size
- Price range information
- Material alternatives
- Supplier recommendations
- Pro tips and warnings

**Sample Interactions:**
- "I need cement for a wall" → Cement pricing + quantity calculation
- "Brick quantities for 10m wall" → Brick count + mortar requirements
- "Best prices on steel rebar" → Current market prices + deals

---

## 5. Design System

### 5.1 Color Palette

**Primary (Construction Yellow):**
```css
--primary-400: #facc15;  /* Main accent */
--primary-500: #eab308;  /* Hover state */
--primary-600: #ca8a04;  /* Active state */
```

**Slate (Industrial Gray):**
```css
--slate-800: #1e293b;    /* Card background */
--slate-900: #0f172a;    /* Page background */
--slate-700: #334155;    /* Borders */
```

**Semantic Colors:**
```css
--success: #22c55e;      /* Green */
--warning: #f97316;      /* Orange */
--danger: #ef4444;       /* Red */
--info: #3b82f6;         /* Blue */
```

### 5.2 Typography

**Font Families:**
- **Inter** - Body text, UI elements
- **Outfit** - Headings, display text

**Scale:**
- xs: 0.75rem
- sm: 0.875rem
- base: 1rem
- lg: 1.125rem
- xl: 1.25rem
- 2xl: 1.5rem
- 3xl: 1.875rem

### 5.3 Component Styles

**Glass Card:**
```css
.glass-card {
  background: rgba(30, 41, 59, 0.8);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(250, 204, 21, 0.2);
  border-radius: 16px;
}
```

**Primary Button:**
```css
.btn-primary {
  background: linear-gradient(135deg, #facc15, #eab308);
  color: #0f172a;
  box-shadow: 0 4px 14px rgba(250, 204, 21, 0.3);
}
```

### 5.4 Animations

- `animate-float` - Subtle vertical oscillation
- `animate-pulse-glow` - Glowing box-shadow pulse
- `animate-slide-up` - Entry animation from bottom
- `animate-fade-in` - Opacity transition

---

## 6. Data Models

### Material
```typescript
interface Material {
  id: string;
  name: string;
  category: MaterialCategory;
  quantity: number;
  unit: string;
  imageUrl?: string;
}
```

### Supplier
```typescript
interface Supplier {
  id: string;
  name: string;
  logo: string;
  type: 'chain' | 'independent';
  rating: number;
  deliveryTime: string;
}
```

### Price Quote
```typescript
interface PriceQuote {
  supplierId: string;
  supplierName: string;
  price: number;
  originalPrice?: number;  // For discounts
  inStock: boolean;
  stockQuantity?: number;
  deliveryFee: number;
  deliveryDays: number;
  distance: number;
  lastUpdated: Date;
}
```

### Comparison Result
```typescript
interface ComparisonResult {
  material: Material;
  quotes: PriceQuote[];
  bestPrice: PriceQuote | null;
  averagePrice: number;
  potentialSavings: number;
}
```

---

## 7. Mock Backend Logic

### Price Generation
Prices are generated with variance to simulate market conditions:
```typescript
const variance = (Math.random() - 0.5) * 0.3; // ±15%
const price = basePrice * (1 + variance);
```

### OCR Simulation
File names are analyzed to return contextually relevant materials:
- Files containing "brick" → Brick materials + cement + sand
- Files containing "roof" → Timber + roofing sheets
- Default → Cement + bricks + steel + sand

### AI Response Generation
Keyword matching triggers specific responses:
- "cement/concrete" → Cement pricing and calculation
- "brick" → Brick quantities and pricing
- "steel/rebar" → Steel market info
- "paint" → Paint pricing and coverage
- "timber/wood" → Timber pricing

---

## 8. Responsive Design

**Breakpoints:**
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

**Adaptations:**
- Navigation collapses to hamburger menu on mobile
- Grid layouts adjust from 1 to 4 columns
- AI Concierge adjusts main content margin
- Tables become horizontally scrollable

---

## 9. SEO Implementation

```typescript
export const metadata: Metadata = {
  title: "BuildCompare SA | Smart Price Comparison for Contractors",
  description: "South Africa's premier construction materials price comparison platform...",
  keywords: "construction, building materials, price comparison, South Africa...",
  openGraph: {
    title: "BuildCompare SA | Smart Price Comparison for Contractors",
    description: "Compare building material prices across South Africa's top suppliers",
    type: "website",
    locale: "en_ZA",
  },
};
```

---

## 10. Future Enhancements

> Historical note: the original Phase 2/3 items (Supabase auth + database,
> live supplier scraping, LLM integration) shipped during the tender-pivot
> refactor — implemented with Supabase, Playwright/Browserbase, and the
> DeepSeek → Groq provider chain rather than the tools listed back then.

### Phase 2 - Hardening (current)
- Server-side Supabase session checks on every API route
- Distributed rate limiting (Upstash/Redis) to replace the in-memory limiter
- Replace the `xlsx` npm package (unfixed upstream CVEs) with `exceljs`/SheetJS CDN
- BUCO and Build it scraper selector tuning against the live sites

### Phase 3 - Advanced Features
- Order placement through platform
- Delivery tracking
- Supplier reviews and ratings

### Phase 4 - Mobile App
- React Native or Flutter app
- Push notifications for price drops
- Offline material scanning
- QR code scanning for products

---

## 11. Performance Considerations

- Component lazy loading for routes
- Image optimization with Next.js Image
- Minimal JavaScript bundle size
- CSS-in-JS avoided for better performance
- Efficient re-renders with proper key usage

---

## 12. Deployment

Recommended platforms:
- **Vercel** (optimal for Next.js)
- **Netlify**
- **AWS Amplify**

Build command:
```bash
npm run build
```

Environment variables required for production (see `.env.example`):
```env
DEEPSEEK_API_KEY=<canonical AI provider — required>
GROQ_API_KEY=<fallback AI provider — optional>
NEXT_PUBLIC_SUPABASE_URL=<supabase project url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase anon key>
SCRAPER_URL=<deployed scraper microservice url>
```

---

## 13. Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Access the application at: http://localhost:3000

---

*Document Version: 1.0*
*Last Updated: December 2024*
*Created for: BuildCompare SA Prototype*
