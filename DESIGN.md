# Sijil UI design system

One stylesheet (`ui/styles.css`), no build step. The **last section ("DESIGN SYSTEM v3")** holds the tokens and the shared
component rules; earlier sections are layout. When you add UI, reuse these instead of inventing new values.

## Tokens
| Group | Tokens | Use |
|---|---|---|
| Radius | `--r-xs` 8 · `--r-s` 10 · `--r-m` 16 · `--r` 20 · `--r-xl` 24 · `999px` | chips & segment thumbs · inputs/buttons/rows · bars & cards · tiles & panels · sheets · pills |
| Motion duration | `--d-fast` .16s · `--d-base` .28s · `--d-slow` .44s · `--d-spring` .6s | hover/colour · small moves · bars & panels · bouncy |
| Motion easing | `--ease` (settles) · `--spring` (overshoots) | use `--spring` for things that "arrive", `--ease` for things that slide |
| Type | one family --font; weights 400 (text) and 600 (emphasis); sizes --fs-2xs 10 (chart axes, calendar) · --fs-xs 11 (meta, labels) · --fs-s 12 (controls) · --fs-m 13 (body) · --fs-l 15 (panel titles) · --fs-xl 17 (dialog titles); display numbers 22 (KPI) and 30 (rings); phone layout uses 14/16 (16 keeps iOS from zooming inputs) | never add another size or weight |
| Spacing | `--g` 16px gutter, 4/8 px grid, `--h` 32px control height | |
| Colour | `--bg --surface --sunk --ink --muted --line --accent --danger --gold --ok` and the chart palette `--c1…--c8` | all defined for light and dark |

## Status colours (completed / in progress / not done)
`--st-done-bg/-fg`, `--st-prog-bg/-fg`, `--st-todo-bg/-fg` — a background with its own readable foreground, per theme.
Never colour the text alone. Use `.pill.ok / .prog / .todo`, the `.st-done / .st-progress / .st-todo` helpers on KPI cards and
buttons, or a status `.seg` (its sliding thumb takes the colour from `data-st` / `data-v` / `data-s`).

Contrast (WCAG): status pairs 5.3–10.1 : 1; body text on surfaces ≥ 4.6 : 1; accent buttons ≥ 5.4 : 1 (light) / 7.8 : 1 (dark).
Custom accent colours pick white or near-black text automatically (`inkFor()` in `app.js`).

## Components
- **Buttons**: `.btn` (neutral) · `.pri` (primary) · `.btn.sm` · `.btn.dan` · `.iconbtn` · `.ghost`. One press feedback (`scale(.97)`), one focus ring (`:focus-visible`).
- **Segmented control / "slider"**: `.seg > button[aria-pressed]`; the thumb is added by `segEnsure()` and slides with `--spring`.
- **Bars** (due, backup, works list, entry): hidden bars slide with `grid-template-rows` (`barShow()`), the entry bar with `slideBar()`, KPI and filter rows collapse through the animated `--kh` / `--fh` custom properties. Same easing and duration everywhere.
- **Calendar**: tile calendar (`.cal button`) and date picker (`.dp-d`) share the cell radius (`--r-xs`), the *today* ring and the *selected* ring.
- **Shake**: `.lockbox.shake` — damped swing (`fidShake`) plus a red flash (`fidFlash`) so the error is not motion-only.
- **Reduced motion**: `prefers-reduced-motion` turns all animation and transitions off.

## Checklist before merging UI work
0. Run the UI audit (see below). 1. Both themes (⋯ → Appearance). 2. Phone width (≤ 700px) and a wide desktop window. 3. Only token radii, durations and easings.
4. Status shown with background + foreground, never colour-only text. 5. Arabic (RTL) and English (LTR).
## Automated audit
Run the app in a throwaway profile with remote debugging and evaluate `audit.js` (kept with the build scripts) at
1920×1080, 1440×900, 1280×720, 1024×768 and 390×844, light and dark, Arabic and English. It fails on: page or element
overflow, clipped text, content spilling out of a box, overlapping blocks, text contrast below 4.5:1 (3:1 for large
text), radii outside the token scale, misaligned entry-bar controls, uneven column gaps, tiles not filling the
dashboard, and bars without a transition. The release bar is **zero findings in all 20 combinations**.

## Layout (desktop, ≥ 1181 × 601)
Reminder side bar (always the screen's right edge) · resize grip · dashboard · split grip · works list.
`--rw` (side-bar width) and `--sp` (dashboard share) are animated custom properties set from the saved layout;
the grips change them live. Tiles live in a 3-column grid; each can span 1–3 columns and 1–2 rows (customize mode,
corner handle). Below that size the page stacks into one scrolling column.