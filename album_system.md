# Album System Design

The legacy single-category relationship is replaced by a modern album library. **Images remain independent records** and can be visible in multiple albums through a dedicated membership table. Deleting an album never deletes an uploaded image.

| Layer | Purpose | Behaviour |
|---|---|---|
| Library | A virtual, always-current view of every uploaded image. | Cannot be deleted or renamed. |
| Smart views | Deterministic automatic groups for **Screens**, **Project visuals**, and **Personal images**. | Built from persisted image classification; always update as uploads arrive. |
| Custom albums | User-created collections with a title, description, visibility, accent, presentation mode, cover, and ordering. | Fully createable, editable, reorderable, and deletable. |
| Album membership | Many-to-many image membership with ordering and source metadata. | Allows one image in multiple custom albums; removing a membership never removes the source image. |

> Automatic organization is intentionally deterministic rather than speculative. Filenames containing terms such as `screenshot`, `screen`, `capture`, or `screencap` are classified as **Screens**. Filenames containing terms such as `app`, `ui`, `mockup`, `design`, `figma`, `wireframe`, `dashboard`, or `interface` are classified as **Project visuals**. Other uploads are classified as **Personal images**. The classification is persisted and can be refined later with editable image metadata.

When filenames are not descriptive, an uploaded PNG with a substantial screen-sized canvas is classified as **Screens**. A wide, high-resolution image is classified as a **Project visual**. All remaining content stays in **Personal images**. These rules run on upload and are covered by unit tests.

The new schema removes the legacy `collections` table and the single `galleryImages.collectionId` field. It introduces `albums`, `albumImages`, and persisted `smartGroup` classification on images. The public gallery and slideshow use Library, Smart views, and custom album data only.

## Migration Outcome

The confirmed destructive cleanup has been completed: the legacy category table and its single-image category field were permanently deleted. Existing uploaded records were classified into the new smart groups. The database now retains only the new album model for image organization.
