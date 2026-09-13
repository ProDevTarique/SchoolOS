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
  | 'audit.view'
  | 'fees.view'
  | 'fees.create'
  | 'fees.edit'
  | 'fees.collect'
  | 'fees.manage'
  | 'receipts.view'
  | 'receipts.print'
  | 'receipts.cancel'
  | 'expenses.create'
  | 'expenses.view'
  | 'expenses.edit'
  | 'expenses.approve'
  | 'accounts.view'
  | 'reports.finance.view'
  | 'finance_settings.manage';

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
    'fees.view',
    'fees.create',
    'fees.edit',
    'fees.collect',
    'fees.manage',
    'receipts.view',
    'receipts.print',
    'receipts.cancel',
    'expenses.create',
    'expenses.view',
    'expenses.edit',
    'expenses.approve',
    'accounts.view',
    'reports.finance.view',
    'finance_settings.manage',
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
    'fees.view',
    'fees.create',
    'fees.edit',
    'fees.collect',
    'fees.manage',
    'receipts.view',
    'receipts.print',
    'receipts.cancel',
    'expenses.create',
    'expenses.view',
    'expenses.edit',
    'expenses.approve',
    'accounts.view',
    'reports.finance.view',
    'finance_settings.manage',
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
    'fees.view',
    'fees.manage',
    'receipts.view',
    'receipts.print',
    'expenses.view',
    'expenses.approve',
    'accounts.view',
    'reports.finance.view',
  ],
  ACCOUNTANT: [
    'students.view',
    'reports.view',
    'fees.view',
    'fees.collect',
    'fees.edit',
    'receipts.view',
    'receipts.print',
    'expenses.create',
    'expenses.view',
    'reports.finance.view',
    'accounts.view',
  ],
  RECEPTIONIST: [
    'students.view',
    'students.create',
    'staff.view',
    'classes.view',
    'attendance.view',
    'fees.view',
    'fees.collect',
    'receipts.view',
    'receipts.print',
  ],
  TEACHER: [
    'students.view',
    'classes.view',
    'attendance.view',
    'attendance.manage',
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

// ==========================================
// PHASE 2: FINANCE, FEES & ACCOUNTS MODELS
// ==========================================

export type FeeFrequency =
  | 'ONE_TIME'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'HALF_YEARLY'
  | 'ANNUAL'
  | 'PER_DAY'
  | 'CUSTOM';

export type LateFeeType =
  | 'NONE'
  | 'FIXED'
  | 'PERCENTAGE'
  | 'PER_DAY'
  | 'PER_WEEK'
  | 'ONE_TIME';

export const STANDARD_FEE_CATEGORIES = [
  'Admission Fee',
  'Tuition Fee',
  'Annual Fee',
  'Development Fee',
  'Examination Fee',
  'Computer Fee',
  'Library Fee',
  'Laboratory Fee',
  'Activity Fee',
  'Miscellaneous Fee',
  'Transport Fee',
] as const;

export type FeeCategoryStatus = 'ACTIVE' | 'INACTIVE';

export interface FeeCategory {
  id: string;
  schoolId: string;
  name: string;
  code: string;
  description?: string;
  status: FeeCategoryStatus;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
}

export interface LateFeeRule {
  type: LateFeeType;
  amount: number;
  gracePeriodDays: number;
}

export interface FeeStructure {
  id: string;
  schoolId: string;
  academicSessionId: string;
  name: string;
  classId: string;
  sectionId?: string; // Optional: entire class or specific section
  feeCategoryId?: string;
  feeCategory: string;
  frequency: FeeFrequency;
  applicableMonths?: string[]; // Academic session-based months
  amount: number;
  dueDateDay?: number; // e.g. 10th of every month
  dueDate?: string; // YYYY-MM-DD for one-time/annual
  lateFeeRule: LateFeeRule;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  description?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
}

export interface FeeAssignment {
  id: string;
  schoolId: string;
  academicSessionId: string;
  feeStructureId: string;
  feeCategoryId?: string;
  amount?: number;
  frequency?: FeeFrequency;
  effectiveFrom?: string;
  effectiveTo?: string;
  assignmentType: 'CLASS' | 'SECTION' | 'STUDENT';
  classId: string;
  sectionId?: string;
  studentId?: string;
  customAmount?: number; // individual student override
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type FeeItemStatus = 'PAID' | 'PARTIAL' | 'PENDING' | 'OVERDUE' | 'WAIVED';

export interface FeeItem {
  id: string;
  schoolId: string;
  academicSessionId: string;
  studentId: string;
  classId?: string;
  sectionId?: string;
  feeAssignmentId?: string;
  feeStructureId?: string;
  feeCategoryId?: string;
  frequency?: FeeFrequency;
  feeCategory: string;
  name: string; // e.g. "Tuition Fee - May 2026"
  period: string; // e.g. "May 2026"
  dueDate: string; // YYYY-MM-DD
  grossAmount: number;
  baseAmount?: number;
  discountAmount: number;
  concessionAmount: number;
  effectiveAmount?: number;
  lastPaymentId?: string;
  lastPaymentItemId?: string;
  appliedConcessionId?: string;
  appliedConcessionType?: 'FIXED_AMOUNT' | 'PERCENTAGE';
  appliedConcessionValue?: number;
  lateFeeAmount: number;
  netPayable: number; // gross - discount - concession + lateFee
  paidAmount: number;
  balance: number; // netPayable - paidAmount
  status: FeeItemStatus;
  waiverReason?: string;
  waivedBy?: string;
  waivedAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
}

export type DiscountType =
  | 'FIXED'
  | 'FIXED_AMOUNT'
  | 'PERCENTAGE'
  | 'SCHOLARSHIP'
  | 'SIBLING'
  | 'STAFF_CHILD'
  | 'CUSTOM';

export type DiscountScope = 'CATEGORY' | 'STRUCTURE' | 'STUDENT' | 'PAYMENT';

export interface FeeDiscount {
  id: string;
  schoolId: string;
  academicSessionId: string;
  name: string;
  code?: string;
  description?: string;
  type: DiscountType;
  discountScope: DiscountScope;
  value: number; // Amount or percentage
  applicableCategory?: string;
  feeCategoryId?: string;
  feeStructureId?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  studentId?: string;
  reason: string;
  approvedBy: string;
  approvedByName: string;
  date: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface FeeConcession {
  id: string;
  schoolId: string;
  academicSessionId: string;
  studentId: string;
  feeItemId: string;
  feeAssignmentId?: string;
  feeCategoryId?: string;
  feeStructureId?: string;
  classId?: string;
  sectionId?: string;
  type?: 'FIXED_AMOUNT' | 'PERCENTAGE';
  value?: number;
  originalAmount: number;
  concessionAmount: number;
  payableAmount: number;
  reason: string;
  approvedBy: string;
  approvedByName: string;
  date: string;
  status: 'ACTIVE' | 'INACTIVE' | 'APPROVED' | 'REVOKED';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type PaymentMode =
  | 'CASH'
  | 'UPI'
  | 'BANK_TRANSFER'
  | 'CHEQUE'
  | 'DEMAND_DRAFT'
  | 'CARD'
  | 'ONLINE'
  | 'OTHER';

export const PAYMENT_MODE_OPTIONS: { value: PaymentMode; label: string }[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'UPI', label: 'UPI' },
  { value: 'CARD', label: 'Card' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'DEMAND_DRAFT', label: 'Demand Draft' },
  { value: 'ONLINE', label: 'Online' },
  { value: 'OTHER', label: 'Other' },
];

export type ChequeClearingStatus = 'PENDING' | 'CLEARED' | 'BOUNCED' | 'CANCELLED';

export interface ChequeDetails {
  chequeNumber: string;
  bankName: string;
  chequeDate: string;
  clearingStatus: ChequeClearingStatus;
  clearanceDate?: string;
}

export interface FeePayment {
  id: string;
  schoolId: string;
  academicSessionId: string;
  financialYear: string;
  studentId: string;
  idempotencyKey?: string;
  allocationFingerprint?: string;
  receiptId: string;
  receiptNumber: string;
  paymentDate: string; // YYYY-MM-DD
  grossAmount: number;
  discountAmount: number;
  lateFeeAmount: number;
  netPayable: number;
  amountReceived: number;
  allocatedAmount: number;
  advanceAmount: number; // Surplus credited to advance
  previousBalance: number;
  remainingBalance: number;
  paymentMode: PaymentMode;
  referenceNumber?: string;
  chequeDetails?: ChequeDetails;
  remarks?: string;
  status: 'COMPLETED' | 'CANCELLED';
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;
  collectedBy: string;
  collectedByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeePaymentItem {
  id: string;
  schoolId: string;
  paymentId: string;
  feePaymentId?: string;
  receiptId?: string;
  academicSessionId?: string;
  feeCategoryId?: string;
  feeStructureId?: string;
  feeAssignmentId?: string;
  feeItemId: string;
  studentId: string;
  allocatedAmount: number;
  discountApplied: number;
  lateFeeApplied: number;
  previousItemBalance: number;
  remainingItemBalance: number;
  createdAt: string;
}

export interface FeeAdvance {
  id: string;
  schoolId: string;
  studentId: string;
  paymentId: string;
  amount: number;
  utilizedAmount: number;
  remainingAmount: number;
  date: string;
  status: 'AVAILABLE' | 'PARTIALLY_UTILIZED' | 'EXHAUSTED' | 'REFUNDED';
  createdAt: string;
  updatedAt: string;
}

export interface ReceiptItem {
  feeItemId: string;
  feeType: string;
  period: string;
  amount: number;
  discount: number;
  lateFee: number;
  paid: number;
  remaining: number;
}

export interface Receipt {
  id: string;
  schoolId: string;
  academicSessionId: string;
  financialYear: string;
  receiptNumber: string;
  paymentId: string;
  paymentDate: string;
  receiptDate?: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  classId?: string;
  sectionId?: string;
  className: string;
  sectionName: string;
  parentName: string;
  parentPhone?: string;
  items: ReceiptItem[];
  grossAmount: number;
  discountAmount: number;
  lateFeeAmount: number;
  netPaid: number;
  advanceAmount: number;
  previousBalance: number;
  remainingBalance: number;
  paymentMode: PaymentMode;
  referenceNumber?: string;
  remarks?: string;
  status: 'ACTIVE' | 'CANCELLED';
  cancelledAt?: string;
  cancelledBy?: string;
  cancelledByName?: string;
  cancellationReason?: string;
  authorizedSignature?: string;
  createdAt: string;
  createdBy?: string;
  updatedAt: string;
}

export type ExpenseStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'PAID';

export const STANDARD_EXPENSE_CATEGORIES = [
  'Electricity',
  'Water',
  'Maintenance',
  'Stationery',
  'Salary',
  'Transport',
  'Fuel',
  'Repairs',
  'Events',
  'Office',
  'Other',
] as const;

export interface Expense {
  id: string;
  schoolId: string;
  financialYear: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  paymentMode: PaymentMode;
  referenceNumber?: string;
  vendorPayee: string;
  status: ExpenseStatus;
  submittedBy: string;
  submittedByName: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectionReason?: string;
  paidAt?: string;
  remarks?: string;
  attachmentUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseCategory {
  id: string;
  schoolId: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
}

export interface CashBookEntry {
  id: string;
  schoolId: string;
  financialYear: string;
  date: string;
  description: string;
  type: 'INCOME' | 'EXPENSE';
  referenceType: 'PAYMENT' | 'EXPENSE' | 'ADJUSTMENT';
  referenceId: string;
  receiptPaymentNumber: string;
  income: number;
  expense: number;
  runningBalance: number;
  paymentMode: string;
  createdAt: string;
}

export interface FinancialSettings {
  id: string;
  schoolId: string;
  academicSessionId?: string;
  financialYear: string; // e.g. "2026-27"
  receiptPrefix: string; // e.g. "SCH" or "2026-27/FEES"
  receiptStartingNumber: number; // e.g. 1
  currentReceiptCounter: number;
  receiptNumberPattern: string; // e.g. "{PREFIX}-{YEAR}-{NUM6}" or "{YEAR}/FEES/{NUM5}"
  currency: string; // "₹"
  currencyCode?: string;
  currencySymbol?: string;
  enabledPaymentMethods?: PaymentMode[];
  defaultPaymentMethod?: PaymentMode;
  allowPartialPayments: boolean;
  allowAdvancePayments: boolean;
  defaultLateFeeType: LateFeeType;
  defaultLateFeeAmount: number;
  defaultGracePeriodDays: number;
  notificationPreferences: {
    feeDueReminder: boolean;
    feeOverdueReminder: boolean;
    paymentConfirmation: boolean;
    receiptNotification: boolean;
  };
  termsAndConditions?: string;
  authorizedSignatoryName?: string;
  authorizedSignatoryTitle?: string;
  receiptShowSchoolAddress?: boolean;
  receiptShowParentDetails?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StudentFinancialSummary {
  totalAssigned: number;
  totalPaid: number;
  totalDiscount: number;
  totalConcession: number;
  totalLateFees: number;
  totalOutstanding: number;
  totalAdvance: number;
  currentBalance: number;
}
