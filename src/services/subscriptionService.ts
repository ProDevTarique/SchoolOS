import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { SchoolSubscription } from '../types';

const SUBSCRIPTIONS_COLLECTION = 'schoolSubscriptions';

export async function getSchoolSubscription(
  schoolId: string
): Promise<SchoolSubscription | null> {
  try {
    const snapshot = await getDoc(doc(db, SUBSCRIPTIONS_COLLECTION, schoolId));
    if (!snapshot.exists()) return null;
    return snapshot.data() as SchoolSubscription;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `${SUBSCRIPTIONS_COLLECTION}/${schoolId}`);
  }
}

// Subscription dates are stored as native Firestore Timestamps so that
// Firestore security rules can enforce entitlement directly (rules cannot
// parse ISO strings). This helper normalizes a Timestamp (or, defensively,
// a Date/ISO string) into a plain Date for comparison.
function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

// The only recognized subscription statuses. Anything else (unknown/garbage
// values) must be treated as a malformed configuration, never as entitled.
const VALID_SUBSCRIPTION_STATUSES: readonly string[] = [
  'TRIAL', 'ACTIVE', 'PAST_DUE', 'GRACE_PERIOD', 'SUSPENDED', 'CANCELLED',
];

export function evaluateSubscription(
  subscription: SchoolSubscription | null,
  now = new Date()
): { state: 'ENTITLED' | 'GRACE' | 'SUSPENDED' | 'CANCELLED' | 'MISSING_CONFIGURATION' | 'ERROR'; reason: string } {
  if (!subscription) {
    return { state: 'MISSING_CONFIGURATION', reason: 'No subscription is configured for this school.' };
  }

  if (
    !subscription.schoolId ||
    !subscription.planId ||
    !subscription.status ||
    !subscription.currentPeriodEnd ||
    !subscription.provider
  ) {
    return { state: 'ERROR', reason: 'The subscription configuration is incomplete.' };
  }

  if (!VALID_SUBSCRIPTION_STATUSES.includes(subscription.status)) {
    return { state: 'ERROR', reason: 'The subscription status is not recognized.' };
  }

  const periodEnd = toDate(subscription.currentPeriodEnd);
  const graceEnd = subscription.gracePeriodEnd ? toDate(subscription.gracePeriodEnd) : null;
  if (!periodEnd || (subscription.gracePeriodEnd && !graceEnd)) {
    return { state: 'ERROR', reason: 'The subscription dates are invalid.' };
  }

  if (subscription.status === 'SUSPENDED') {
    return { state: 'SUSPENDED', reason: 'This school subscription is suspended.' };
  }
  if (subscription.status === 'CANCELLED') {
    return { state: 'CANCELLED', reason: 'This school subscription is cancelled.' };
  }
  if (subscription.status === 'GRACE_PERIOD') {
    return graceEnd && now <= graceEnd
      ? { state: 'GRACE', reason: 'The school is operating within its grace period.' }
      : { state: 'SUSPENDED', reason: 'The subscription grace period has expired.' };
  }
  if (now <= periodEnd) {
    return subscription.status === 'PAST_DUE'
      ? { state: 'GRACE', reason: 'The subscription is past due but remains temporarily available.' }
      : { state: 'ENTITLED', reason: 'The school subscription is active.' };
  }
  if (graceEnd && now <= graceEnd) {
    return { state: 'GRACE', reason: 'The subscription is within its configured grace period.' };
  }
  return { state: 'SUSPENDED', reason: 'The subscription period has expired.' };
}
