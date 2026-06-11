---
name: boq_regex_structural_parser
description: Cleanly parse messy South African Bills of Quantities (BoQ) without losing structural context. Extracts Item Ref, Material Description, Unit, Quantity, and an industry Category — never collapses lines to a generic "other" and never substitutes the item index for the description. Use when transforming raw BoQ text (from PDF/Excel/OCR) into structured line items for pricing.
---

# BoQ Structural Parser

## When to use
- BoQ ingestion in `src/lib/boq-engine.ts`
- DeepSeek extraction prompt assembly for `/api/boq/process`
- Any place a line item is built from raw rows

## Invariants (defensive assertions)

1. `description` MUST contain a literal material noun. Reject if:
   - it matches `/^\s*\d+(\.\d+)?\s*$/` (pure number — that's an item ref)
   - it matches `/^item\s*\d+/i`
   - it equals `item_ref`
2. `category` MUST be one of the 8 industry categories below. The value `'other'` is rejected and triggers a re-prompt.
3. `qty` is positive and finite.
4. `unit` is non-empty.

## Industry categories (canonical 8)

```
Preliminaries
Concrete
Masonry
Structural Steel
Openings
Electrical
Plumbing
Finishes
```

Use these strings verbatim in the `category` field — downstream BCCEI labour mapping keys on the exact spelling.

## Recommended regex starters

```ts
// Item ref: "1.01", "2.3.4", "A1", "P.001"
const ITEM_REF_RE = /^(?:[A-Z]\.?)?\d+(?:[.\-]\d+)*$/;

// Common SA construction units (kept loose; add as the corpus grows)
const UNIT_RE = /\b(m|m2|m²|m3|m³|kg|t|ton|no|nr|each|item|pcs?|sum|sqm|cum|lin\.?m|lm|l|ltr|kn|hr)\b/i;

// Quantity heuristic: number with optional decimal, optional thousands separator
const QTY_RE = /\b(\d{1,3}(?:[ ,]?\d{3})*(?:[.,]\d+)?)\b/;
```

## DeepSeek prompt scaffold

```
You are a quantity surveyor extracting structured line items from a South African Bill of Quantities. For each row, output JSON: { "item_ref", "description", "unit", "qty", "category" }.

Rules:
- "description" must be the LITERAL material/work string from the row. Never substitute the item reference, row number, or section header.
- "category" must be exactly one of: Preliminaries, Concrete, Masonry, Structural Steel, Openings, Electrical, Plumbing, Finishes. Never "other".
- Preserve SA-specific terms verbatim ("Cemcrete Portland 50kg", "NFP brick", "Y10 rebar", "20A SP MCB").
- If a row is a heading or sub-total, omit it (do not invent an item).

Return ONLY a JSON array, no prose.
```

## Failure handling

If the model returns an item violating any invariant, the parser must:
1. Log the violating row with `{ source: 'deepseek', reason }`.
2. Drop the row OR re-prompt once with the violation reason appended.
3. Never silently coerce description to the item ref or category to "other".