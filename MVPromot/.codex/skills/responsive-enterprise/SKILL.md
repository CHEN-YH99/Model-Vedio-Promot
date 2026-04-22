---
name: responsive-enterprise
description: Enterprise-grade responsive layout and adaptive UI implementation skill for web pages and frontend components. Use when Codex needs to fix, design, refactor, or review responsive behavior across desktop, laptop, tablet, foldable, and mobile viewports; when pages overflow, collapse poorly, misalign, crop content, break typography, cause touch/scroll issues, or need production-ready multi-breakpoint behavior with accessibility and maintainability requirements.
---

# Responsive Enterprise

Build and repair responsive interfaces with production standards, predictable breakpoints, accessible interaction, and maintainable CSS structure.

Use this skill to avoid one-screen hacking. A page that only survives on your own monitor is not responsive; it is self-deception with a viewport.

## Workflow

Follow this sequence unless the repository already enforces a stronger design-system process:

1. Audit the layout structure before editing.
2. Identify overflow, clipping, fixed-dimension, and breakpoint-coupling risks.
3. Define the smallest breakpoint model that solves the page cleanly.
4. Convert layout rules to fluid sizing first, then add breakpoint overrides only where needed.
5. Verify typography, spacing, media, navigation, forms, tables/cards, and touch targets.
6. Check for regressions on common enterprise widths before finishing.

## Start With Structure

Inspect the existing layout tree first:

- Find wrappers with fixed `width`, `height`, `min-width`, absolute positioning, or hard-coded gaps.
- Find places where `100vw` causes horizontal scroll because padding, scrollbar width, or transforms were ignored.
- Find hero areas, cards, grids, nav bars, sidebars, tables, dialogs, and forms that assume a single screen size.
- Prefer repairing parent layout constraints before patching children one by one.

Treat these as smell by default:

- Pixel-locked widths for content containers
- Fixed heights on text-heavy blocks
- Large one-off media queries with duplicated declarations
- Hiding core content on mobile to fake responsiveness
- Separate desktop/mobile markup unless the product already depends on it

## Breakpoint Strategy

Default to a mobile-first cascade.

Use content-driven breakpoints, but anchor them around practical ranges:

- `0-479px`: compact phones
- `480-767px`: large phones / small portrait devices
- `768-1023px`: tablets
- `1024-1439px`: laptops / small desktops
- `1440px+`: large desktop refinement

Do not add all of them mechanically. Start with fluid rules and only introduce the minimum set needed for layout stability.

Prefer:

- `clamp()` for font sizes, spacing, and section padding
- `minmax()` with CSS Grid for card lists and dashboards
- `flex-wrap` before adding narrow-device overrides
- container-aware sizing when the codebase already uses container queries

Avoid:

- breakpoint spam for tiny visual nudges
- JS-driven resize logic for problems CSS can solve
- coupling business logic to viewport width unless behavior genuinely differs

## Layout Rules

Apply these rules by default:

- Use `box-sizing: border-box`.
- Allow rows and toolbars to wrap when labels, filters, or buttons grow.
- Cap line length for reading content.
- Replace fixed multi-column layouts with grid/flex patterns that collapse naturally.
- Make sidebars stack below content on narrow widths unless persistent navigation is required.
- Keep sticky headers/sidebars from covering anchored content.

Use width patterns such as:

- `width: min(100%, <max-width>)`
- `grid-template-columns: repeat(auto-fit, minmax(<card-min>, 1fr))`
- `flex: 1 1 <basis>`

Be careful with:

- `overflow: hidden` masking bugs
- `position: absolute` on essential content
- `vh` on mobile browser UI chrome; prefer `svh`, `dvh`, or resilient fallbacks when needed
- tables that cannot shrink; convert to card/list patterns if dense data becomes unreadable

## Typography And Spacing

Keep text readable across widths:

- Scale headings and section spacing with `clamp()`.
- Reduce decorative whitespace before reducing legibility.
- Maintain clear hierarchy when stacking content.
- Keep tappable controls large enough for touch interaction.

If a section becomes cramped, first reduce columns, then gap, then decorative elements. Do not crush body text into nonsense just to preserve desktop composition.

## Media And Visual Assets

For images, videos, and illustrations:

- Ensure `max-width: 100%` and appropriate intrinsic ratio handling.
- Use `object-fit` intentionally; do not crop meaningful content by accident.
- Serve different art direction only when the design actually requires it.
- Keep background decoration from blocking content or interaction on small screens.

For banners/heroes:

- Reflow text above or below media on narrow widths.
- Reposition decorative shapes so they do not create horizontal overflow.
- Remove unnecessary fixed heights.

## Components And Patterns

Apply these expectations:

- Navigation: collapse gracefully, preserve key actions, prevent wrap collisions.
- Forms: stack fields cleanly, keep labels visible, avoid tiny inline layouts on mobile.
- Cards: maintain consistent internal spacing and action alignment across row/column changes.
- Data views: prefer horizontal scroll only as a last resort; consider priority columns, cards, or summaries.
- Modals/drawers: fit within viewport, preserve scroll, and keep dismiss controls reachable.

## Accessibility And Interaction

Responsive work is incomplete if interaction fails:

- Keep touch targets at usable size.
- Preserve focus visibility after layout changes.
- Avoid hover-only affordances for important actions.
- Ensure zoom to `200%` does not hide content or functionality.
- Keep reading and tab order aligned with the visual order.

## Implementation Rules

When editing code:

- Reuse existing design tokens, spacing scale, breakpoints, and utility classes if the repo already has them.
- Centralize new breakpoint tokens or CSS variables instead of scattering magic numbers.
- Prefer small structural fixes over giant override blocks.
- Add concise comments only when a responsive constraint is non-obvious.
- If the current page fights the layout system everywhere, refactor the container structure instead of stacking emergency patches.

## Validation

Before finishing, verify at least these widths when the stack allows it:

- `375x812`
- `430x932`
- `768x1024`
- `1024x768`
- `1280x800`
- `1440x900`

Check:

- no unintended horizontal scroll
- no clipped text or controls
- no unusable hover/touch behavior
- no broken alignment in wrapped layouts
- no modal, drawer, or sticky element escaping the viewport

For a deeper acceptance list, read [references/responsive-checklist.md](references/responsive-checklist.md).

## Output Expectations

When reporting work back:

- State which layouts or components were repaired.
- Mention the breakpoint or fluid-sizing strategy used.
- Mention what was verified and what could not be verified.
- Call out residual risks if a page still depends on third-party embeds, fixed canvases, or legacy table layouts.
