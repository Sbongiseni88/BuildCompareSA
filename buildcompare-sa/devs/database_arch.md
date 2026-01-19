# Database Architecture Specification

## 1. Overview
The system uses a hybrid approach: **PostgreSQL** for relational data (Projects, Users, Pricing) and **ChromaDB** (or similar Vector Store) for AI context memory.

## 2. Dependencies
- **WAIT FOR**: Backend Service (to consume the schema).

## 3. Relational Schema (PostgreSQL)

### Core Tables
1.  **Users**
    - `id` (UUID), `email`, `role` (Contractor/Supplier/Admin), `created_at`.
2.  **Projects**
    - `id`, `user_id` (FK), `name`, `location_data` (JSONB), `budget` (Decimal).
3.  **Materials** (Global Catalog)
    - `id`, `name`, `category`, `uom` (Unit of Measure).
4.  **Prices** (TimeSeries-like)
    - `id`, `material_id` (FK), `supplier_id` (FK), `price_zar` (Decimal), `timestamp`.
    - *Note:* This table will grow fast. Consider partitioning by month.

### Security
- **Row Level Security (RLS)**: Must be enabled.
- Policy: Users can only `SELECT/UPDATE` rows in `Projects` where `user_id == auth.uid()`.

## 4. Vector Store (ChromaDB) for AI RAG

### Collections
- **`building_codes`**:
    - Chunks of SANS 10400 / NHBRC PDF documents.
    - Metadata: `{ section: "Foundations", page: 12 }`.
- **`product_knowledge`**:
    - Descriptions of materials (e.g., "Corobrik Satin vs Travel").

### Embedding Model
- Use `text-embedding-3-small` or an open-source alternative like `all-MiniLM-L6-v2` for generating embeddings.

## 5. Offline Capabilities
- Use **RxDB** or **PouchDB** on the client-side to assume a local replica of the `Projects` table, syncing to PostgreSQL when online.

---
*Created by Lead Systems Architect*
