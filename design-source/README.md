# Original design assets

These came out of `medilean_pixelmatch_single.html` as base64 blobs. They are
**screenshots of the design comp**, not photographs: the navigation, the quote
card, the headline and the strapline are painted into the pixels, and they are
tiny.

| File | Size | Problem |
| --- | --- | --- |
| `onboarding-side.png` | 118 x 304 | Renders at ~550px wide, a 5x upscale. "Better Health / Brighter Tomorrows" and "Physician-guided. Built for real life." are baked in, so any live text on top duplicates them. |
| `mobile-hero.png` | 114 x 163 | Same problem, too small for any real use. Currently unused. |

## What the app uses instead

- `public/img/hero-photo.png` — the photographic band of the original hero, with
  the baked-in UI cropped out and the right-hand side rebuilt from the scene's
  own background so the live cards sit over the photo.
- `public/img/onboarding-bg.png` — the text-free band of the onboarding panel,
  used as an out-of-focus backdrop behind real type. Blurring is what makes the
  low source resolution invisible.

## What to ask the designer for

Clean photographs, no UI painted in, at least 2400px on the long edge:

1. The hero portrait (landscape crop, subject right of centre).
2. The onboarding side image (portrait crop).
3. The mobile hero, if the marketing site still wants one.

Dropping them in is a one-line change per image in `src/app/page.tsx` and
`src/components/OnboardShell.tsx`. Nothing else depends on them.
