# Product Decision Records (PDR)

PDRs capture **important product and architecture choices** so future contributors (humans, Cursor, Claude) do not re-litigate settled questions.

## Format

Each PDR includes: **Title**, **Reason**, **Alternatives considered**, **Decision**, **Consequences**, and **References**.

## Index

| ID | Title | Status |
|----|--------|--------|
| [PDR-001](./PDR-001.md) | Smart Workspace replaces traditional Dashboard | Accepted |
| [PDR-002](./PDR-002.md) | Card Provider architecture | Accepted |
| [PDR-003](./PDR-003.md) | Platform event bus | Accepted |
| [PDR-004](./PDR-004.md) | Hub lazy loading (top four cards) | Accepted |
| [PDR-005](./PDR-005.md) | Server-side workspace preferences | Accepted |

## Adding a PDR

1. Copy the structure from an existing PDR.  
2. Use the next number: `PDR-006.md`.  
3. Set **Status**: Proposed → Accepted (Founder approval in PR).  
4. Link from [PRODUCT_CONSTITUTION.md](../PRODUCT_CONSTITUTION.md) if strategic.  
5. Update [../README.md](../README.md) **Last updated** date.

To **supersede** a decision: keep the old PDR, set status to **Superseded by PDR-NNN**, and write the new record—do not delete history.
