/** Mirrors backend JSON (camelCase). */

export type AuthStatus = {
  hasAccount: boolean;
  authenticated: boolean;
};

export type Clinic = {
  id: number;
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  logoPath?: string | null;
  letterHeader?: string | null;
  letterFooter?: string | null;
  signatureBlock?: string | null;
  surgeonName?: string | null;
  /** Clinic/surgeon registration (e.g. GDC) — PRD clinic field */
  registrationNumber?: string | null;
  brandColor?: string | null;
  isActive: boolean;
};

export type ClinicFeeItem = {
  id: number;
  clinicId: number;
  itemName: string;
  category: string;
  priceCents: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type DoctorProfile = {
  name: string;
  title?: string | null;
  registrationNumber?: string | null;
  signatureBlock?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  defaultClinicId?: number | null;
  backupLocation?: string | null;
  exportLocation?: string | null;
  theme?: string | null;
  autoLockMinutes?: number | null;
};

export type Patient = {
  id: number;
  clinicId: number;
  firstName: string;
  lastName: string;
  gender?: string | null;
  dateOfBirth?: string | null;
  phone?: string | null;
  email?: string | null;
  caseStatus: string;
  isArchived: boolean;
  notes?: string | null;
  referralSource?: string | null;
  referringDoctor?: string | null;
  referringPractice?: string | null;
  dateFirstSeen?: string | null;
  address?: string | null;
  emergencyContact?: string | null;
  clinicRecordNumber?: string | null;
  cbctObtained: boolean;
  cbctReported: boolean;
  failureNotes?: string | null;
  treatmentPlanCreated: boolean;
  treatmentPlanSent: boolean;
  consentObtained: boolean;
  implantSystem?: string | null;
  implantJourneyNotes?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type DashboardClinicRow = {
  clinicId: number;
  clinicName: string;
  count: number;
};

export type DashboardRecentPatient = {
  id: number;
  firstName: string;
  lastName: string;
  clinicId: number;
  clinicName: string;
};

export type DashboardRecentLetter = {
  id: number;
  title: string;
  letterType: string;
  updatedAt: string;
  patientId: number;
  patientFirstName: string;
  patientLastName: string;
};

export type DashboardStats = {
  totalPatients: number;
  activeCases: number;
  completedCases: number;
  pendingCbct: number;
  failedCases: number;
  surgeryScheduled: number;
  surgeryCompleted: number;
  restorationPhase: number;
  onHold: number;
  followUpsDue: number;
  totalImplants: number;
  complications: number;
  patientsPerClinic?: DashboardClinicRow[];
  implantsPerClinic?: DashboardClinicRow[];
  complicationsPerClinic?: DashboardClinicRow[];
  recentPatients: DashboardRecentPatient[];
  recentLetters: DashboardRecentLetter[];
};

export type LetterTemplate = {
  id: number;
  name: string;
  letterType: string;
  body: string;
};

export type Letter = {
  id: number;
  patientId: number;
  clinicId: number;
  templateId?: number | null;
  letterType: string;
  title: string;
  body: string;
  pdfPath?: string | null;
  assessmentId?: number | null;
  createdAt: string;
  updatedAt: string;
};

export type PatientFile = {
  id: number;
  patientId: number;
  clinicId: number;
  originalName: string;
  storedName: string;
  localPath: string;
  category: string;
  mimeType?: string | null;
  fileSize: number;
  notes?: string | null;
  includeInLetter: boolean;
  assessmentId?: number | null;
  createdAt: string;
};

export type LogbookEntry = {
  id: number;
  patientId: number;
  clinicId: number;
  clinicRecordNumber?: string | null;
  surgeryDate: string;
  implantSite?: string | null;
  implantSystem?: string | null;
  implantDimensions?: string | null;
  implantCount: number;
  boneGraft: boolean;
  sinusLift: boolean;
  immediatePlacement: boolean;
  immediateLoading: boolean;
  surgeonName?: string | null;
  restorationType?: string | null;
  complicationStatus: boolean;
  complicationType?: string | null;
  outcome?: string | null;
  followUpDate?: string | null;
  notes?: string | null;
  sacClassification?: string | null;
  cbctStatus?: string | null;
  boneSiteClassification?: string | null;
  protocolMatrix?: string | null;
  implantMake?: string | null;
  implantType?: string | null;
  implantLotNumber?: string | null;
  graftSite?: string | null;
  graftType?: string | null;
  graftMaterial?: string | null;
  graftLotNumber?: string | null;
  graftTiming?: string | null;
  membraneType?: string | null;
  membraneLotNumber?: string | null;
  periodontalPreOpJson?: string | null;
  complicationClassification?: string | null;
  implantFailure: boolean;
  graftFailure: boolean;
  implantStatusRemedial?: string | null;
  supervisor?: string | null;
  mentorNotes?: string | null;
  restoringDentist?: string | null;
  labName?: string | null;
  restorationDate?: string | null;
  chosenProtocol?: string | null;
  optionsAvailable?: string | null;
  itemisedPlanNotes?: string | null;
  componentOrderNotes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LogbookFilters = {
  clinicId?: number | null;
  patientId?: number | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  cbctStatus?: string | null;
  sacClassification?: string | null;
  implantFailureOnly?: boolean | null;
};

export type TreatmentPlan = {
  id: number;
  patientId: number;
  clinicId: number;
  assessmentId?: number | null;
  treatmentObjective?: string | null;
  proposedImplantSites?: string | null;
  extractionRequired: boolean;
  boneGraftRequired: boolean;
  sinusLiftRequired: boolean;
  softTissueGraftRequired: boolean;
  guidedSurgeryRequired: boolean;
  temporaryRestorationRequired: boolean;
  finalRestorationType?: string | null;
  estimatedVisits?: number | null;
  estimatedTimeline?: string | null;
  costEstimate?: string | null;
  alternativeOptions?: string | null;
  risksLimitations?: string | null;
  notes?: string | null;
  lineItemsJson?: string | null;
  createdAt: string;
  updatedAt: string;
};
