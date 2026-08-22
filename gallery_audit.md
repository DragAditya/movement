# Gallery Experience Audit

The audit found eight connected issues that explain the current inconsistent behavior.

| Issue | Observed impact | Repair |
|---|---|---|
| Static demo source remains active | The public home, collections, detail pages, shared slideshow, and parts of the manager display seeded vase imagery instead of uploaded files. | Remove all client use of `galleryImages` and `galleryCollections` as runtime content; source every view from persisted gallery data. |
| Public gallery does not query persisted data | Uploaded images are not propagated from the manager to the public homepage or slideshow. | Add a public gallery data query and shared content mapping for public pages. |
| Admin mixes seed and uploaded data | The manager starts with four default images and six default categories, which makes real counts and selected moves misleading. | Start from persisted data only and render polished empty states when nothing has been uploaded. |
| Navigation is inconsistent | Public pages have a top header; admin uses only a sidebar. | Introduce a single shared gallery header with logo and a Gallery/Admin mode switch across both modes. |
| Manager copy and controls imply demo content | Default collection names, default covers, and generic counts are presented as real gallery data. | Remove default collection cards and derive names, covers, counts, and states from saved categories and images. |
| Empty gallery path is missing | Removing seeded images would leave the home page and public collections with unusable blank sections. | Add calm uploaded-content empty states with a direct Admin-mode action. |
| Public routes fall back to a default collection | Invalid or empty public collection URLs silently display demo images. | Show a clear unavailable/empty collection state instead. |
| Existing local-session uploads were not durable before persistence was added | Previously selected browser-session items can disappear on a refresh if they were uploaded before the database record workflow existed. | Use the persisted records as the source of truth going forward; surface an honest re-upload state for any legacy browser-only items. |

## Completed Repairs

The application now uses a single shared header across public and admin modes. It contains the **GALLERY** logo, page navigation on desktop, and a visible **Gallery/Admin** mode switch at every breakpoint. The admin workspace retains its purpose-specific sidebar on desktop and bottom navigation on mobile underneath that shared header.

All seeded vase imagery, seeded categories, and seeded collection fallbacks were removed from the live user experience. The public homepage, collection directory, collection detail, image viewer, and slideshow now use only persisted uploaded image records and persisted categories. The same persisted records drive Upload & Manage; no default images are inserted into the admin grid.

When no categories or images are available, the public surfaces now show concise empty states that guide the visitor to Admin mode. Invalid or empty shared slideshow routes show an unavailable state rather than falling back to unrelated images. Desktop and mobile screenshots confirm the common header and responsive mode switch; the TypeScript checker, test suite, production build, and inspected recent runtime logs completed without errors.
