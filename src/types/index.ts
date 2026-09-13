export type Role =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'PRINCIPAL'
  | 'TEACHER'
  | 'ACCOUNTANT'
  | 'RECEPTIONIST'
  | 'TRANSPORT_MANAGER'
  | 'PARENT';

export type Permission =
  | 'students.view'
  | 'students.create'
  | 'students.edit'
  | 'students.delete'
  | 'students.archive'
  | 'staff.view'
  | 'staff.create'
  | 'staff.edit'
  | 'staff.delete'
  | 'classes.view'
  | 'classes.manage'
  | 'attendance.view'
  | 'attendance.manage'
  | 'users.view'
  | 'users.manage'
  | 'school_settings.view'
  | 'school_settings.manage'
  | 'reports.view'
  | 'audit.view';

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: [
    'students.view',
    'students.create',
    'students.edit',
    'students.delete',
    'students.archive',
    'staff.view',
    'staff.create',
    'staff.edit',
    'staff.delete',
    'classes.view',
    'classes.manage',
    'attendance.view',
    'attendance.manage',
    'users.view',
    'users.manage',
    'school_settings.view',
    'school_settings.manage',
    'reports.view',
    'audit.view',
  ],
  ADMIN: [
    'students.view',
    'students.create',
    'students.edit',
    'students.delete',
    'students.archive',
    'staff.view',
    'staff.create',
    'staff.edit',
    'staff.delete',
    'classes.view',
    'classes.manage',
    'attendance.view',
    'attendance.manage',
    'users.view',
    'users.manage',
    'school_settings.view',
    'school_settings.manage',
    'reports.view',
    'audit.view',
  ],
  PRINCIPAL: [
    'students.view',
    'students.create',
    'students.edit',
    'students.archive',
    'staff.view',
    'classes.view',
    'classes.manage',
    'attendance.view',
    'attendance.manage',
    'school_settings.view',
    'reports.view',
    'audit.view',
  ],
  TEACHER: [
    'students.view',
    'classes.view',
    'attendance.view',
    'attendance.manage',
    'reports.view',
  ],
  RECEPTIONIST: [
    'students.view',
    'students.create',
    'staff.view',
    'classes.view',
    'attendance.view',
  ],
  ACCOUNTANT: [
    'students.view',
    'reports.view',
  ],
  TRANSPORT_MANAGER: [
    'students.view',
  ],
  PARENT: [
    'students.view',
    'attendance.view',
  ],
};

export interface School {
  id: string;
  name: string;
  code?: string;
  logoUrl?: string;
  address: string;
  city: string;
  state: string;
  pinCode: string;
  phone: string;
  email: string;
  website?: string;
  principalName: string;
  schoolMotto?: string;
  currentSessionId?: string;
  currency?: string;
  timezone?: string;
  gradingSystem?: string;
  isConfigured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  uid: string;
  schoolId: string;
  name: string;
  email: string;
  role: Role;
  status: 'ACTIVE' | 'INACTIVE';
  phone?: string;
  avatarUrl?: string;
  assignedClassIds?: string[];
  assignedSectionIds?: string[];
  assignedSubjectIds?: string[];
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AcademicSession {
  id: string;
  schoolId: string;
  name: string; // e.g. "2025-26"
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClassItem {
  id: string;
  schoolId: string;
  name: string; // e.g. "Class 10"
  code: string; // e.g. "C10"
  sessionId?: string;
  classTeacherId?: string;
  capacity?: number;
  status: 'ACTIVE' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
}

export interface SectionItem {
  id: string;
  schoolId: string;
  classId: string;
  name: string; // e.g. "A"
  sessionId?: string;
  classTeacherId?: string;
  room?: string;
  capacity?: number;
  status: 'ACTIVE' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
}

export interface SubjectItem {
  id: string;
  schoolId: string;
  name: string; // e.g. "Mathematics"
  code: string; // e.g. "MATH101"
  type: 'CORE' | 'ELECTIVE' | 'OPTIONAL' | 'VOCATIONAL';
  maxMarks: number;
  passMarks: number;
  isPractical: boolean;
  assignedClassIds: string[];
  status: 'ACTIVE' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
}

export type StudentStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'TRANSFERRED'
  | 'GRADUATED'
  | 'WITHDRAWN';

export interface StudentDocument {
  name: string;
  type: string;
  url?: string;
  uploadedAt: string;
}

export interface Student {
  id: string;
  schoolId: string;
  // IDENTIFICATION
  admissionNumber: string;
  rollNumber?: string;
  fullName: string;
  photoUrl?: string;
  // PERSONAL
  dateOfBirth?: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  bloodGroup?: string;
  address?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  // ACADEMIC
  sessionId?: string;
  classId: string;
  sectionId: string;
  admissionDate: string;
  previousSchool?: string;
  status: StudentStatus;
  // PARENT/GUARDIAN
  fatherName?: string;
  fatherOccupation?: string;
  motherName?: string;
  motherOccupation?: string;
  guardianName?: string;
  guardianRelation?: string;
  fatherPhone?: string;
  motherPhone?: string;
  guardianPhone?: string;
  parentEmail?: string;
  parentAddress?: string;
  // EMERGENCY
  emergencyName?: string;
  emergencyRelation?: string;
  emergencyPhone?: string;
  medicalNotes?: string;
  // DOCUMENTS
  documents?: StudentDocument[];
  createdAt: string;
  updatedAt: string;
}

export type StaffCategory =
  | 'Principal'
  | 'Vice Principal'
  | 'Teacher'
  | 'Accountant'
  | 'Receptionist'
  | 'Librarian'
  | 'Driver'
  | 'Conductor'
  | 'Security'
  | 'Other';

export type EmploymentStatus =
  | 'ACTIVE'
  | 'ON_LEAVE'
  | 'RESIGNED'
  | 'RETIRED'
  | 'TERMINATED';

export interface StaffMember {
  id: string;
  schoolId: string;
  employeeId: string;
  name: string;
  photoUrl?: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  dateOfBirth?: string;
  phone?: string;
  email?: string;
  address?: string;
  qualification?: string;
  designation: string;
  department?: string;
  category: StaffCategory;
  joiningDate?: string;
  basicSalary?: number;
  employmentStatus: EmploymentStatus;
  emergencyContact?: string;
  assignedClassIds?: string[];
  assignedSectionIds?: string[];
  assignedSubjectIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'LEAVE';

export interface AttendanceRecord {
  studentId: string;
  status: AttendanceStatus;
  remarks?: string;
}

export interface AttendanceDaily {
  id: string;
  schoolId: string;
  sessionId?: string;
  classId: string;
  sectionId: string;
  date: string; // YYYY-MM-DD
  recordedBy: string; // uid or user name
  records: AttendanceRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  schoolId: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  module: string;
  affectedRecord?: string;
  description: string;
}

export interface SystemSettings {
  id: string;
  schoolId: string;
  academicYear?: string;
  dateFormat: string;
  timezone: string;
  currency: string;
  enableDemoMode?: boolean;
  updatedAt: string;
}
