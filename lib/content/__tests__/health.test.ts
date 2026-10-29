import {it, expect, vi} from 'vitest';
import {GET} from '../../../app/api/health/route';
it('reports the public deployment revision and runtime without account dependencies', async () => {
 vi.stubEnv('RENDER_GIT_COMMIT','test-revision');
 try {
  const response = GET(), body = await response.json();
  expect(response.status).toBe(200);
  expect(response.headers.get('Cache-Control')).toBe('no-store');
  expect(body).toMatchObject({status:'ok', service:'harf', runtime:process.version, revision:'test-revision'});
 } finally {vi.unstubAllEnvs();}
});
