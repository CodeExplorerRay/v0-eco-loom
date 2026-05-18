# Emissions Factor and Compliance Roadmap

This checklist turns the current emissions-factor audit into a concrete implementation plan for Eco-Loom.

## Goal

Upgrade Eco-Loom from a lightweight hardcoded factor workflow into a standards-aligned carbon accounting layer with:

- versioned emission factors
- server-side factor enforcement
- stronger auditability
- clearer standards mapping
- better verification readiness

## Phase 1: Replace Hardcoded Factors

- [ ] Create a dedicated emission factor service module, for example `src/lib/emissions/factor-service.ts`
- [ ] Move the hardcoded `EPA_EMISSION_FACTORS` array out of `src/lib/epa/factors.ts`
- [ ] Define a normalized factor source model:
  - `source`
  - `year`
  - `region`
  - `scope`
  - `sourceType`
  - `activityUnit`
  - `factor`
  - `factorUnit`
  - `gwpBasis`
  - `methodology`
  - `description`
- [ ] Seed a first controlled library using EPA 2025 defaults for supported US activity types
- [ ] Mark non-EPA values explicitly instead of mixing them into the EPA library
- [ ] Add support for future factor source families:
  - EPA
  - DEFRA
  - eGRID
  - custom verified factor sets

## Phase 2: Upgrade the Data Model

- [ ] Add factor provenance fields to `CarbonLedgerEntry`
- [ ] Store the factor used at the time of calculation, not just the numeric result
- [ ] Add a foreign key from `CarbonLedgerEntry` to `EmissionFactor`
- [ ] Add fields like:
  - `emissionFactorId`
  - `factorSource`
  - `factorYear`
  - `factorRegion`
  - `gwpBasis`
  - `calculationMethod`
  - `scopeMethod`
- [ ] Add a migration path for existing entries with legacy factors
- [ ] Keep historical entries frozen to the factor version used at calculation time

## Phase 3: Enforce Server-Side Calculations

- [ ] Remove trust in client-supplied `emissionFactor`, `emissionFactorUnit`, and `co2Equivalent` in `POST /api/ledger`
- [ ] Make the server calculate emissions from:
  - `sourceType`
  - `activityValue`
  - `activityUnit`
  - selected factor source/year/region
- [ ] Reject ledger submissions when no approved factor exists
- [ ] Add a controlled override flow for admins when a custom factor is required
- [ ] Log every override with reason, actor, and timestamp
- [ ] Ensure update flows recompute emissions from the approved factor service instead of reusing stale values blindly

## Phase 4: Standards Alignment

### GHG Protocol

- [ ] Add explicit support for Scope 1, Scope 2, and Scope 3 category handling
- [ ] Add Scope 2 methodology fields:
  - `locationBased`
  - `marketBased`
  - `scope2Method`
- [ ] Add reporting boundary configuration:
  - operational control
  - financial control
  - equity share
- [ ] Add exclusions and assumptions tracking per company

### ISO 14064

- [ ] Add inventory methodology notes at company level
- [ ] Add base year and recalculation policy fields
- [ ] Add uncertainty / estimation notes on entries where exact activity data is unavailable
- [ ] Add verification status fields beyond simple admin verification

### CDP Readiness

- [ ] Add disclosure metadata for emissions methodology
- [ ] Add factor source and reporting basis fields to exports
- [ ] Add reporting completeness indicators
- [ ] Add category-level rollups for Scope 3 reporting support

## Phase 5: Audit and Verification Hardening

- [ ] Expand `AuditLog` so factor changes and recalculations are explicitly traceable
- [ ] Add dedicated actions such as:
  - `factor_applied`
  - `factor_override`
  - `factor_recalculated`
  - `methodology_changed`
- [ ] Capture old vs new factor details for recalculated entries
- [ ] Preserve source-document linkage for every ledger entry
- [ ] Add a verification evidence section to ledger details
- [ ] Add verifier-friendly exports summarizing:
  - factor source
  - factor year
  - methodology
  - actor trail
  - source evidence

## Phase 6: UI and Admin Controls

- [ ] Add an admin-only factor library screen
- [ ] Show factor source, year, and region in ledger entry details
- [ ] Show whether a factor is:
  - official
  - custom
  - overridden
  - outdated
- [ ] Add warnings when a user is creating an entry with a deprecated factor set
- [ ] Add company-level methodology settings UI

## Phase 7: Import and Sync Rules

- [ ] Validate imported Notion ledger records against approved factor logic
- [ ] Prevent Notion imports from silently introducing unapproved factor values
- [ ] Mark imported entries as:
  - `matched_factor`
  - `custom_factor_required`
  - `manual_review_required`
- [ ] Add sync conflict handling when a Notion record has a CO2e value but not enough source data to recompute

## Phase 8: Reporting and Exports

- [ ] Include factor source/year in generated reports
- [ ] Include methodology summary in PDF and exported reports
- [ ] Add inventory notes covering:
  - standards basis
  - scope coverage
  - factor source set
  - reporting period
- [ ] Add an “assurance-ready export” for external reviewers

## Recommended Build Order

1. Create the factor service and seed EPA 2025 defaults
2. Add factor provenance fields to the schema
3. Enforce server-side calculations on ledger create/update
4. Add audit logging for factor selection and overrides
5. Add Scope 2 methodology support
6. Add admin factor library UI
7. Upgrade reporting and verification exports

## Immediate High-Value Tasks

- [ ] Replace the current `src/lib/epa/factors.ts` table with a versioned source-backed factor module
- [ ] Patch `src/app/api/ledger/route.ts` to stop accepting arbitrary client-supplied factors
- [ ] Patch `src/app/api/ledger/[id]/route.ts` to recompute from approved factors only
- [ ] Add `emissionFactorId` and provenance fields to `CarbonLedgerEntry`
- [ ] Seed the `EmissionFactor` table with EPA 2025 values for currently supported activity types

## Standards and Reference Sources

- GHG Protocol Corporate Standard
  - https://ghgprotocol.org/corporate-standard
- GHG Protocol Scope 2 Guidance
  - https://ghgprotocol.org/scope_2_guidance
- EPA GHG Emission Factors Hub
  - https://www.epa.gov/climateleadership/ghg-emission-factors-hub
- ISO 14064-1
  - https://www.iso.org/standard/66453.html
- ISO 14064-3
  - https://www.iso.org/standard/66455.html
- IPCC 2019 Refinement
  - https://www.ipcc-nggip.iges.or.jp/public/2019rf/
- CDP climate guidance
  - https://guidance.cdp.net/en/guidance

## Notes

- OECD, EDGAR, and Global Footprint Network should be treated as analytics or contextual reference layers, not the primary factor library for day-to-day corporate ledger calculation.
- Bureau Veritas and Carbon Footprint are verification or certification references, not the source of operational emission factors.
