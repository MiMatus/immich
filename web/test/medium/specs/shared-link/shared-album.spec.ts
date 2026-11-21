import { Route } from '#lib/route.ts';
import type { MockData } from '#test/common/data.ts';
import { factory } from '#test/common/factories.ts';
import { expect, test } from '#test/medium/fixtures.ts';
import { SharedLinkType } from '@immich/sdk';

const setup = (data: MockData, overrides = {}) => {
  const assets = [factory.asset(), factory.asset()];
  data.addAssets(assets);
  const album = factory.album({ albumName: 'Test Album' });
  data.addAlbums(album).addToAlbum(album.id, assets);
  const link = factory.sharedLink({ type: SharedLinkType.Album, album, ...overrides });
  data.addSharedLinks(link);
  return { link };
};

test.describe('shared album', () => {
  test('manage link offers the album settings', async ({ page, context, data, app }) => {
    const { link } = setup(data, { allowDelete: true });
    await context.clearCookies();
    await page.goto(Route.sharedAlbum({ key: link.key }));
    await expect(app.sharedLink.heading('Test Album')).toBeVisible();

    const settings = page.getByRole('link', { name: 'settings', exact: true });
    await expect(settings).toHaveAttribute('href', Route.sharedAlbumSettings({ key: link.key }));
    await expect(settings).toHaveAttribute('target', '_blank');
  });

  test('guest link has no album settings', async ({ page, context, data, app }) => {
    const { link } = setup(data, { allowUpload: true });
    await context.clearCookies();
    await page.goto(Route.sharedAlbum({ key: link.key }));
    await expect(app.sharedLink.heading('Test Album')).toBeVisible();

    await expect(page.getByRole('link', { name: 'settings', exact: true })).toHaveCount(0);
  });

  test('upload button opens the file picker when the link allows uploads', async ({ page, context, data, app }) => {
    const { link } = setup(data, { allowUpload: true });
    await context.clearCookies();
    await page.goto(Route.sharedAlbum({ key: link.key }));
    await expect(app.sharedLink.heading('Test Album')).toBeVisible();

    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('button', { name: 'upload_photos', exact: true }).click(),
    ]);
    expect(chooser.isMultiple()).toBe(true);
  });

  test('upload button is absent when the link does not allow uploads', async ({ page, context, data, app }) => {
    const { link } = setup(data);
    await context.clearCookies();
    await page.goto(Route.sharedAlbum({ key: link.key }));
    await expect(app.sharedLink.heading('Test Album')).toBeVisible();

    await expect(page.getByRole('button', { name: 'upload_photos', exact: true })).toHaveCount(0);
  });
});
