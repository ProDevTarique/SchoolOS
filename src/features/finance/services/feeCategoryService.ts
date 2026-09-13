import {
  collection,
  doc,
  getDocs,
  updateDoc,
  runTransaction,
  query,
  where,
} from 'firebase/firestore';
import { db, cleanFirestoreData, handleFirestoreError, OperationType } from '../../../services/firebase';
import { FeeCategory, STANDARD_FEE_CATEGORIES } from '../../../types';
import { logAuditEvent } from '../../../services/auditService';

const COLLECTION = 'feeCategories';

const categoryIdForCode = (code: string) =>
  `category_${code.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`;

export async function getFeeCategories(schoolId: string): Promise<FeeCategory[]> {
  try {
    const snapshot = await getDocs(query(collection(db, COLLECTION), where('schoolId', '==', schoolId)));
    return snapshot.docs
      .map((item) => ({ id: item.id, ...(item.data() as Omit<FeeCategory, 'id'>) }))
      .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION);
  }
}

export async function createFeeCategory(
  data: Omit<FeeCategory, 'id' | 'createdAt' | 'updatedAt'>,
  userId: string,
  userName: string,
  userRole: string
): Promise<FeeCategory> {
  const id = categoryIdForCode(data.code);
  const record: FeeCategory = {
    ...data,
    id,
    code: data.code.trim().toUpperCase(),
    name: data.name.trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await runTransaction(db, async (transaction) => {
      const ref = doc(db, COLLECTION, id);
      const existing = await transaction.get(ref);
      if (existing.exists()) {
        throw new Error(`Fee category code "${record.code}" already exists.`);
      }
      transaction.set(ref, cleanFirestoreData(record));
    });
    await logAuditEvent({
      schoolId: data.schoolId,
      userId,
      userName,
      userRole,
      action: 'FEE_CATEGORY_CREATED',
      module: 'Finance',
      affectedRecord: id,
      description: `Created fee category "${record.name}"`,
    });
    return record;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, COLLECTION);
  }
}

export async function updateFeeCategory(
  category: FeeCategory,
  updates: Pick<FeeCategory, 'name' | 'description' | 'status' | 'displayOrder'>,
  userId: string,
  userName: string,
  userRole: string
): Promise<void> {
  try {
    await updateDoc(doc(db, COLLECTION, category.id), cleanFirestoreData({
      ...updates,
      name: updates.name.trim(),
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    }));
    await logAuditEvent({
      schoolId: category.schoolId,
      userId,
      userName,
      userRole,
      action: 'FEE_CATEGORY_UPDATED',
      module: 'Finance',
      affectedRecord: category.id,
      description: `Updated fee category "${category.name}"`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTION}/${category.id}`);
  }
}

export async function initializeDefaultFeeCategories(
  schoolId: string,
  userId: string,
  userName: string,
  userRole: string
): Promise<void> {
  const existing = await getFeeCategories(schoolId);
  const existingCodes = new Set(existing.map((category) => category.code));
  for (const [index, name] of STANDARD_FEE_CATEGORIES.entries()) {
    const code = name.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
    if (!existingCodes.has(code)) {
      await createFeeCategory({
        schoolId,
        name,
        code,
        status: 'ACTIVE',
        displayOrder: index + 1,
        createdBy: userId,
      }, userId, userName, userRole);
    }
  }
}
