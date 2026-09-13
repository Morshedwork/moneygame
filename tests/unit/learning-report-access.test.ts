import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPlayer } from '../../packages/game-rules';
const mocks = vi.hoisted(() => ({ profile: {} as any, records: [] as any[], collection: vi.fn() }));
vi.mock('firebase-admin/app', () => ({ initializeApp: vi.fn() }));
vi.mock('firebase-admin/firestore', () => ({ getFirestore: () => ({
  doc: () => ({ get: async () => ({ exists: true, data: () => mocks.profile }) }),
  collection: mocks.collection,
}) }));
vi.mock('firebase-functions/v2/https', () => ({
  onCall: (_: unknown, handler: unknown) => handler,
  HttpsError: class extends Error { code: string; constructor(code: string, message: string) { super(message); this.code = code; } },
}));
import { leadAction } from '../../apps/server/index';
const call = leadAction as unknown as (r: any) => Promise<any>;
beforeEach(() => {
  mocks.profile = createPlayer('caller', 'Reader');
  mocks.records = [createPlayer('student', 'Explorer'), createPlayer('parent', 'Guardian', 'parent')];
  mocks.collection.mockReset().mockReturnValue({ limit: (n: number) => { expect(n).toBe(200); return { get: async () => ({ docs: mocks.records.map(p => ({ data: () => p })) }) }; } });
});
describe('protected admin learning reports', () => {
  it('denies anonymous, students, parents, and a forged admin profile before reading cohort data', async () => {
    await expect(call({ data: { operation: 'adminList' } })).rejects.toMatchObject({ code: 'unauthenticated' });
    for (const role of ['student', 'parent', 'admin']) {
      mocks.profile.role = role;
      await expect(call({ auth: { uid: 'caller', token: {} }, data: { operation: 'adminList', admin: true } })).rejects.toMatchObject({ code: 'permission-denied' });
    }
    expect(mocks.collection).not.toHaveBeenCalled();
  });
  it('serves reports only for student records to a trusted admin claim, without private decks or identifiers', async () => {
    const r = await call({ auth: { uid: 'caller', token: { admin: true } }, data: { operation: 'adminList' } });
    expect(r.players[0].learningReport.title).toBe('My learning journey');
    expect(r.players[1].learningReport).toBeUndefined();
    expect(r.players[0].learningReport).not.toHaveProperty('parents');
    expect(r.players[0].learningReport).not.toHaveProperty('game');
  });
});
