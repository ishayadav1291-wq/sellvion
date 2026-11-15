import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertFails,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

const PROJECT_ID = 'sellvion-security-tdd';

let testEnv: RulesTestEnvironment;

function workspacePayload(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ws_alice',
    ownerId: 'alice',
    name: 'Alice Kirana Mart',
    category: 'Grocery & Kirana',
    city: 'Jaipur',
    state: 'Rajasthan',
    storeUrl: 'https://alicekirana.in',
    preferredLanguage: 'en',
    emergencyPauseAll: false,
    reorderReminders: 'approval_required',
    codPrepayNudges: 'approval_required',
    udhaarReminders: 'approval_required',
    winbackOffers: 'recommendation_only',
    maxDailyMessagesPerCustomer: 1,
    quietHoursStart: '21:00',
    quietHoursEnd: '09:00',
    minConfidenceForAutonomous: 85,
    maxAutonomousDiscountPct: 10,
    dailySpendCapInr: 2500,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...overrides,
  };
}

describe('SELLVION Firestore Rules - Dirty Dozen Security TDD', () => {
  beforeAll(async () => {
    const rules = readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8');
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: { rules },
    });
  });

  afterAll(async () => {
    if (testEnv) await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'users', 'victim_uid', 'private', 'info'), {
        uid: 'victim_uid',
        email: 'victim@example.in',
        activeWorkspaceId: 'ws_victim',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await setDoc(doc(db, 'workspaces', 'ws_victim'), {
        ...workspacePayload({ id: 'ws_victim', ownerId: 'victim_uid' }),
      });
      await setDoc(doc(db, 'workspaces', 'ws_alice'), {
        ...workspacePayload({ id: 'ws_alice', ownerId: 'alice' }),
      });
      await setDoc(doc(db, 'workspaces', 'ws_alice', 'draftRevisions', 'rev_locked'), {
        id: 'rev_locked',
        workspaceId: 'ws_alice',
        ownerId: 'alice',
        approvalId: 'APR_1',
        customerName: 'Ramesh',
        title: 'Reorder Reminder',
        agentName: 'WhatsApp Agent',
        message: 'Namaste Ramesh ji',
        status: 'approved',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
  });

  it('1. Rejects unverified admin email spoofing attempt', async () => {
    const spoofed = testEnv.authenticatedContext('attacker', {
      email: 'ishayadav1291@gmail.com',
      email_verified: false,
    });
    await assertFails(getDoc(doc(spoofed.firestore(), 'users', 'victim_uid', 'private', 'info')));
  });

  it('2. Rejects identity spoofing where ownerId != request.auth.uid', async () => {
    const alice = testEnv.authenticatedContext('alice', {
      email: 'alice@example.in',
      email_verified: true,
    });
    await assertFails(
      setDoc(
        doc(alice.firestore(), 'workspaces', 'ws_spoof'),
        workspacePayload({ id: 'ws_spoof', ownerId: 'victim_uid' })
      )
    );
  });

  it('3. Rejects ghost field injection on create', async () => {
    const alice = testEnv.authenticatedContext('alice', {
      email: 'alice@example.in',
      email_verified: true,
    });
    await assertFails(
      setDoc(
        doc(alice.firestore(), 'workspaces', 'ws_ghost'),
        workspacePayload({ id: 'ws_ghost', isVerified: true })
      )
    );
  });

  it('4. Blocks reading another user PII document', async () => {
    const alice = testEnv.authenticatedContext('alice', {
      email: 'alice@example.in',
      email_verified: true,
    });
    await assertFails(getDoc(doc(alice.firestore(), 'users', 'victim_uid', 'private', 'info')));
  });

  it('5. Rejects client-spoofed createdAt timestamp', async () => {
    const alice = testEnv.authenticatedContext('alice', {
      email: 'alice@example.in',
      email_verified: true,
    });
    await assertFails(
      setDoc(
        doc(alice.firestore(), 'workspaces', 'ws_time'),
        workspacePayload({ id: 'ws_time', createdAt: new Date('2020-01-01T00:00:00Z') })
      )
    );
  });

  it('6. Blocks creating customer inside another merchant workspace', async () => {
    const alice = testEnv.authenticatedContext('alice', {
      email: 'alice@example.in',
      email_verified: true,
    });
    await assertFails(
      setDoc(doc(alice.firestore(), 'workspaces', 'ws_victim', 'customers', 'cust_1'), {
        id: 'cust_1',
        workspaceId: 'ws_victim',
        ownerId: 'alice',
        name: 'Rogue Customer',
        phone: '+919800000000',
        city: 'Pune',
        lastProductOrdered: 'Tea',
        segment: 'regular',
        totalOrders: 1,
        totalSpent: 500,
        outstandingUdhaar: 0,
        optedOut: false,
        aiInsight: 'Test',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('7. Rejects unscoped list query on workspaces collection', async () => {
    const alice = testEnv.authenticatedContext('alice', {
      email: 'alice@example.in',
      email_verified: true,
    });
    await assertFails(getDocs(collection(alice.firestore(), 'workspaces')));
  });

  it('8. Rejects path ID poisoning with invalid characters', async () => {
    const alice = testEnv.authenticatedContext('alice', {
      email: 'alice@example.in',
      email_verified: true,
    });
    await assertFails(
      setDoc(
        doc(alice.firestore(), 'workspaces', 'ws$bad!'),
        workspacePayload({ id: 'ws$bad!' })
      )
    );
  });

  it('9. Rejects value poisoning exceeding string maxLength', async () => {
    const alice = testEnv.authenticatedContext('alice', {
      email: 'alice@example.in',
      email_verified: true,
    });
    await assertFails(
      setDoc(
        doc(alice.firestore(), 'workspaces', 'ws_long'),
        workspacePayload({ id: 'ws_long', name: 'A'.repeat(400) })
      )
    );
  });

  it('10. Rejects mutating immutable ownerId during update', async () => {
    const alice = testEnv.authenticatedContext('alice', {
      email: 'alice@example.in',
      email_verified: true,
    });
    await assertFails(
      updateDoc(doc(alice.firestore(), 'workspaces', 'ws_alice'), {
        ownerId: 'victim_uid',
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('11. Locks terminal approved DraftRevision against status rollback', async () => {
    const alice = testEnv.authenticatedContext('alice', {
      email: 'alice@example.in',
      email_verified: true,
    });
    await assertFails(
      updateDoc(doc(alice.firestore(), 'workspaces', 'ws_alice', 'draftRevisions', 'rev_locked'), {
        status: 'edited',
        updatedAt: serverTimestamp(),
      })
    );
  });

  it('12. Blocks client self-escalation to /admins', async () => {
    const alice = testEnv.authenticatedContext('alice', {
      email: 'alice@example.in',
      email_verified: true,
    });
    await assertFails(
      setDoc(doc(alice.firestore(), 'admins', 'alice'), {
        uid: 'alice',
        grantedAt: serverTimestamp(),
      })
    );
  });
});
