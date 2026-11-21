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
- **`/shared-album/[key]` web page**: a Pixalery-themed shared album page with the trash action, a
  fixed "Upload photos" button and, on a link with `allowDelete`, a Settings link to
  `/shared-album/<key>/settings` (no page of the web app: the deployment's edge proxy redirects it).
- **Build**: `server/Dockerfile` adjustments so the fork builds outside upstream CI.

The web UI offers this source to every visitor of a shared link (the GitHub icon next to the
theme switch), as required by AGPL-3.0 section 13.
