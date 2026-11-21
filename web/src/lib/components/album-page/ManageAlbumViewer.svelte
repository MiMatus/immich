<script lang="ts">
  // Copy of AlbumViewer for the /shared-album/[key] route, which serves both the guest and the manage
  // link. Adds the trash action and the settings link when the shared link has allowDelete (the
  // manage link), and uploads through a fixed button instead of a control bar icon; behaviour
  // otherwise mirrors AlbumViewer and should be kept in sync with it.
  // The markup intentionally diverges: it uses the Pixalery landing theme (`:root.theme-pixalery`
  // in app.css, toggled by ManageSharedLinkPage).
  import { shortcut } from '#lib/actions/shortcut.ts';
  import AlbumMap from '#lib/components/album-page/AlbumMap.svelte';
  import ManageTrashAssetsAction from '#lib/components/album-page/ManageTrashAssetsAction.svelte';
  import SourceLink from '#lib/components/shared-components/SourceLink.svelte';
  import AssetSelectControlBar from '#lib/components/timeline/AssetSelectControlBar.svelte';
  import Timeline from '#lib/components/timeline/Timeline.svelte';
  import DownloadAction from '#lib/components/timeline/actions/DownloadAction.svelte';
  import SelectAllAssets from '#lib/components/timeline/actions/SelectAllAction.svelte';
  import { assetMultiSelectManager } from '#lib/managers/asset-multi-select-manager.svelte.ts';
  import { assetViewerManager } from '#lib/managers/asset-viewer-manager.svelte.ts';
  import { TimelineManager } from '#lib/managers/timeline-manager/timeline-manager.svelte.ts';
  import { createPreloadedQuery } from '#lib/queries/client.ts';
  import { getPublicConfigQuery } from '#lib/queries/config-public.query.ts';
  import { Route } from '#lib/route.ts';
  import { handleDownloadAlbum } from '#lib/services/album.service.ts';
  import { getGlobalActions } from '#lib/services/app.service.ts';
  import { dragAndDropFilesStore } from '#lib/stores/drag-and-drop-files.store.ts';
  import { mediaQueryManager } from '#lib/stores/media-query-manager.svelte.ts';
  import { SlideshowNavigation, SlideshowState, slideshowStore } from '#lib/stores/slideshow.store.ts';
  import { uploadAssetsStore } from '#lib/stores/upload.ts';
  import { handlePromiseError } from '#lib/utils.ts';
  import { fileUploadHandler, openFileUploadDialog } from '#lib/utils/file-uploader.ts';
  import type { AlbumResponseDto, SharedLinkResponseDto } from '@immich/sdk';
  import { ActionButton, Button, IconButton, Logo } from '@immich/ui';
  import { mdiCogOutline, mdiDownload, mdiFileImagePlusOutline, mdiPresentationPlay } from '@mdi/js';
  import { t } from 'svelte-i18n';
  import ControlAppBar from '../shared-components/ControlAppBar.svelte';
  import ThemeButton from '../shared-components/ThemeButton.svelte';
  import AlbumSummary from './AlbumSummary.svelte';

  const query = createPreloadedQuery(getPublicConfigQuery);
  const publicConfig = $derived(query.data);

  interface Props {
    sharedLink: SharedLinkResponseDto;
  }

  let { sharedLink }: Props = $props();

  // reactive so the asset count in the summary follows deletions
  let album = $state(sharedLink.album as AlbumResponseDto);

  let { slideshowState, slideshowNavigation } = slideshowStore;
  // the upload panel takes the upload button's corner while it has anything to show
  const { isUploading } = uploadAssetsStore;

  // not a page of this app: the edge proxy redirects it to the album's settings on the landing site
  const settingsHref = $derived(Route.sharedAlbumSettings({ key: sharedLink.key }));

  const options = $derived({ albumId: album.id, order: album.order });
  let timelineManager = $state<TimelineManager>() as TimelineManager;

  dragAndDropFilesStore.subscribe((value) => {
    if (!(value.isDragging && value.files.length > 0)) {
      return;
    }

    handlePromiseError(fileUploadHandler({ files: value.files, albumId: album.id }));
    dragAndDropFilesStore.set({ isDragging: false, files: [] });
  });

  const handleStartSlideshow = async () => {
    const asset =
      $slideshowNavigation === SlideshowNavigation.Shuffle
        ? await timelineManager.getRandomAsset()
        : timelineManager.months[0]?.timelineDays[0]?.viewerAssets[0]?.asset;
    if (asset) {
      handlePromiseError(
        assetViewerManager.setAssetId(asset.id).then(() => ($slideshowState = SlideshowState.PlaySlideshow)),
      );
    }
  };

  const { Cast } = $derived(getGlobalActions($t));

  // translucent "glass" bar, like the landing navbar
  const controlBarClass = 'border border-light-200/60 bg-light/70 backdrop-blur-md';

  const handleAssetsTrashed = (ids: string[]) => {
    timelineManager.removeAssets(ids);
    album.assetCount = Math.max(0, album.assetCount - ids.length);
    assetMultiSelectManager.clear();
  };
</script>

<svelte:document
  use:shortcut={{
    shortcut: { key: 'Escape' },
    onShortcut: () => {
      if (!assetViewerManager.isViewing && assetMultiSelectManager.selectionActive) {
        assetMultiSelectManager.clear();
      }
    },
  }}
/>

<main class="relative h-dvh overflow-hidden px-2 pt-(--navbar-height) max-md:pt-(--navbar-height-md) md:px-6">
  <div class="bg-hero-glow pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px]"></div>
  <Timeline enableRouting={true} {album} bind:timelineManager {options} assetInteraction={assetMultiSelectManager}>
    <section class="px-2 pt-8 md:px-0 md:pt-24">
      <!-- ALBUM TITLE -->
      <h1
        class="text-3xl leading-[1.15] font-semibold tracking-tight text-dark transition-all outline-none md:text-5xl lg:text-6xl"
      >
        {album.albumName}
      </h1>

      {#if album.assetCount > 0}
        <AlbumSummary {album} />
      {/if}

      <!-- ALBUM DESCRIPTION -->
      {#if album.description}
        <p class="mt-6 mb-12 w-full max-w-3xl pb-2 text-start text-lg leading-[1.4] whitespace-pre-line text-muted">
          {album.description}
        </p>
      {/if}
    </section>
  </Timeline>
</main>

<SourceLink />

{#if sharedLink.allowUpload && !assetMultiSelectManager.selectionActive && !$isUploading}
  <div class="fixed inset-e-16 bottom-6 max-md:inset-e-4">
    <Button
      class="shadow-lg"
      size="large"
      shape="round"
      leadingIcon={mdiFileImagePlusOutline}
      onclick={() => openFileUploadDialog({ albumId: album.id })}
    >
      {$t('upload_photos')}
    </Button>
  </div>
{/if}

<header>
  {#if assetMultiSelectManager.selectionActive}
    <AssetSelectControlBar class={controlBarClass}>
      <SelectAllAssets {timelineManager} assetInteraction={assetMultiSelectManager} />
      {#if sharedLink.allowDownload}
        <DownloadAction filename={album.albumName} />
      {/if}
      {#if sharedLink.allowDelete}
        <ManageTrashAssetsAction onAssetDelete={handleAssetsTrashed} />
      {/if}
    </AssetSelectControlBar>
  {:else}
    <ControlAppBar class={controlBarClass}>
      {#snippet leading()}
        <a data-sveltekit-reload class="ms-4" href="/">
          <Logo variant={mediaQueryManager.maxMd ? 'icon' : 'inline'} class="min-w-10" />
        </a>
      {/snippet}

      {#snippet trailing()}
        <ActionButton action={Cast} />

        {#if album.assetCount > 0 && sharedLink.allowDownload}
          <IconButton
            shape="round"
            variant="ghost"
            color="secondary"
            aria-label={$t('slideshow')}
            onclick={handleStartSlideshow}
            icon={mdiPresentationPlay}
          />
          <IconButton
            shape="round"
            color="secondary"
            variant="ghost"
            aria-label={$t('download')}
            onclick={() => handleDownloadAlbum(album)}
            icon={mdiDownload}
          />
        {/if}
        {#if sharedLink.showMetadata && publicConfig.map.enabled}
          <AlbumMap {album} />
        {/if}
        <ThemeButton />
        {#if sharedLink.allowDelete}
          {#if mediaQueryManager.maxMd}
            <IconButton
              shape="round"
              color="secondary"
              variant="outline"
              aria-label={$t('settings')}
              href={settingsHref}
              target="_blank"
              icon={mdiCogOutline}
            />
          {:else}
            <Button
              shape="round"
              color="secondary"
              variant="outline"
              leadingIcon={mdiCogOutline}
              href={settingsHref}
              target="_blank"
            >
              {$t('settings')}
            </Button>
          {/if}
        {/if}
      {/snippet}
    </ControlAppBar>
  {/if}
</header>
