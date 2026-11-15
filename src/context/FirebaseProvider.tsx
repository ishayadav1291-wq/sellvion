import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  OperationType,
  auth,
  clampInt,
  clampNumber,
  clampString,
  clampTimeHHMM,
  db,
  googleProvider,
  handleFirestoreError,
  toValidFirestoreId,
} from '../firebase';
import {
  AppLanguage,
  AutonomyPolicyConfig,
  CustomerRecord,
  CustomerSegment,
} from '../types';

export interface CloudWorkspaceDoc {
  id: string;
  ownerId: string;
  name: string;
  category?: string;
  city?: string;
  state?: string;
  storeUrl?: string;
  preferredLanguage: AppLanguage;
  emergencyPauseAll: boolean;
  reorderReminders?: AutonomyPolicyConfig['reorderReminders'];
  codPrepayNudges?: AutonomyPolicyConfig['codPrepayNudges'];
  udhaarReminders?: AutonomyPolicyConfig['udhaarReminders'];
  winbackOffers?: AutonomyPolicyConfig['winbackOffers'];
  maxDailyMessagesPerCustomer?: number;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  minConfidenceForAutonomous?: number;
  maxAutonomousDiscountPct?: number;
  dailySpendCapInr?: number;
}

export interface CloudDraftRevision {
  id: string;
  workspaceId: string;
  ownerId: string;
  approvalId: string;
  customerName: string;
  title: string;
  agentName: string;
  message: string;
  status: 'edited' | 'approved' | 'rejected' | 'scheduled';
  timestamp?: string;
}

interface FirebaseContextValue {
  user: User | null;
  authReady: boolean;
  workspaceId: string | null;
  cloudWorkspace: CloudWorkspaceDoc | null;
  cloudCustomers: CustomerRecord[];
  cloudDraftRevisions: CloudDraftRevision[];
  signInWithGoogle: () => Promise<User>;
  signOutFirebase: () => Promise<void>;
  syncWorkspaceProfile: (profile: {
    name: string;
    category: string;
    city: string;
    state: string;
    storeUrl: string;
    preferredLanguage: AppLanguage;
  }) => Promise<void>;
  syncAutonomyPolicy: (config: AutonomyPolicyConfig) => Promise<void>;
  syncCustomer: (customer: {
    id: string;
    name: string;
    phone?: string;
    city?: string;
    lastProductOrdered?: string;
    segment: CustomerSegment;
    totalOrders?: number;
    totalSpent?: number;
    outstandingUdhaar?: number;
    optedOut: boolean;
    aiInsight?: string;
  }) => Promise<void>;
  syncCustomerOptOut: (customerId: string, optedOut: boolean) => Promise<void>;
  syncDraftRevision: (entry: {
    id: string;
    approvalId: string;
    customerName: string;
    title: string;
    agentName: string;
    message: string;
    status: 'edited' | 'approved' | 'rejected' | 'scheduled';
  }) => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextValue | null>(null);

const VALID_SEGMENTS: CustomerSegment[] = [
  'regular',
  'loyal',
  'reorder_due',
  'at_risk',
  'inactive',
  'high_udhaar',
  'first_time',
];

function mapFirestoreCustomer(data: Record<string, unknown>, workspaceId: string): CustomerRecord {
  const seg = VALID_SEGMENTS.includes(data.segment as CustomerSegment)
    ? (data.segment as CustomerSegment)
    : 'regular';
  const optedOut = Boolean(data.optedOut);
  return {
    id: String(data.id || ''),
    business_id: workspaceId,
    name: String(data.name || ''),
    phone: String(data.phone || ''),
    email: '',
    city: String(data.city || ''),
    state: '',
    address_line: '',
    pincode: '',
    primary_category: 'Retail',
    last_product_ordered: String(data.lastProductOrdered || ''),
    first_order_date: '',
    last_order_date: '',
    total_orders: Number(data.totalOrders || 0),
    total_spent: Number(data.totalSpent || 0),
    average_cadence_days: 30,
    days_since_last_order: 0,
    cod_reliability_score: 85,
    outstanding_udhaar: Number(data.outstandingUdhaar || 0),
    udhaar_due_date: '',
    consent_whatsapp: optedOut ? 0 : 1,
    opted_out: optedOut ? 1 : 0,
    preferred_language: 'en',
    segment: seg,
    holdout_group: 0,
    notes: '',
    ai_insight: String(data.aiInsight || ''),
    is_demo: 0,
  };
}

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [cloudWorkspace, setCloudWorkspace] = useState<CloudWorkspaceDoc | null>(null);
  const [cloudCustomers, setCloudCustomers] = useState<CustomerRecord[]>([]);
  const [cloudDraftRevisions, setCloudDraftRevisions] = useState<CloudDraftRevision[]>([]);

  const ensureUserBootstrap = useCallback(async (firebaseUser: User): Promise<string> => {
    const uid = toValidFirestoreId(firebaseUser.uid);
    const derivedWorkspaceId = toValidFirestoreId(`ws_${uid}`);

    const publicPath = `users/${uid}/public/profile`;
    const publicRef = doc(db, 'users', uid, 'public', 'profile');
    try {
      const publicSnap = await getDoc(publicRef);
      const displayName = clampString(firebaseUser.displayName || 'Merchant Owner', 120, 'Merchant Owner');
      const photoUrl = clampString(firebaseUser.photoURL || '', 500, '');
      if (!publicSnap.exists()) {
        await setDoc(publicRef, {
          uid,
          displayName,
          ...(photoUrl ? { photoUrl } : {}),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(publicRef, {
          displayName,
          ...(photoUrl ? { photoUrl } : {}),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, publicPath);
    }

    const privatePath = `users/${uid}/private/info`;
    const privateRef = doc(db, 'users', uid, 'private', 'info');
    try {
      const privateSnap = await getDoc(privateRef);
      const email = clampString(firebaseUser.email || 'merchant@sellvion.in', 180, 'merchant@sellvion.in');
      if (!privateSnap.exists()) {
        await setDoc(privateRef, {
          uid,
          email,
          activeWorkspaceId: derivedWorkspaceId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(privateRef, {
          activeWorkspaceId: derivedWorkspaceId,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, privatePath);
    }

    const wsPath = `workspaces/${derivedWorkspaceId}`;
    const wsRef = doc(db, 'workspaces', derivedWorkspaceId);
    try {
      const wsSnap = await getDoc(wsRef);
      if (!wsSnap.exists()) {
        const defaultName = clampString(
          firebaseUser.displayName ? `${firebaseUser.displayName}'s Store` : 'SELLVION Live Store',
          140,
          'SELLVION Live Store'
        );
        await setDoc(wsRef, {
          id: derivedWorkspaceId,
          ownerId: uid,
          name: defaultName,
          category: 'Retail & D2C',
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
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, wsPath);
    }

    return derivedWorkspaceId;
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        setWorkspaceId(null);
        setCloudWorkspace(null);
        setCloudCustomers([]);
        setCloudDraftRevisions([]);
        setAuthReady(true);
        return;
      }

      if (nextUser.emailVerified) {
        try {
          const wsId = await ensureUserBootstrap(nextUser);
          setWorkspaceId(wsId);
        } catch (err) {
          console.error('Firebase bootstrap error:', err);
        }
      } else {
        setWorkspaceId(toValidFirestoreId(`ws_${nextUser.uid}`));
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, [ensureUserBootstrap]);

  useEffect(() => {
    if (!authReady || !user || !workspaceId) return;

    const uid = toValidFirestoreId(user.uid);
    const wsPath = `workspaces/${workspaceId}`;
    const unsubWorkspace = onSnapshot(
      doc(db, 'workspaces', workspaceId),
      (snap) => {
        if (snap.exists()) {
          setCloudWorkspace(snap.data() as CloudWorkspaceDoc);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, wsPath);
      }
    );

    const customersPath = `workspaces/${workspaceId}/customers`;
    const customersQuery = query(
      collection(db, 'workspaces', workspaceId, 'customers'),
      where('ownerId', '==', uid)
    );
    const unsubCustomers = onSnapshot(
      customersQuery,
      (snap) => {
        const mapped = snap.docs.map((d) =>
          mapFirestoreCustomer(d.data() as Record<string, unknown>, workspaceId)
        );
        setCloudCustomers(mapped);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, customersPath);
      }
    );

    const revisionsPath = `workspaces/${workspaceId}/draftRevisions`;
    const revisionsQuery = query(
      collection(db, 'workspaces', workspaceId, 'draftRevisions'),
      where('ownerId', '==', uid)
    );
    const unsubRevisions = onSnapshot(
      revisionsQuery,
      (snap) => {
        const mapped: CloudDraftRevision[] = snap.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          const created = data.createdAt as { toDate?: () => Date } | undefined;
          const timeStr = created?.toDate
            ? created.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '';
          return {
            id: String(data.id || d.id),
            workspaceId: String(data.workspaceId || workspaceId),
            ownerId: String(data.ownerId || uid),
            approvalId: String(data.approvalId || ''),
            customerName: String(data.customerName || ''),
            title: String(data.title || ''),
            agentName: String(data.agentName || ''),
            message: String(data.message || ''),
            status: (data.status as CloudDraftRevision['status']) || 'edited',
            timestamp: timeStr,
          };
        });
        setCloudDraftRevisions(mapped);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, revisionsPath);
      }
    );

    return () => {
      unsubWorkspace();
      unsubCustomers();
      unsubRevisions();
    };
  }, [authReady, user, workspaceId]);

  const signInWithGoogle = useCallback(async () => {
    const cred = await signInWithPopup(auth, googleProvider);
    return cred.user;
  }, []);

  const signOutFirebase = useCallback(async () => {
    await signOut(auth);
  }, []);

  const syncWorkspaceProfile = useCallback(
    async (profile: {
      name: string;
      category: string;
      city: string;
      state: string;
      storeUrl: string;
      preferredLanguage: AppLanguage;
    }) => {
      if (!user || !workspaceId) return;
      const path = `workspaces/${workspaceId}`;
      try {
        await updateDoc(doc(db, 'workspaces', workspaceId), {
          name: clampString(profile.name, 140, 'SELLVION Store'),
          category: clampString(profile.category, 80, ''),
          city: clampString(profile.city, 80, ''),
          state: clampString(profile.state, 80, ''),
          storeUrl: clampString(profile.storeUrl, 300, ''),
          preferredLanguage: profile.preferredLanguage === 'hi' ? 'hi' : 'en',
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
    },
    [user, workspaceId]
  );

  const syncAutonomyPolicy = useCallback(
    async (config: AutonomyPolicyConfig) => {
      if (!user || !workspaceId) return;
      const path = `workspaces/${workspaceId}`;
      try {
        await updateDoc(doc(db, 'workspaces', workspaceId), {
          emergencyPauseAll: Boolean(config.emergencyPauseAll),
          reorderReminders: config.reorderReminders,
          codPrepayNudges: config.codPrepayNudges,
          udhaarReminders: config.udhaarReminders,
          winbackOffers: config.winbackOffers,
          maxDailyMessagesPerCustomer: clampInt(config.maxDailyMessagesPerCustomer, 1, 10, 1),
          quietHoursStart: clampTimeHHMM(config.quietHoursStart, '21:00'),
          quietHoursEnd: clampTimeHHMM(config.quietHoursEnd, '09:00'),
          minConfidenceForAutonomous: clampInt(config.minConfidenceForAutonomous, 50, 100, 85),
          maxAutonomousDiscountPct: clampInt(config.maxAutonomousDiscountPct, 0, 50, 10),
          dailySpendCapInr: clampNumber(config.dailySpendCapInr, 0, 1000000, 2500),
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
    },
    [user, workspaceId]
  );

  const syncCustomer = useCallback(
    async (customer: {
      id: string;
      name: string;
      phone?: string;
      city?: string;
      lastProductOrdered?: string;
      segment: CustomerSegment;
      totalOrders?: number;
      totalSpent?: number;
      outstandingUdhaar?: number;
      optedOut: boolean;
      aiInsight?: string;
    }) => {
      if (!user || !workspaceId) return;
      const uid = toValidFirestoreId(user.uid);
      const cid = toValidFirestoreId(customer.id, `cust_${Date.now()}`);
      const path = `workspaces/${workspaceId}/customers/${cid}`;
      const ref = doc(db, 'workspaces', workspaceId, 'customers', cid);

      const safeName = clampString(customer.name, 120, 'Customer');
      const safePhone = clampString(customer.phone || '', 32, '');
      const safeCity = clampString(customer.city || '', 80, '');
      const safeProd = clampString(customer.lastProductOrdered || '', 140, '');
      const safeSegment = VALID_SEGMENTS.includes(customer.segment) ? customer.segment : 'regular';
      const safeInsight = clampString(customer.aiInsight || '', 500, '');

      try {
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          await setDoc(ref, {
            id: cid,
            workspaceId,
            ownerId: uid,
            name: safeName,
            phone: safePhone,
            city: safeCity,
            lastProductOrdered: safeProd,
            segment: safeSegment,
            totalOrders: clampInt(customer.totalOrders ?? 0, 0, 100000, 0),
            totalSpent: clampNumber(customer.totalSpent ?? 0, 0, 100000000, 0),
            outstandingUdhaar: clampNumber(customer.outstandingUdhaar ?? 0, 0, 100000000, 0),
            optedOut: Boolean(customer.optedOut),
            aiInsight: safeInsight,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } else {
          await updateDoc(ref, {
            name: safeName,
            phone: safePhone,
            city: safeCity,
            lastProductOrdered: safeProd,
            segment: safeSegment,
            totalOrders: clampInt(customer.totalOrders ?? 0, 0, 100000, 0),
            totalSpent: clampNumber(customer.totalSpent ?? 0, 0, 100000000, 0),
            outstandingUdhaar: clampNumber(customer.outstandingUdhaar ?? 0, 0, 100000000, 0),
            aiInsight: safeInsight,
            updatedAt: serverTimestamp(),
          });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    },
    [user, workspaceId]
  );

  const syncCustomerOptOut = useCallback(
    async (customerId: string, optedOut: boolean) => {
      if (!user || !workspaceId) return;
      const cid = toValidFirestoreId(customerId);
      const path = `workspaces/${workspaceId}/customers/${cid}`;
      try {
        const snap = await getDoc(doc(db, 'workspaces', workspaceId, 'customers', cid));
        if (!snap.exists()) return;
        await updateDoc(doc(db, 'workspaces', workspaceId, 'customers', cid), {
          optedOut: Boolean(optedOut),
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
    },
    [user, workspaceId]
  );

  const syncDraftRevision = useCallback(
    async (entry: {
      id: string;
      approvalId: string;
      customerName: string;
      title: string;
      agentName: string;
      message: string;
      status: 'edited' | 'approved' | 'rejected' | 'scheduled';
    }) => {
      if (!user || !workspaceId) return;
      const uid = toValidFirestoreId(user.uid);
      const revId = toValidFirestoreId(entry.id, `REV_${Date.now()}`);
      const approvalId = toValidFirestoreId(entry.approvalId, 'APR_0');
      const path = `workspaces/${workspaceId}/draftRevisions/${revId}`;
      try {
        await setDoc(doc(db, 'workspaces', workspaceId, 'draftRevisions', revId), {
          id: revId,
          workspaceId,
          ownerId: uid,
          approvalId,
          customerName: clampString(entry.customerName, 120, 'Customer'),
          title: clampString(entry.title, 160, 'Draft Message'),
          agentName: clampString(entry.agentName, 100, 'WhatsApp Agent'),
          message: clampString(entry.message, 1000, '...'),
          status: entry.status,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, path);
      }
    },
    [user, workspaceId]
  );

  return (
    <FirebaseContext.Provider
      value={{
        user,
        authReady,
        workspaceId,
        cloudWorkspace,
        cloudCustomers,
        cloudDraftRevisions,
        signInWithGoogle,
        signOutFirebase,
        syncWorkspaceProfile,
        syncAutonomyPolicy,
        syncCustomer,
        syncCustomerOptOut,
        syncDraftRevision,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
};

export function useFirebase(): FirebaseContextValue {
  const ctx = useContext(FirebaseContext);
  if (!ctx) {
    throw new Error('useFirebase must be used inside a FirebaseProvider');
  }
  return ctx;
}
