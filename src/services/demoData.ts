import { collection, doc, writeBatch } from 'firebase/firestore';
import { db, cleanFirestoreData } from './firebase';
import {
  School,
  AcademicSession,
  ClassItem,
  SectionItem,
  SubjectItem,
  Student,
  StaffMember,
} from '../types';
import { logAuditEvent } from './auditService';

export async function loadDemoSchoolData(schoolId: string, adminUserId: string, adminName: string): Promise<void> {
  const batch = writeBatch(db);
  const now = new Date().toISOString();

  // 1. Academic Session
  const sessionId = `session_demo_2025_26`;
  const session: AcademicSession = {
    id: sessionId,
    schoolId,
    name: '2025-26',
    startDate: '2025-04-01',
    endDate: '2026-03-31',
    isActive: true,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  };
  batch.set(doc(db, 'academicSessions', sessionId), cleanFirestoreData(session));

  // 2. Classes: Class 9, Class 10, Class 11
  const classDefs = [
    { id: 'class_demo_c9', name: 'Class 9', code: 'C09' },
    { id: 'class_demo_c10', name: 'Class 10', code: 'C10' },
    { id: 'class_demo_c11', name: 'Class 11', code: 'C11' },
  ];

  classDefs.forEach((c) => {
    const classData: ClassItem = {
      id: c.id,
      schoolId,
      name: c.name,
      code: c.code,
      sessionId,
      capacity: 60,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    };
    batch.set(doc(db, 'classes', c.id), cleanFirestoreData(classData));
  });

  // 3. Sections: A, B for each class
  const sectionDefs: { id: string; classId: string; name: string; room: string }[] = [];
  classDefs.forEach((c) => {
    sectionDefs.push({
      id: `sec_demo_${c.code}_A`,
      classId: c.id,
      name: 'A',
      room: `Room ${c.code}-1`,
    });
    sectionDefs.push({
      id: `sec_demo_${c.code}_B`,
      classId: c.id,
      name: 'B',
      room: `Room ${c.code}-2`,
    });
  });

  sectionDefs.forEach((s) => {
    const secData: SectionItem = {
      id: s.id,
      schoolId,
      classId: s.classId,
      name: s.name,
      room: s.room,
      capacity: 35,
      sessionId,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    };
    batch.set(doc(db, 'sections', s.id), cleanFirestoreData(secData));
  });

  // 4. Subjects: English, Mathematics, Science, Social Science, Hindi
  const subjectDefs = [
    { name: 'English', code: 'ENG101', type: 'CORE' as const, maxMarks: 100, passMarks: 33, isPractical: false },
    { name: 'Mathematics', code: 'MTH102', type: 'CORE' as const, maxMarks: 100, passMarks: 33, isPractical: false },
    { name: 'Science', code: 'SCI103', type: 'CORE' as const, maxMarks: 100, passMarks: 33, isPractical: true },
    { name: 'Social Science', code: 'SST104', type: 'CORE' as const, maxMarks: 100, passMarks: 33, isPractical: false },
    { name: 'Hindi', code: 'HIN105', type: 'CORE' as const, maxMarks: 100, passMarks: 33, isPractical: false },
  ];

  subjectDefs.forEach((sub, idx) => {
    const subId = `sub_demo_${idx + 1}`;
    const subData: SubjectItem = {
      id: subId,
      schoolId,
      name: sub.name,
      code: sub.code,
      type: sub.type,
      maxMarks: sub.maxMarks,
      passMarks: sub.passMarks,
      isPractical: sub.isPractical,
      assignedClassIds: classDefs.map((c) => c.id),
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    };
    batch.set(doc(db, 'subjects', subId), cleanFirestoreData(subData));
  });

  // 5. Teachers: 5 teachers
  const teachers = [
    { name: 'Dr. Ramesh Chandra', empId: 'TCH-001', desig: 'Senior Math Teacher', dept: 'Mathematics', phone: '+91 9811223344', email: 'ramesh.chandra@schoolos.demo' },
    { name: 'Mrs. Sunita Verma', empId: 'TCH-002', desig: 'Science Faculty', dept: 'Science', phone: '+91 9811223345', email: 'sunita.verma@schoolos.demo' },
    { name: 'Mr. Arvind Joshi', empId: 'TCH-003', desig: 'English Teacher', dept: 'Languages', phone: '+91 9811223346', email: 'arvind.joshi@schoolos.demo' },
    { name: 'Ms. Priya Menon', empId: 'TCH-004', desig: 'Social Studies Teacher', dept: 'Social Studies', phone: '+91 9811223347', email: 'priya.menon@schoolos.demo' },
    { name: 'Mr. Alok Mishra', empId: 'TCH-005', desig: 'Hindi Faculty', dept: 'Languages', phone: '+91 9811223348', email: 'alok.mishra@schoolos.demo' },
  ];

  teachers.forEach((t, i) => {
    const tId = `staff_demo_tch_${i + 1}`;
    const staffData: StaffMember = {
      id: tId,
      schoolId,
      employeeId: t.empId,
      name: t.name,
      gender: i % 2 === 0 ? 'MALE' : 'FEMALE',
      phone: t.phone,
      email: t.email,
      designation: t.desig,
      department: t.dept,
      category: 'Teacher',
      joiningDate: '2022-07-01',
      employmentStatus: 'ACTIVE',
      assignedClassIds: [classDefs[i % classDefs.length].id],
      createdAt: now,
      updatedAt: now,
    };
    batch.set(doc(db, 'staff', tId), cleanFirestoreData(staffData));
  });

  // 6. Other Staff: 3 staff members
  const otherStaff = [
    { name: 'Vikram Singh', empId: 'STF-001', category: 'Accountant' as const, desig: 'Chief Accountant', dept: 'Accounts', phone: '+91 9811001122' },
    { name: 'Meena Rawat', empId: 'STF-002', category: 'Receptionist' as const, desig: 'Front Desk Officer', dept: 'Administration', phone: '+91 9811001123' },
    { name: 'Sanjay Kumar', empId: 'STF-003', category: 'Librarian' as const, desig: 'Head Librarian', dept: 'Library', phone: '+91 9811001124' },
  ];

  otherStaff.forEach((st, i) => {
    const sId = `staff_demo_oth_${i + 1}`;
    const staffData: StaffMember = {
      id: sId,
      schoolId,
      employeeId: st.empId,
      name: st.name,
      gender: i % 2 === 0 ? 'MALE' : 'FEMALE',
      phone: st.phone,
      designation: st.desig,
      department: st.dept,
      category: st.category,
      joiningDate: '2023-01-15',
      employmentStatus: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    };
    batch.set(doc(db, 'staff', sId), cleanFirestoreData(staffData));
  });

  // 7. Students: 20 students
  const studentNames = [
    { name: 'Aarav Sharma', gender: 'MALE' as const, father: 'Rajesh Sharma', mother: 'Pooja Sharma' },
    { name: 'Ananya Gupta', gender: 'FEMALE' as const, father: 'Deepak Gupta', mother: 'Seema Gupta' },
    { name: 'Vihaan Patel', gender: 'MALE' as const, father: 'Kiran Patel', mother: 'Geeta Patel' },
    { name: 'Diya Nair', gender: 'FEMALE' as const, father: 'Manoj Nair', mother: 'Saritha Nair' },
    { name: 'Ishaan Roy', gender: 'MALE' as const, father: 'Subhash Roy', mother: 'Bani Roy' },
    { name: 'Riya Sen', gender: 'FEMALE' as const, father: 'Debashish Sen', mother: 'Ruma Sen' },
    { name: 'Kabir Kapoor', gender: 'MALE' as const, father: 'Anil Kapoor', mother: 'Sunita Kapoor' },
    { name: 'Avani Deshmukh', gender: 'FEMALE' as const, father: 'Sanjay Deshmukh', mother: 'Shalini Deshmukh' },
    { name: 'Reyansh Malhotra', gender: 'MALE' as const, father: 'Vivek Malhotra', mother: 'Ritu Malhotra' },
    { name: 'Saisha Mehta', gender: 'FEMALE' as const, father: 'Nikhil Mehta', mother: 'Kavita Mehta' },
    { name: 'Advait Rao', gender: 'MALE' as const, father: 'Venkat Rao', mother: 'Lakshmi Rao' },
    { name: 'Myra Bhatia', gender: 'FEMALE' as const, father: 'Gaurav Bhatia', mother: 'Divya Bhatia' },
    { name: 'Dhruv Chauhan', gender: 'MALE' as const, father: 'Ravi Chauhan', mother: 'Anita Chauhan' },
    { name: 'Kavya Pillai', gender: 'FEMALE' as const, father: 'Hari Pillai', mother: 'Radha Pillai' },
    { name: 'Shaurya Tiwari', gender: 'MALE' as const, father: 'Santosh Tiwari', mother: 'Manju Tiwari' },
    { name: 'Tara Saxena', gender: 'FEMALE' as const, father: 'Pradeep Saxena', mother: 'Alka Saxena' },
    { name: 'Atharv Joshi', gender: 'MALE' as const, father: 'Kamlesh Joshi', mother: 'Nalini Joshi' },
    { name: 'Zoya Khan', gender: 'FEMALE' as const, father: 'Imran Khan', mother: 'Nasreen Khan' },
    { name: 'Kian Agarwal', gender: 'MALE' as const, father: 'Ashish Agarwal', mother: 'Neelam Agarwal' },
    { name: 'Navya Iyer', gender: 'FEMALE' as const, father: 'Gopal Iyer', mother: 'Meenakshi Iyer' },
  ];

  studentNames.forEach((st, idx) => {
    const sId = `student_demo_${idx + 1}`;
    const assignedClass = classDefs[idx % classDefs.length];
    const assignedSec = sectionDefs.find((s) => s.classId === assignedClass.id && s.name === (idx % 2 === 0 ? 'A' : 'B'))!;

    const studentData: Student = {
      id: sId,
      schoolId,
      admissionNumber: `ADM-2025-${(idx + 1).toString().padStart(3, '0')}`,
      rollNumber: `${(idx % 10) + 1}`,
      fullName: st.name,
      gender: st.gender,
      dateOfBirth: '2010-06-20',
      bloodGroup: ['A+', 'B+', 'O+', 'AB+'][idx % 4],
      sessionId,
      classId: assignedClass.id,
      sectionId: assignedSec ? assignedSec.id : sectionDefs[0].id,
      admissionDate: '2025-04-10',
      status: 'ACTIVE',
      fatherName: st.father,
      motherName: st.mother,
      fatherPhone: `+91 987000${(1000 + idx).toString().slice(1)}`,
      motherPhone: `+91 987001${(1000 + idx).toString().slice(1)}`,
      parentEmail: `parent.${idx + 1}@example.com`,
      address: `${100 + idx}, Civil Lines`,
      city: 'Metropolis',
      state: 'Delhi',
      pinCode: '110001',
      emergencyName: st.father,
      emergencyRelation: 'Father',
      emergencyPhone: `+91 987000${(1000 + idx).toString().slice(1)}`,
      createdAt: now,
      updatedAt: now,
    };
    batch.set(doc(db, 'students', sId), cleanFirestoreData(studentData));
  });

  // Update current session on school document
  batch.update(doc(db, 'schools', schoolId), {
    currentSessionId: sessionId,
    updatedAt: now,
  });

  await batch.commit();

  await logAuditEvent({
    schoolId,
    userId: adminUserId,
    userName: adminName,
    userRole: 'ADMIN',
    action: 'DEMO_DATA_LOADED',
    module: 'System',
    description: 'Sample academic structure, 20 students, 5 teachers, and 3 staff loaded successfully.',
  });
}

export async function seedDemoData(
  schoolId: string,
  adminUserId: string = 'system_admin',
  adminName: string = 'System Admin'
): Promise<void> {
  return loadDemoSchoolData(schoolId, adminUserId, adminName);
}
