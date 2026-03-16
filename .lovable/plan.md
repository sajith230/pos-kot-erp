

# Fix Tablet POS Layout

## Problem
At tablet width (768-1023px), `isMobile` is false so both products and cart panels render side-by-side. The cart panel at `w-80` (320px) leaves only ~430px for the products grid — too cramped. The mobile tab switcher doesn't appear either.

## Solution
Use a dedicated `useIsTabletOrSmaller` check (< 1024px) for the POS layout instead of `useIsMobile` (< 768px). This way tablets get the tabbed Products/Cart interface, and the side-by-side layout only appears at desktop widths (≥1024px).

## Changes

**`src/pages/pos/RetailPOS.tsx`**
- Replace `isMobile` usage in the POS layout logic with a local `const isCompact = window.innerWidth < 1024` check (or reuse a media query)
- Simpler approach: just add a second state check using Tailwind's `lg:` breakpoint won't work here since it's JS-conditional rendering. Instead, create a local `useIsCompact` or just check `useIsMobile()` with a higher breakpoint
- Cleanest fix: add a `useMediaQuery` inline or change the conditional to use `window.innerWidth < 1024` via a state variable alongside `isMobile`

**Concrete approach**: Add `const [isCompact, setIsCompact] = useState(window.innerWidth < 1024)` with a resize listener, then replace all `isMobile` references in the POS layout (tab switcher, conditional rendering, cart width) with `isCompact`.

