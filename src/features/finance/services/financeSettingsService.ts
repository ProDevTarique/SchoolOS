import { doc, getDoc, setDoc, updateDoc, runTransaction } from 'firebase/firestore';
import { db, cleanFirestoreData, handleFirestoreError, OperationType } from '../../../services/firebase';
import { FinancialSettings, PaymentMode } from '../../../types';
import { logAuditEvent } from '../../../services/auditService';

const FINANCIAL_SETTINGS_COLLECTION = 'financialSettings';

export function getDefaultFinancialSettings(schoolId: string): FinancialSettings {
  const currentYear = new Date().getFullYear();
  const nextYearShort = (currentYear + 1).toString().slice(-2);
  const finYear = `${currentYear}-${nextYearShort}`;
  const now = new Date().toISOString();

  return {
    id: schoolId,
    schoolId,
    academicSessionId: undefined,
    financialYear: finYear,
    receiptPrefix: 'SCH',
    receiptStartingNumber: 1,
    currentReceiptCounter: 0,
    receiptNumberPattern: '{PREFIX}-{YEAR}-{NUM6}',
    currency: '₹',
    currencyCode: 'INR',
    currencySymbol: '₹',
    enabledPaymentMethods: ['CASH', 'BANK_TRANSFER', 'UPI', 'CARD', 'CHEQUE', 'OTHER'],
    defaultPaymentMethod: 'CASH',
    allowPartialPayments: true,
    allowAdvancePayments: true,
    defaultLateFeeType: 'FIXED',
    defaultLateFeeAmount: 50,
    defaultGracePeriodDays: 5,
    notificationPreferences: {
      feeDueReminder: true,
      feeOverdueReminder: true,
      paymentConfirmation: true,
      receiptNotification: true,
    },
    termsAndConditions: '1. Fees once paid are non-refundable.\n2. Please retain this receipt for future reference.\n3. Cheque payment is subject to realization.',
    authorizedSignatoryName: 'Authorized Signatory',
    authorizedSignatoryTitle: 'Accounts Department',
    receiptShowSchoolAddress: true,
    receiptShowParentDetails: true,
    createdAt: now,
    updatedAt: now,
  };
}

export async function getFinancialSettings(schoolId: string): Promise<FinancialSettings> {
  try {
    const docRef = doc(db, FINANCIAL_SETTINGS_COLLECTION, schoolId);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      const defaults = getDefaultFinancialSettings(schoolId);
      await setDoc(docRef, cleanFirestoreData(defaults));
      return defaults;
    }

    return {
      id: snap.id,
      ...(snap.data() as Omit<FinancialSettings, 'id'>),
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, FINANCIAL_SETTINGS_COLLECTION);
  }
}

export async function updateFinancialSettings(
  schoolId: string,
  updates: Partial<FinancialSettings> & { enabledPaymentMethods?: PaymentMode[] },
  userId: string,
  userName: string,
  userRole: string
): Promise<FinancialSettings> {
  try {
    const docRef = doc(db, FINANCIAL_SETTINGS_COLLECTION, schoolId);
    const existing = await getFinancialSettings(schoolId);
    const now = new Date().toISOString();

    if (updates.enabledPaymentMethods && updates.enabledPaymentMethods.length === 0) {
      throw new Error('Enable at least one payment method.');
    }
    if (
      updates.defaultPaymentMethod &&
      updates.enabledPaymentMethods &&
      !updates.enabledPaymentMethods.includes(updates.defaultPaymentMethod)
    ) {
      throw new Error('The default payment method must be enabled.');
    }

    const merged: FinancialSettings = {
      ...existing,
      ...updates,
      updatedAt: now,
    };

    await setDoc(docRef, cleanFirestoreData(merged));

    await logAuditEvent({
      schoolId,
      userId,
      userName,
      userRole,
      action: 'FINANCE_SETTINGS_UPDATED',
      module: 'Finance',
      affectedRecord: schoolId,
      description: `Updated finance settings: financial year ${merged.financialYear}, receipt prefix ${merged.receiptPrefix}`,
    });

    return merged;
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, FINANCIAL_SETTINGS_COLLECTION);
  }
}

/**
 * Atomically generates the next receipt number using Firestore transaction.
 * Pattern supports:
 * {PREFIX} -> e.g. SCH
 * {YEAR} -> e.g. 2026 or 2026-27
 * {NUM5} -> 00001
 * {NUM6} -> 000001
 */
export async function generateNextReceiptNumber(
  schoolId: string,
  overrideFinYear?: string
): Promise<{ receiptNumber: string; counter: number }> {
  const docRef = doc(db, FINANCIAL_SETTINGS_COLLECTION, schoolId);

  return await runTransaction(db, async (txn) => {
    const snap = await txn.get(docRef);
    let settings: FinancialSettings;

    if (!snap.exists()) {
      settings = getDefaultFinancialSettings(schoolId);
      settings.currentReceiptCounter = settings.receiptStartingNumber || 1;
      txn.set(docRef, cleanFirestoreData(settings));
    } else {
      settings = snap.data() as FinancialSettings;
      const nextCounter = Math.max(
        (settings.currentReceiptCounter || 0) + 1,
        settings.receiptStartingNumber || 1
      );
      settings.currentReceiptCounter = nextCounter;
      txn.update(docRef, {
        currentReceiptCounter: nextCounter,
        updatedAt: new Date().toISOString(),
      });
    }

    const counter = settings.currentReceiptCounter;
    const prefix = settings.receiptPrefix || 'SCH';
    const year = overrideFinYear || settings.financialYear || new Date().getFullYear().toString();
    const pattern = settings.receiptNumberPattern || '{PREFIX}-{YEAR}-{NUM6}';

    let formattedNumber = pattern
      .replace('{PREFIX}', prefix)
      .replace('{YEAR}', year)
      .replace('{NUM6}', counter.toString().padStart(6, '0'))
      .replace('{NUM5}', counter.toString().padStart(5, '0'))
      .replace('{NUM4}', counter.toString().padStart(4, '0'));

    if (!formattedNumber.includes(counter.toString())) {
      formattedNumber = `${formattedNumber}-${counter.toString().padStart(5, '0')}`;
    }

    return { receiptNumber: formattedNumber, counter };
  });
}
