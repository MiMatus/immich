import { Route } from '#lib/route.ts';
import type { MockData } from '#test/common/data.ts';
import { factory } from '#test/common/factories.ts';
import { expect, test } from '#test/medium/fixtures.ts';
import { SharedLinkType } from '@immich/sdk';

const slug = 'test-album-x7k2p9qd4m1c';
const alice = factory.person({ name: 'Alice' });

const setup = (data: MockData, overrides = {}) => {
  const assets = [factory.asset({ people: [alice] }), factory.asset()];
  data.addAssets(assets);
  const album = factory.album({ albumName: 'Test Album' });
  data.addAlbums(album).addToAlbum(album.id, assets);
  const link = factory.sharedLink({ type: SharedLinkType.Album, album, slug, ...overrides });
  data.addSharedLinks(link);
  return { link };
};

test.describe('shared album', () => {
  test('manage link offers the album settings', async ({ page, context, data, app }) => {
    setup(data, { allowDelete: true });
    await context.clearCookies();
    await page.goto(Route.sharedAlbum({ slug }));
    await expect(app.sharedLink.heading('Test Album')).toBeVisible();

    const settings = page.getByRole('link', { name: 'settings', exact: true });
    await expect(settings).toHaveAttribute('href', Route.sharedAlbumSettings({ slug }));
    await expect(settings).toHaveAttribute('target', '_blank');
  });

  test('guest link has no album settings', async ({ page, context, data, app }) => {
    setup(data, { allowUpload: true });
    await context.clearCookies();
    await page.goto(Route.sharedAlbum({ slug }));
    await expect(app.sharedLink.heading('Test Album')).toBeVisible();

    await expect(page.getByRole('link', { name: 'settings', exact: true })).toHaveCount(0);
  });

  test('upload button opens the file picker when the link allows uploads', async ({ page, context, data, app }) => {
    setup(data, { allowUpload: true });
    await context.clearCookies();
    await page.goto(Route.sharedAlbum({ slug }));
    await expect(app.sharedLink.heading('Test Album')).toBeVisible();

    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('button', { name: 'upload_photos', exact: true }).click(),
    ]);
    expect(chooser.isMultiple()).toBe(true);
  });

  test('upload button is absent when the link does not allow uploads', async ({ page, context, data, app }) => {
    setup(data);
    await context.clearCookies();
    await page.goto(Route.sharedAlbum({ slug }));
    await expect(app.sharedLink.heading('Test Album')).toBeVisible();

    await expect(page.getByRole('button', { name: 'upload_photos', exact: true })).toHaveCount(0);
  });

  test('manage link filters the album by a person', async ({ page, context, data, app, api }) => {
    setup(data, { allowDelete: true });
    await context.clearCookies();
    await page.goto(Route.sharedAlbum({ slug }));
    await expect(app.sharedLink.heading('Test Album')).toBeVisible();

    const person = page.getByRole('button', { name: /Alice/ });
    await person.click();
    await expect(person).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('status')).toContainText('album_people_filter_status');
    expect(api.getTimeBuckets).toHaveBeenCalledWith({ params: expect.objectContaining({ personId: alice.id, slug }) });

    await page.getByRole('button', { name: 'album_people_filter_clear', exact: true }).click();
    await expect(person).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByRole('status')).toHaveCount(0);
  });

  test('guest link has no people filter', async ({ page, context, data, app, api }) => {
    setup(data, { allowUpload: true });
    await context.clearCookies();
    await page.goto(Route.sharedAlbum({ slug }));
    await expect(app.sharedLink.heading('Test Album')).toBeVisible();

    await expect(page.getByRole('button', { name: /Alice/ })).toHaveCount(0);
    expect(api.getAlbumFaces).not.toHaveBeenCalled();
  });
});
