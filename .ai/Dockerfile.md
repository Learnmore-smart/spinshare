# Dockerfile

> Last updated: 2026-06-20 | Protection: STANDARD

## Purpose
Multi-stage Docker build for the SpinShare Next.js web app (Cloud Run).

## Planned Change 2026-06-20 GA build arg

- Accept `NEXT_PUBLIC_GA_MEASUREMENT_ID` as a build-time `ARG` in the builder stage.
- Export it as `ENV` before `pnpm --filter @spinshare/web build` so GA4 is baked into the client bundle.
- `NEXT_PUBLIC_*` values are not available from Cloud Run runtime env alone; they must be present at image build.

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-20 | Add `NEXT_PUBLIC_GA_MEASUREMENT_ID` build arg for reproducible GA4 in production images. | Cursor |
