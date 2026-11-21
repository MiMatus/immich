import { Route } from '#lib/route.ts';
import type { MockData } from '#test/common/data.ts';
import { factory } from '#test/unit/factories.ts';
import { test } from '#test/unit/fixtures.ts';
import { SharedLinkType } from '@immich/sdk';
import { expect } from 'vitest';
import { page } from 'vitest/browser';
import Page from './+page.svelte';
import { load } from './+page.ts';

const slug = 'test-album-x7k2p9qd4m1c';
const alice = factory.person({ name: 'Alice' });

const setup = (data: MockData, overrides = {}) => {
  const assets = [factory.asset({ people: [alice] }), factory.asset()];
  data.addAssets(assets);
  const album = factory.album({ albumName: 'Test Album' });
  data.addAlbums(album).addToAlbum(album.id, assets);
  data.addSharedLinks(factory.sharedLink({ type: SharedLinkType.Album, album, slug, ...overrides }));
};

test('manage link filters the album by a person', async ({ data, router, render, settle, api }) => {
  setup(data, { allowDelete: true });
  await router.goto(Route.sharedAlbum({ slug }), { slug });

  await render(Page, load);
  await settle();

  const person = page.getByRole('button', { name: /Alice/ });
  // unit tests render unstyled, where the fixed source link icon covers the page: click through the DOM
  (person.element() as HTMLElement).click();
  await settle();

  await expect.element(person).toHaveAttribute('aria-pressed', 'true');
  await expect.element(page.getByRole('status')).toHaveTextContent('album_people_filter_status');
  const filtered = { params: expect.objectContaining({ personId: alice.id }) };
  expect(api.getTimeBuckets).toHaveBeenCalledWith(filtered);

  const clear = page.getByRole('button', { name: 'album_people_filter_clear', exact: true });
  (clear.element() as HTMLElement).click();
  await settle();

  await expect.element(person).toHaveAttribute('aria-pressed', 'false');
  expect(api.getTimeBuckets.calls.at(-1)).not.toEqual(filtered);
});

test('guest link has no people filter', async ({ data, router, render, settle, api }) => {
  setup(data, { allowUpload: true });
  await router.goto(Route.sharedAlbum({ slug }), { slug });

  await render(Page, load);
  await settle();

  await expect.element(page.getByRole('heading', { name: 'Test Album' })).toBeVisible();
  await expect.element(page.getByRole('button', { name: /Alice/ })).not.toBeInTheDocument();
  expect(api.getAlbumFaces).not.toHaveBeenCalled();
});
