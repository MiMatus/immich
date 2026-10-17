<script lang="ts">
  // Copy of SharedLinkPage for the /shared-album/[key] route (guest and manage links): album links
  // render ManageAlbumViewer, which adds the trash action for links with allowDelete. Behaviour is
  // kept in sync with SharedLinkPage; the markup intentionally diverges to use the Pixalery landing
  // theme (see `:root.theme-pixalery` in app.css).
  import ManageAlbumViewer from '#lib/components/album-page/ManageAlbumViewer.svelte';
  import IndividualSharedViewer from '#lib/components/share-page/IndividualSharedViewer.svelte';
  import ControlAppBar from '#lib/components/shared-components/ControlAppBar.svelte';
  import SourceLink from '#lib/components/shared-components/SourceLink.svelte';
  import ThemeButton from '#lib/components/shared-components/ThemeButton.svelte';
  import { assetViewerManager } from '#lib/managers/asset-viewer-manager.svelte.ts';
  import { authManager } from '#lib/managers/auth-manager.svelte.ts';
  import { setSharedLink } from '#lib/utils.ts';
  import { handleError } from '#lib/utils/handle-error.ts';
  import { navigate } from '#lib/utils/navigation.ts';
  import { SharedLinkType, sharedLinkLogin, type AssetResponseDto, type SharedLinkResponseDto } from '@immich/sdk';
  import { Button, Logo, PasswordInput } from '@immich/ui';
  import { onDestroy, tick } from 'svelte';
  import { t } from 'svelte-i18n';

  type Props = {
    data: {
      meta: {
        title: string;
      };

      sharedLink?: SharedLinkResponseDto;
      key?: string;
      slug?: string;
      asset?: AssetResponseDto;
      passwordRequired?: boolean;
    };
  };

  const { data }: Props = $props();

  let { sharedLink, passwordRequired, key, slug, meta } = $state(data);
  let { title } = $state(meta);
  let isOwned = $derived(authManager.authenticated && authManager.user.id === sharedLink?.userId);
  let password = $state('');

  if (passwordRequired) {
    assetViewerManager.showAssetViewer(false);
  }

  // Landing palette for everything rendered while this page is mounted, including dialogs and
  // toasts portaled to the document root. ThemeButton keeps toggling `dark`/`light` next to it.
  $effect(() => {
    document.documentElement.classList.add('theme-pixalery');
    return () => document.documentElement.classList.remove('theme-pixalery');
  });

  const handlePasswordSubmit = async () => {
    try {
      sharedLink = await sharedLinkLogin({ key, slug, sharedLinkLoginDto: { password } });
      setSharedLink(sharedLink);
      passwordRequired = false;
      title = (sharedLink.album ? sharedLink.album.albumName : $t('public_share')) + ' - Pixalery';
      await tick();
      await navigate(
        { targetRoute: 'current', assetId: null, assetGridRouteSearchParams: assetViewerManager.gridScrollTarget },
        { forceNavigate: true, replace: true },
      );
    } catch (error) {
      handleError(error, $t('errors.unable_to_get_shared_link'));
    }
  };

  const onsubmit = async (event: Event) => {
    event.preventDefault();
    await handlePasswordSubmit();
  };

  onDestroy(() => {
    setSharedLink(undefined);
  });
</script>

<svelte:head>
  <title>{title}</title>
</svelte:head>
{#if passwordRequired}
  <main
    class="relative h-dvh overflow-hidden px-6 pt-(--navbar-height) max-md:pt-(--navbar-height-md) sm:px-12 md:px-24 lg:px-40"
  >
    <div class="bg-hero-glow pointer-events-none absolute inset-x-0 top-0 h-[520px]"></div>
    <div class="relative mt-20 flex flex-col items-center justify-center text-center">
      <h1 class="text-4xl leading-[1.2] font-semibold tracking-tight text-dark md:text-[54px]">
        {$t('password_required')}
      </h1>
      <p class="mt-4 max-w-md text-lg leading-[1.4] text-muted">
        {$t('sharing_enter_password')}
      </p>
      <form class="mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row" novalidate {onsubmit}>
        <PasswordInput autocomplete="off" bind:value={password} placeholder="Password" size="large" />
        <Button type="submit" size="large" shape="semi-round">{$t('submit')}</Button>
      </form>
    </div>
  </main>
  <header>
    <ControlAppBar class="border border-light-200/60 bg-light/70 backdrop-blur-md">
      {#snippet leading()}
        <a data-sveltekit-preload-data="hover" class="ms-4" href="/">
          <Logo variant="inline" />
        </a>
      {/snippet}

      {#snippet trailing()}
        <SourceLink />
        <ThemeButton />
      {/snippet}
    </ControlAppBar>
  </header>
{/if}

{#if !passwordRequired && sharedLink?.type === SharedLinkType.Album}
  <ManageAlbumViewer {sharedLink} />
{/if}
{#if !passwordRequired && sharedLink?.type === SharedLinkType.Individual}
  <div class="immich-scrollbar">
    <IndividualSharedViewer {sharedLink} {isOwned} />
  </div>
{/if}
