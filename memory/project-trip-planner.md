---
name: project-trip-planner
description: Trip Planner + Maps + Affiliates feature — architecture decisions and current state
metadata:
  type: project
---

Trip Planner feature fully implemented per IDD (2026-05-16).

**Why:** Add trip planning with Google Maps, stop geocoding, and affiliate booking links to PulseForge.

**How to apply:** When working on trips/stops/affiliates, refer to the IDD in the conversation; all files are in place and passing tsc.

## Key decisions made

- Free tier capped at **3 trips** (HTTP 402 when limit reached); Pro/Admin = unlimited. Lives in `trips.service.ts::TRIP_LIMITS`.
- `TripStop` entity has no `country` column — country is passed separately to `AffiliateGeneratorService.generateLinks(stop, country)`.
- TypeORM `create()`/`save()` overload resolution requires `as unknown as T` casts throughout trips/stops/affiliates services.
- `import.meta.env` in `TripMap.tsx` suppressed with `// @ts-ignore`; root tsconfig treats UI files as CJS but Vite handles the actual UI build.
- `SharedTripPage` route (`/trips/shared/:token`) is placed **outside** `ProtectedRoute` in App.tsx so no auth is needed.
- `TripDetailPage` (`/trips/:id`) is placed inside `ProtectedRoute` but outside the `Layout` wrapper — it uses its own full-viewport two-column layout (sidebar + map).
- Geocode worker: concurrency 3, updates trip center lat/lng after each successful geocode.

## New files added

**Backend:**
- `libs/database/src/entities/trip.entity.ts`
- `libs/database/src/entities/trip-stop.entity.ts`
- `libs/database/src/entities/affiliate-link.entity.ts`
- `libs/database/src/entities/affiliate-click.entity.ts`
- `apps/gateway/src/maps/` (MapsService, MapsModule)
- `apps/gateway/src/affiliates/` (AffiliatesService, AffiliatesController, AffiliateGeneratorService, AffiliatesModule)
- `apps/gateway/src/trips/` (TripsService, StopsService, TripsController, TripsModule + 5 DTOs)
- `apps/worker-geocode/src/` (GeocodeService, GeocodeProcessor, AppModule, main.ts)

**Frontend:**
- `apps/ui/src/pages/TripsPage.tsx`
- `apps/ui/src/pages/TripDetailPage.tsx`
- `apps/ui/src/pages/SharedTripPage.tsx`
- `apps/ui/src/components/TripMap.tsx` (@react-google-maps/api)
- `apps/ui/src/components/TripSidebar.tsx` (@dnd-kit for reordering)
- `apps/ui/src/components/StopPopup.tsx`
- `apps/ui/src/components/AffiliateBookingRow.tsx`
- `apps/ui/src/components/CreateTripModal.tsx`
- `apps/ui/src/components/BulkImportModal.tsx`

## Env vars required

```
GOOGLE_MAPS_API_KEY=
GOOGLE_PLACES_API_KEY=
VITE_GOOGLE_MAPS_API_KEY=
BOOKING_COM_AFFILIATE_ID=
KLOOK_AFFILIATE_ID=
VIATOR_PARTNER_ID=
GETYOURGUIDE_PARTNER_ID=
SKYSCANNER_AFFILIATE_ID=
```
