import request from 'supertest';
import { AlbumController } from 'src/controllers/album.controller.js';
import { AlbumService } from 'src/services/album.service.js';
import { factory } from 'test/small.factory.js';
import { ControllerContext, controllerSetup, mockBaseService } from 'test/utils.js';

describe(AlbumController.name, () => {
  let ctx: ControllerContext;
  const service = mockBaseService(AlbumService);

  beforeAll(async () => {
    ctx = await controllerSetup(AlbumController, [{ provide: AlbumService, useValue: service }]);
    return () => ctx.close();
  });

  beforeEach(() => {
    service.resetAllMocks();
    ctx.reset();
  });

  describe('GET /albums', () => {
    it('should reject an invalid shared param', async () => {
      const { status, body } = await request(ctx.getHttpServer()).get('/albums?isShared=invalid');
      expect(status).toEqual(400);
      expect(body).toEqual(
        factory.responses.validationError([
          { path: ['isShared'], message: 'Invalid option: expected one of "true"|"false"' },
        ]),
      );
    });

    it('should reject an invalid assetId param', async () => {
      const { status, body } = await request(ctx.getHttpServer()).get('/albums?assetId=invalid');
      expect(status).toEqual(400);
      expect(body).toEqual(factory.responses.validationError([{ path: ['assetId'], message: 'Invalid UUID' }]));
    });
  });

  describe('GET /albums/:id/faces', () => {
    it('should reject an invalid album id', async () => {
      const { status, body } = await request(ctx.getHttpServer()).get('/albums/invalid/faces');
      expect(status).toEqual(400);
      expect(body).toEqual(factory.responses.validationError([{ path: ['id'], message: 'Invalid UUID' }]));
      expect(service.getFaces).not.toHaveBeenCalled();
    });

    it('should return the album faces', async () => {
      service.getFaces.mockResolvedValue({ people: [], assets: [] });
      const { status, body } = await request(ctx.getHttpServer()).get(`/albums/${factory.uuid()}/faces`);
      expect(status).toEqual(200);
      expect(body).toEqual({ people: [], assets: [] });
    });
  });

  describe('GET /albums/:id/faces/:personId/thumbnail', () => {
    it('should reject an invalid person id', async () => {
      const { status, body } = await request(ctx.getHttpServer()).get(
        `/albums/${factory.uuid()}/faces/invalid/thumbnail`,
      );
      expect(status).toEqual(400);
      expect(body).toEqual(factory.responses.validationError([{ path: ['personId'], message: 'Invalid UUID' }]));
      expect(service.getFaceThumbnail).not.toHaveBeenCalled();
    });
  });
});
