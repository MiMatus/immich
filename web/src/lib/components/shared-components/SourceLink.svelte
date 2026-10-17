<script lang="ts">
  // Link to the source of this modified Immich (AGPL-3.0 §13): rendered on every page a shared-link
  // visitor can reach, next to the theme button.
  import { BRAND_URLS } from '#lib/brand.ts';
  import { IconButton } from '@immich/ui';
  import { mdiGithub } from '@mdi/js';
  import { t } from 'svelte-i18n';
</script>

<IconButton
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
