export interface ProgressionStep {
  from: string
  to: string
  isTerminal?: boolean
  description?: string
}

export interface PromotionConfig {
  progressionLadder: ProgressionStep[]
  cutOffMonth: number // 1 - 12 (default: 7 = July)
  cutOffDay: number // 1 - 31 (default: 31)
  requireTeacherSignOff: boolean
  capacityGuardStrategy: 'STRICT_REJECT' | 'WAITLIST_IF_FULL' | 'AUTO_SECTION_BALANCE'
  financialPolicy: 'ROLLOVER_DUES' | 'STRICT_HOLD' | 'CONDITIONAL_PROMOTION'
  allowsSameLevelContinuation: boolean
  progressionMappingNote?: string
}

export const DEFAULT_PROMOTION_CONFIG: PromotionConfig = {
  progressionLadder: [
    { from: 'TODDLER', to: 'PLAYGROUP', isTerminal: false },
    { from: 'PLAYGROUP', to: 'NURSERY', isTerminal: false },
    { from: 'NURSERY', to: 'LKG', isTerminal: false },
    { from: 'LKG', to: 'UKG', isTerminal: false },
    { from: 'UKG', to: 'GRADUATED', isTerminal: true },
  ],
  cutOffMonth: 7,
  cutOffDay: 31,
  requireTeacherSignOff: true,
  capacityGuardStrategy: 'WAITLIST_IF_FULL',
  financialPolicy: 'ROLLOVER_DUES',
  allowsSameLevelContinuation: true,
  progressionMappingNote: 'Playgroup → Nursery → LKG → UKG → Graduated',
}

export interface CandidateEvaluation {
  studentId: string
  admissionNo: string
  name: string
  dob: string
  gender: string
  ageMonths: number
  ageDisplay: string
  currentClassroomId: string
  currentClassroomName: string
  currentProgramType: string
  proposedProgramType: string
  proposedClassroomId: string | null
  proposedClassroomName: string | null
  proposedClassroomCapacity: number | null
  proposedClassroomEnrolled: number | null
  ageEligibility: 'AGE_ELIGIBLE' | 'AGE_BELOW_RECOMMENDED' | 'AGE_ABOVE_RECOMMENDED' | 'AGE_WAIVER_REQUIRED'
  teacherSignOff: 'RECOMMENDED_FOR_PROMOTION' | 'RECOMMENDED_TO_CONTINUE' | 'REQUIRES_SPECIAL_REVIEW' | 'PENDING_SIGN_OFF'
  suggestedOutcome: 'PROMOTED' | 'CONTINUE_CURRENT_LEVEL' | 'SPECIAL_REVIEW' | 'GRADUATED'
  outstandingDuesCents: number
  hasOverdueBalance: boolean
  notes: string
}

export interface PromotionDecisionInput {
  studentId: string
  outcome: 'PROMOTED' | 'CONTINUE_CURRENT_LEVEL' | 'SPECIAL_REVIEW' | 'GRADUATED' | 'WITHDRAWN' | 'TRANSFERRED'
  targetClassroomId?: string
  notes?: string
  waiveAge?: boolean
  waiveFees?: boolean
}
