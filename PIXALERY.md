# Pixalery fork of Immich

This repository is a **modified version of [Immich](https://github.com/immich-app/immich)**
(AGPL-3.0, see `LICENSE`), maintained for [Pixalery](https://pixelary.com). Branch
`pixalery-latest` carries the modifications as a short series of commits rebased onto each
upstream release tag; every deployed state is tagged `pixalery-v<upstream version>`.

Modifications (see `git log v<upstream version>..pixalery-latest`):

- **Branding**: Pixalery logos, icons, app name and links in web, server e-mails and mobile
  (`design/pixalery/`, `web/src/lib/brand.ts`, `mobile/lib/constants/constants.dart`).
- **Shared links with `allowDelete`**: album shared links may allow visitors to move assets to the
  trash (`DELETE /assets?key=...`).
- **Album faces**: `GET /albums/:id/faces` returns the detected faces of all album assets and the
  recognised people in one call. A shared link may call it and sees the owner's people, without
  the hidden ones (nothing at all when the link hides metadata).
  `GET /albums/:id/faces/:personId/thumbnail` serves the face thumbnail of one of those people,
  since `/people/:id/thumbnail` refuses shared links.
- **`/shared-album/[slug]` web page**: a Pixalery-themed shared album page with the trash action, a
  fixed "Upload photos" button and, on a link with `allowDelete`, a Settings link to
  `/shared-album/<slug>/settings` (no page of the web app: the deployment's edge proxy redirects it)
  and a people row (`AlbumPeopleFilter`) that narrows the album down to one person.
- **Build**: `server/Dockerfile` adjustments so the fork builds outside upstream CI.

The web UI offers this source to every visitor of a shared link (the GitHub icon next to the
theme switch), as required by AGPL-3.0 section 13.
