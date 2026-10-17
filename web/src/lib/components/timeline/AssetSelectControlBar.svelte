<script lang="ts">
  import ControlAppBar from '#lib/components/shared-components/ControlAppBar.svelte';
  import { assetMultiSelectManager } from '#lib/managers/asset-multi-select-manager.svelte.ts';
  import { mdiClose } from '@mdi/js';
  import type { Snippet } from 'svelte';
  import { t } from 'svelte-i18n';
  import type { ClassValue } from 'svelte/elements';

  type Props = {
    class?: ClassValue;
    children?: Snippet;
  };

  let { class: className, children }: Props = $props();

  const onClose = () => assetMultiSelectManager.clear();

  const assets = $derived(assetMultiSelectManager.assets);
</script>

<ControlAppBar {onClose} backIcon={mdiClose} class={className}>
  {#snippet leading()}
    <div class="font-medium text-primary">
      <p class="block sm:hidden">{assets.length}</p>
      <p class="hidden sm:block">{$t('selected_count', { values: { count: assets.length } })}</p>
    </div>
  {/snippet}
  {#snippet trailing()}
    {@render children?.()}
  {/snippet}
</ControlAppBar>
