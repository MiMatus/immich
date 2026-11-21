<script lang="ts">
  // People row of the /shared-album page (manage link only): the faces found in the album, most
  // frequent first. Picking one sets `personId`, which the viewer adds to its timeline options.
  import ImageThumbnail from '#lib/components/assets/thumbnail/ImageThumbnail.svelte';
  import { getAlbumPeopleQuery } from '#lib/queries/album.query.ts';
  import { getAlbumFaceThumbnailUrl } from '#lib/utils.ts';
  import { Button } from '@immich/ui';
  import { createQuery } from '@tanstack/svelte-query';
  import { t } from 'svelte-i18n';

  interface Props {
    albumId: string;
    assetCount: number;
    personId?: string;
  }

  let { albumId, assetCount, personId = $bindable() }: Props = $props();

  const query = createQuery(() => getAlbumPeopleQuery(albumId));
  const people = $derived(query.data ?? []);
  const selected = $derived(people.find(({ person }) => person.id === personId));

  // the selected person can lose their last photo in the album
  $effect(() => {
    if (personId && query.isSuccess && !query.isFetching && !selected) {
      personId = undefined;
    }
  });
</script>

{#if people.length > 0}
  <section class="mb-8" aria-label={$t('people')}>
    <h2 class="text-sm font-medium text-dark">{$t('people')}</h2>

    <div class="-mx-1 mt-2 flex immich-scrollbar gap-1 overflow-x-auto px-1 pt-2 pb-3">
      {#each people as { person, assetCount: count } (person.id)}
        {const isSelected = $derived(person.id === personId)}
        {const name = $derived(person.name || $t('album_people_unnamed'))}
        <button
          type="button"
          class={[
            'flex w-20 shrink-0 flex-col items-center gap-1 rounded-xl p-1 transition-opacity',
            personId && !isSelected && 'opacity-45 hover:opacity-100',
          ]}
          aria-pressed={isSelected}
          title={name}
          onclick={() => (personId = isSelected ? undefined : person.id)}
        >
          <span class={['rounded-full', isSelected && 'ring-3 ring-primary ring-offset-2 ring-offset-light']}>
            <ImageThumbnail
              circle
              url={getAlbumFaceThumbnailUrl(albumId, person)}
              altText={name}
              widthStyle="4rem"
              preload={false}
            />
          </span>
          {#if person.name}
            <span class={['w-full truncate text-sm', isSelected ? 'font-semibold text-primary' : 'text-dark']}>
              {person.name}
            </span>
          {/if}
          <span class="text-xs text-muted tabular-nums">{count}</span>
        </button>
      {/each}
    </div>

    {#if selected}
      <div class="mt-1 flex flex-wrap items-center gap-3 rounded-xl bg-primary/10 px-4 py-2 text-sm text-dark">
        <span role="status">
          {selected.person.name
            ? $t('album_people_filter_status', {
                values: { count: selected.assetCount, total: assetCount, name: selected.person.name },
              })
            : $t('album_people_filter_status_unnamed', { values: { count: selected.assetCount, total: assetCount } })}
        </span>
        <Button
          class="ms-auto"
          size="small"
          shape="round"
          color="secondary"
          variant="outline"
          onclick={() => (personId = undefined)}
        >
          {$t('album_people_filter_clear')}
        </Button>
      </div>
    {/if}
  </section>
{/if}
