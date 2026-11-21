import { Kysely } from 'kysely';
import { AccessRepository } from 'src/repositories/access.repository.js';
import { AlbumRepository } from 'src/repositories/album.repository.js';
import { AssetRepository } from 'src/repositories/asset.repository.js';
import { LoggingRepository } from 'src/repositories/logging.repository.js';
import { PersonRepository } from 'src/repositories/person.repository.js';
import { UserRepository } from 'src/repositories/user.repository.js';
import { DB } from 'src/schema/index.js';
import { AlbumService } from 'src/services/album.service.js';
import { newMediumService } from 'test/medium.factory.js';
import { factory } from 'test/small.factory.js';
import { getKyselyDB } from 'test/utils.js';

let defaultDatabase: Kysely<DB>;

// eslint-disable-next-line unicorn/no-unnecessary-parameters
const setup = (db?: Kysely<DB>) => {
  return newMediumService(AlbumService, {
    database: db || defaultDatabase,
    real: [AccessRepository, AlbumRepository, AssetRepository, PersonRepository, UserRepository],
    mock: [LoggingRepository],
  });
};

beforeAll(async () => {
  defaultDatabase = await getKyselyDB();
});

describe(AlbumService.name, () => {
  describe('removeAssets', () => {
    it('should not remove assets from an album of another user', async () => {
      const { sut, ctx } = setup();
      const { user } = await ctx.newUser();
      const { user: otherUser } = await ctx.newUser();
      const { asset } = await ctx.newAsset({ ownerId: user.id });
      const { album } = await ctx.newAlbum({ ownerId: user.id }, [asset.id]);

      await expect(sut.removeAssets(factory.auth({ user: otherUser }), album.id, { ids: [asset.id] })).rejects.toThrow(
        'Not found or no albumAsset.delete access',
      );
      await expect(ctx.get(AlbumRepository).getAssetIds(album.id, [asset.id])).resolves.toContain(asset.id);
    });
  });

  describe('getFaces', () => {
    it('should return the faces of the album assets with the people of the viewer', async () => {
      const { sut, ctx } = setup();
      const { user } = await ctx.newUser();
      const { asset } = await ctx.newAsset({ ownerId: user.id });
      const { asset: otherAsset } = await ctx.newAsset({ ownerId: user.id });
      const { album } = await ctx.newAlbum({ ownerId: user.id }, [asset.id]);
      const { person } = await ctx.newPerson({ ownerId: user.id, name: 'Alice' });
      const { assetFace: known } = await ctx.newAssetFace({
        assetId: asset.id,
        personGroupId: person.personGroupId,
        boundingBoxX1: 1,
        boundingBoxX2: 4,
      });
      const { assetFace: unknown } = await ctx.newAssetFace({ assetId: asset.id, boundingBoxX1: 5, boundingBoxX2: 8 });
      await ctx.newAssetFace({ assetId: asset.id, isVisible: false });
      await ctx.newAssetFace({ assetId: otherAsset.id, personGroupId: person.personGroupId });

      const result = await sut.getFaces(factory.auth({ user }), album.id);

      expect(result.people).toEqual([expect.objectContaining({ id: person.personGroupId, name: 'Alice' })]);
      expect(result.assets).toEqual([
        {
          assetId: asset.id,
          faces: [
            expect.objectContaining({ id: known.id, personId: person.personGroupId, boundingBoxX1: 1 }),
            expect.objectContaining({ id: unknown.id, personId: null, boundingBoxX1: 5 }),
          ],
        },
      ]);
    });

    it('should not return the faces of an album of another user', async () => {
      const { sut, ctx } = setup();
      const { user } = await ctx.newUser();
      const { user: otherUser } = await ctx.newUser();
      const { asset } = await ctx.newAsset({ ownerId: user.id });
      const { album } = await ctx.newAlbum({ ownerId: user.id }, [asset.id]);
      await ctx.newAssetFace({ assetId: asset.id });

      await expect(sut.getFaces(factory.auth({ user: otherUser }), album.id)).rejects.toThrow(
        'Not found or no album.read access',
      );
    });
  });

  describe('getFaceThumbnail', () => {
    it('should serve the thumbnail of a person with a face in the album only', async () => {
      const { sut, ctx } = setup();
      const { user } = await ctx.newUser();
      const { asset } = await ctx.newAsset({ ownerId: user.id });
      const { asset: otherAsset } = await ctx.newAsset({ ownerId: user.id });
      const { album } = await ctx.newAlbum({ ownerId: user.id }, [asset.id]);
      const { person } = await ctx.newPerson({ ownerId: user.id, thumbnailPath: '/thumbs/alice.jpeg' });
      const { person: outsider } = await ctx.newPerson({ ownerId: user.id, thumbnailPath: '/thumbs/bob.jpeg' });
      await ctx.newAssetFace({ assetId: asset.id, personGroupId: person.personGroupId });
      await ctx.newAssetFace({ assetId: otherAsset.id, personGroupId: outsider.personGroupId });
      const auth = factory.auth({ user });

      await expect(sut.getFaceThumbnail(auth, album.id, person.personGroupId)).resolves.toEqual(
        expect.objectContaining({ path: '/thumbs/alice.jpeg' }),
      );
      await expect(sut.getFaceThumbnail(auth, album.id, outsider.personGroupId)).rejects.toThrow('Not Found');
    });
  });

  describe('database triggers', () => {
    it('should cascade delete an album when the owner is deleted', async () => {
      const { ctx } = setup();
      const { user } = await ctx.newUser();
      const { album } = await ctx.newAlbum({ ownerId: user.id });

      await ctx.get(UserRepository).delete({ id: user.id }, true);

      await expect(ctx.database.selectFrom('album').selectAll().where('id', '=', album.id).execute()).resolves.toEqual(
        [],
      );
      await expect(
        ctx.database.selectFrom('album_user').selectAll().where('albumId', '=', album.id).execute(),
      ).resolves.toEqual([]);
    });
  });
});
