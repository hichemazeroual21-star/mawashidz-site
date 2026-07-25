# MawashiDZ Product Design System

**Status:** Phase 1 elevated foundation  
**Audience:** Engineers and designers shipping authenticated product surfaces  

## Principles

1. **Calm trust** — livestock commerce needs authority, not novelty.
2. **RTL-first** — Arabic is primary; layout must not fight direction.
3. **One job per surface** — each panel has one headline and one primary action.
4. **Server is truth** — UI never invents privilege; RLS/RPC decide.
5. **Timeless over trendy** — no purple glow kits, no sticker UI, no template cards in heroes.

## Tokens

Defined in `assets/mdz-design-system.css`:

| Token family | Examples |
|--------------|----------|
| Color | `--mdz-ink`, `--mdz-brand`, `--mdz-accent`, `--mdz-danger`, `--mdz-warn`, `--mdz-success` |
| Surface | `--mdz-surface`, `--mdz-surface-elevated`, `--mdz-surface-sunken`, `--mdz-line` |
| Radius | `--mdz-radius-sm` (8), `--mdz-radius` (12), `--mdz-radius-lg` (18) |
| Shadow | `--mdz-shadow-sm`, `--mdz-shadow`, `--mdz-shadow-lg` |
| Space | `--mdz-space-1`…`--mdz-space-6` (4–32px) |
| Type | IBM Plex Sans Arabic via `--mdz-font` |
| Motion | `--mdz-motion` 160ms; honor `prefers-reduced-motion` |

## Component rules

- **Buttons:** `.mdz-btn` + `.mdz-btn-primary` / `.mdz-btn-ghost` / `.mdz-btn-danger`. One primary per cluster.
- **Tabs:** underline `.mdz-tabs` / `.mdz-tab` — not candy pills.
- **Lists:** `.mdz-item` with inset unread cue — not bordered card grids.
- **Empty / loading:** `.mdz-empty` and `.mdz-skeleton` required before shipping a new list.
- **Dialogs:** `.mdz-dialog-backdrop` + `.mdz-dialog` for destructive or reason capture — never `window.prompt`.
- **Status:** `.mdz-status.is-*` with i18n labels — never raw enums to members.

## Interaction rules

- Focus rings use `--mdz-focus`.
- Escape closes dialogs; overlay click cancels.
- Deep links (`#account-support`, `#account-inbox`, `#account-request`) must open the matching account tab.

## Accessibility

- Dialogs set `role="dialog"`, `aria-modal`, labelled title.
- Bell badge exposes count via `aria-label`.
- Color is never the only status signal — text label required.

## Naming

- CSS: `mdz-*` BEM-ish (`mdz-btn-primary`, not ad-hoc greens).
- i18n keys: `notif*`, `ticket*`, `ops*`, `dash*`.
- SQL RPCs: descriptive verbs (`create_support_ticket`, `count_my_unread_notifications`).

## Do not

- Add Inter/Roboto as product UI fonts.
- Ship purple gradient admin themes.
- Put operator queues behind undocumented `prompt()` flows.
- Show `in_review` / `waiting_for_member` raw strings to end users.
