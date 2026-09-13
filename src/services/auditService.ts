import { collection, addDoc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, cleanFirestoreData } from './firebase';
import { AuditLog } from '../types';

const AUDIT_COLLECTION = 'auditLogs';

export async function logAuditEvent(params: {
  schoolId: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  module: string;
  affectedRecord?: string;
  description: string;
}): Promise<void> {
  try {
    const payload: Omit<AuditLog, 'id'> = {
      schoolId: params.schoolId,
      timestamp: new Date().toISOString(),
      userId: params.userId,
      userName: params.userName,
      userRole: params.userRole,
      action: params.action,
      module: params.module,
      affectedRecord: params.affectedRecord || '',
      description: params.description,
    };
    await addDoc(collection(db, AUDIT_COLLECTION), cleanFirestoreData(payload));
  } catch (err) {
    // Non-blocking for UI, but log to error handler
    console.error('Audit log failed:', err);
  }
}

export async function getAuditLogs(schoolId: string, maxLimit = 100): Promise<AuditLog[]> {
  try {
    const q = query(
      collection(db, AUDIT_COLLECTION),
      where('schoolId', '==', schoolId),
      orderBy('timestamp', 'desc'),
      limit(maxLimit)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<AuditLog, 'id'>),
    }));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, AUDIT_COLLECTION);
  }
}
