<script lang="ts">
  // Link to the source of this modified Immich (AGPL-3.0 §13): rendered on every page a shared-link
  // visitor can reach, as a translucent icon fixed at the bottom center. Stacking relies on DOM order
  // (no z-index anywhere): pages render it right after <main>, so it paints above the page content,
  // while the control bar (later in the DOM) and the asset viewer (portaled to <body>) paint above it.
  import { BRAND_URLS } from '#lib/brand.ts';
  import { IconButton } from '@immich/ui';
  import { mdiGithub } from '@mdi/js';
  import { t } from 'svelte-i18n';
</script>

<div class="pointer-events-none fixed inset-x-0 bottom-3 flex justify-center">
  <IconButton
    class="pointer-events-auto opacity-50 transition-opacity hover:opacity-100 focus-visible:opacity-100"
    color="secondary"
    shape="round"
    variant="ghost"
    size="medium"
    icon={mdiGithub}
    href={BRAND_URLS.source}
    target="_blank"
    rel="noreferrer"
    aria-label={$t('source')}
    title={$t('source')}
  />
</div>
