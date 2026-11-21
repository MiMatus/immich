<script lang="ts">
  import { assetMultiSelectManager } from '#lib/managers/asset-multi-select-manager.svelte.ts';
  import { authManager } from '#lib/managers/auth-manager.svelte.ts';
  import type { OnDelete } from '#lib/utils/actions.ts';
  import { handleError } from '#lib/utils/handle-error.ts';
  import { deleteAssets } from '@immich/sdk';
  import { IconButton, modalManager, toastManager } from '@immich/ui';
  import { mdiDeleteOutline, mdiTimerSand } from '@mdi/js';
  import { t } from 'svelte-i18n';

  type Props = {
    onAssetDelete: OnDelete;
  };

  let { onAssetDelete }: Props = $props();

  let loading = $state(false);

  const onAction = async () => {
    // visitors of a manage link may trash any asset of the album, so use the full selection
    const ids = assetMultiSelectManager.assets.map((asset) => asset.id);
    if (ids.length === 0) {
      return;
    }

    const confirmed = await modalManager.showDialog({
      title: $t('manage_shared_link_trash_assets_title', { values: { count: ids.length } }),
      prompt: $t('manage_shared_link_trash_assets_prompt'),
      confirmText: $t('manage_shared_link_trash'),
    });
    if (!confirmed) {
      return;
    }

    loading = true;
    try {
      // the shared-link slug travels as a query parameter; the server never hard-deletes for shared links
      await deleteAssets({ ...authManager.params, assetBulkDeleteDto: { ids, force: false } });
      onAssetDelete(ids);
      toastManager.primary($t('assets_moved_to_trash_count', { values: { count: ids.length } }));
    } catch (error) {
      handleError(error, $t('errors.unable_to_delete_assets'));
    } finally {
      loading = false;
    }
  };
</script>

{#if loading}
  <IconButton
    shape="round"
    color="secondary"
    variant="ghost"
    aria-label={$t('loading')}
    icon={mdiTimerSand}
    onclick={() => {}}
  />
{:else}
  <IconButton
    shape="round"
    color="secondary"
    variant="ghost"
    aria-label={$t('manage_shared_link_trash')}
    icon={mdiDeleteOutline}
    onclick={onAction}
  />
{/if}
