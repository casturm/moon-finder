# Independent requirements review

Status: static acceptance review complete; both identified findings fixed and statically verified. Independent runtime evidence remains separate.

Reviewed the approved `docs/requirements.md` against the implementation worktree at `/Users/chris/.codex/worktrees/moon-product/moon-finder`. This review examined the working files (`app.js`, `moon-model.js`, `index.html`, `style.css`), not a committed release revision. No application files were changed by this reviewer.

## Static findings

1. **Repeated compass announcements:** `handleOrientation` calls `compassStatus` for every valid sensor event; `compassStatus` rewrites the `role="status"` node even when its message is unchanged. This can repeatedly announce the same message to assistive technology. The approved requirement calls for announcing state changes without repeatedly announcing sensor updates. Fixed: the status node is now written only when its message changes; verified in the current working file.
2. **Restored page loses sensor monitoring:** `pagehide` removes sensor listeners while leaving compass visibility and active state intact. There is no `pageshow` recovery for a browser back/forward-cache restoration. The restored page can display active guidance without receiving headings. Fixed: pagehide invalidates pending permission, removes the listener, clears heading, and resets the visible controls/state to hidden; pageshow refreshes live time and renders. Verified in the current working file.

## Behavior supported by code inspection

- The illuminated path uses the projected spherical terminator and one common disk center/radius. It continuously spans new through full without layered translucent shadow shapes.
- Local orientation uses bright-limb angle minus parallactic angle; location-dependent labels remain unavailable until location succeeds.
- Date input, calendar-day steps, playback, and Now use shared selected state for lunar calculations and compass target. Playback pauses on manual change and when hidden; bounds are enforced.
- Debug diagnostics require the exact URL value `debug=1` and are not persisted. Routine diagnostic console logging is absent.
- The compass starts hidden, retains its visibility control, guards pending permission races, validates heading sources, applies declination to magnetic headings, times out without a usable heading, and normalizes turn direction.
- Mobile layout, visible labels, focus outlines, status text, and touch targets are present in the source.

No unresolved static acceptance findings remain. This is not runtime or physical-device approval.

## Evidence still required

Static review does not establish visual geometry quality, bright-limb correctness against independent fixtures, browser date/DST behavior, responsive layout, screen-reader behavior, or physical sensor accuracy. Independent test results must identify their tested revision and distinguish browser mocks from real-device coverage. Code approval, integration, and release remain with the tech lead.
