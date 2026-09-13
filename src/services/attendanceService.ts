import {
  collection,
  doc,
  getDocs,
  setDoc,
  query,
  where,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, cleanFirestoreData } from './firebase';
import { AttendanceDaily, AttendanceRecord } from '../types';

const ATTENDANCE_COLLECTION = 'attendance';

export async function getDailyAttendance(
  schoolId: string,
  classId: string,
  sectionId: string,
  date: string
): Promise<AttendanceDaily | null> {
  try {
    const q = query(
      collection(db, ATTENDANCE_COLLECTION),
      where('schoolId', '==', schoolId),
      where('classId', '==', classId),
      where('sectionId', '==', sectionId),
      where('date', '==', date)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return {
      id: d.id,
      ...(d.data() as Omit<AttendanceDaily, 'id'>),
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, ATTENDANCE_COLLECTION);
  }
}

export async function saveDailyAttendance(params: {
  schoolId: string;
  classId: string;
  sectionId: string;
  date: string;
  recordedBy: string;
  records: AttendanceRecord[];
  sessionId?: string;
}): Promise<AttendanceDaily> {
  try {
    // Unique document ID per class + section + date to prevent duplicate logs
    const id = `att_${params.classId}_${params.sectionId}_${params.date}`;
    const ref = doc(db, ATTENDANCE_COLLECTION, id);
    const payload: AttendanceDaily = {
      id,
      schoolId: params.schoolId,
      sessionId: params.sessionId || '',
      classId: params.classId,
      sectionId: params.sectionId,
      date: params.date,
      recordedBy: params.recordedBy,
      records: params.records,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(ref, cleanFirestoreData(payload), { merge: true });
    return payload;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, ATTENDANCE_COLLECTION);
  }
}

export async function getStudentAttendanceHistory(
  schoolId: string,
  studentId: string,
  startDate?: string,
  endDate?: string
): Promise<{ date: string; status: string; remarks?: string }[]> {
  try {
    // Query attendance records for the school
    const q = query(collection(db, ATTENDANCE_COLLECTION), where('schoolId', '==', schoolId));
    const snap = await getDocs(q);
    const history: { date: string; status: string; remarks?: string }[] = [];

    snap.docs.forEach((docItem) => {
      const data = docItem.data() as AttendanceDaily;
      if (startDate && data.date < startDate) return;
      if (endDate && data.date > endDate) return;

      const matched = data.records?.find((r) => r.studentId === studentId);
      if (matched) {
        history.push({
          date: data.date,
          status: matched.status,
          remarks: matched.remarks,
        });
      }
    });

    history.sort((a, b) => b.date.localeCompare(a.date));
    return history;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, ATTENDANCE_COLLECTION);
  }
}

export async function getTodayAttendanceSummary(schoolId: string, date: string): Promise<{
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  totalLeave: number;
  totalMarked: number;
  percentage: number;
}> {
  try {
    const q = query(
      collection(db, ATTENDANCE_COLLECTION),
      where('schoolId', '==', schoolId),
      where('date', '==', date)
    );
    const snap = await getDocs(q);
    let present = 0;
    let absent = 0;
    let late = 0;
    let leave = 0;

    snap.docs.forEach((d) => {
      const daily = d.data() as AttendanceDaily;
      daily.records?.forEach((rec) => {
        if (rec.status === 'PRESENT') present++;
        else if (rec.status === 'ABSENT') absent++;
        else if (rec.status === 'LATE') late++;
        else if (rec.status === 'LEAVE') leave++;
      });
    });

    const total = present + absent + late + leave;
    const percentage = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

    return {
      totalPresent: present,
      totalAbsent: absent,
      totalLate: late,
      totalLeave: leave,
      totalMarked: total,
      percentage,
    };
  } catch {
    return {
      totalPresent: 0,
      totalAbsent: 0,
      totalLate: 0,
      totalLeave: 0,
      totalMarked: 0,
      percentage: 0,
    };
  }
}
