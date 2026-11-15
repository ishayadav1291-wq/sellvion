import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  OperationType,
  clampInt,
  clampNumber,
  clampString,
  clampTimeHHMM,
  toValidFirestoreId,
} from './firebase';

describe('SELLVION Firebase Blueprint & Security Rules Cross-Audit', () => {
  const blueprintRaw = readFileSync(resolve(process.cwd(), 'firebase-blueprint.json'), 'utf8');
  const rulesRaw = readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8');
  const blueprint = JSON.parse(blueprintRaw) as {
    entities: Record<string, { required?: string[]; properties: Record<string, { maxLength?: number; pattern?: string }> }>;
    firestore: Record<string, { schema: { $ref: string } }>;
  };

  it('includes a match rule block for every collection path declared in firebase-blueprint.json', () => {
    const requiredMatchers = [
      'match /users/{userId}/public/{docId}',
      'match /users/{userId}/private/{docId}',
      'match /workspaces/{workspaceId}',
      'match /customers/{customerId}',
      'match /draftRevisions/{revisionId}',
      'match /admins/{userId}',
    ];
    for (const matcher of requiredMatchers) {
      expect(rulesRaw).toContain(matcher);
    }
    expect(Object.keys(blueprint.firestore).length).toBe(6);
  });

  it('enforces rules_version 2, global default-deny catch-all, and verified email writes', () => {
    expect(rulesRaw).toContain("rules_version = '2';");
    expect(rulesRaw).toContain('match /{document=**} {\n      allow read, write: if false;');
    expect(rulesRaw).toContain('request.auth.token.email_verified == true');
  });

  it('forbids get() or exists() lookups inside allow list lines', () => {
    const listLines = rulesRaw
      .split('\n')
      .filter((line) => line.trim().startsWith('allow list:'));
    expect(listLines.length).toBeGreaterThan(0);
    for (const line of listLines) {
      expect(line).not.toContain('get(');
      expect(line).not.toContain('exists(');
      expect(line).not.toContain('isWorkspaceOwner(');
      expect(line).not.toContain('isAdmin(');
    }
  });

  it('guards updates with affectedKeys().hasOnly() and server timestamps', () => {
    expect(rulesRaw).toContain('incoming().diff(existing()).affectedKeys().hasOnly(');
    expect(rulesRaw).toContain('incoming().createdAt == request.time');
    expect(rulesRaw).toContain('incoming().updatedAt == request.time');
  });

  it('sanitizes payloads within firebase-blueprint.json volumetric and regex bounds', () => {
    expect(toValidFirestoreId('ws/bad id!$')).toBe('ws_bad_id__');
    expect(toValidFirestoreId('A'.repeat(200)).length).toBeLessThanOrEqual(128);
    expect(clampString('  Hello Merchant  ', 5)).toBe('Hello');
    expect(clampTimeHHMM('21:00', '09:00')).toBe('21:00');
    expect(clampTimeHHMM('invalid', '09:00')).toBe('09:00');
    expect(clampInt(25, 1, 10, 1)).toBe(10);
    expect(clampInt(0, 1, 10, 1)).toBe(1);
    expect(clampNumber(-50, 0, 1000, 0)).toBe(0);
    expect(OperationType.CREATE).toBe('create');
    expect(OperationType.UPDATE).toBe('update');
  });
});
