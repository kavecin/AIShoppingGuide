export const conversationPhases = [
  "outline",
  "direct_needs",
  "cognition_gap",
  "card_review",
  "complete",
] as const

export type ConversationPhase = (typeof conversationPhases)[number]

export const reviewStatuses = ["confirmed", "tentative", "unknown"] as const
export type ReviewStatus = (typeof reviewStatuses)[number]

export const informationSources = [
  "user_explicit",
  "consumer_assumption",
  "model_hypothesis",
] as const
export type InformationSource = (typeof informationSources)[number]

export const needDimensions = [
  "desired_outcome",
  "budget_value",
  "usage_context",
  "hard_constraint",
  "function_performance",
  "style_feeling",
  "usage_cost",
  "quality_lifespan",
  "risk_trust",
  "relationship_expression",
  "time_limit",
  "exclusion",
] as const
export type NeedDimension = (typeof needDimensions)[number]

export const questionTopics = [
  "target_identity",
  "relationship",
  "role_assignment",
  "desired_outcome",
  "budget",
  "usage_context",
  "hard_constraint",
  "preference",
  "priority_tradeoff",
  "exclusion",
  "relationship_expression",
  "target_behavior",
  "prior_experience",
  "capability_fit",
  "co_user_context",
] as const
export type QuestionTopic = (typeof questionTopics)[number]

export const roleKeys = [
  "initiatorIds",
  "buyerIds",
  "payerIds",
  "decisionMakerIds",
  "recipientIds",
  "userIds",
  "coUserOrInfluencerIds",
] as const
export type RoleKey = (typeof roleKeys)[number]

export type TrackedField<T> = {
  value: T | null
  status: ReviewStatus
  source: InformationSource
  updatedAtTurn: number
}

export type Actor = {
  id: string
  label: string
  relationshipToConsumer: string
  identitySummary: string | null
}

export type RoleAssignments = Record<RoleKey, string[]>

export type Budget = {
  currency: "CNY"
  min: number | null
  preferred: number | null
  max: number | null
  flexibility: "fixed" | "slightly_flexible" | "flexible" | "unknown"
  attitude: string | null
}

export type NeedItem = {
  id: string
  dimension: NeedDimension
  statement: string
  priority: "must" | "important" | "optional" | "unranked"
  status: ReviewStatus
  source: InformationSource
  updatedAtTurn: number
}

export type CognitionItem = {
  id: string
  statement: string
  kind: "confirmed_information" | "consumer_assumption" | "unknown"
  impactAreas: NeedDimension[]
  impactLevel: "high" | "medium" | "low"
  resolved: boolean
  updatedAtTurn: number
}

export type NeedUnderstandingState = {
  schemaVersion: 1
  sessionId: string
  phase: ConversationPhase
  clarificationCount: number
  cognitionQuestionCount: number
  askedTopics: QuestionTopic[]
  actors: Actor[]
  roles: RoleAssignments
  purchaseGoal: TrackedField<string>
  budget: TrackedField<Budget>
  needs: NeedItem[]
  cognitionItems: CognitionItem[]
}

export type Message = {
  id: string
  role: "user" | "assistant"
  content: string
}

export type QuestionOption = {
  id: string
  label: string
}

export type Question = {
  topic: QuestionTopic
  type: "single_select" | "multi_select" | "free_text"
  prompt: string
  options: QuestionOption[]
}

export type CardEdit =
  | { type: "purchase_goal"; value: string }
  | { type: "budget_preferred"; value: number | null }
  | {
      type: "actor"
      actorId: string
      label: string
      relationshipToConsumer: string
      identitySummary: string | null
    }
  | { type: "role"; role: RoleKey; actorIds: string[] }
  | { type: "need_upsert"; item: NeedItem }
  | { type: "need_delete"; id: string }
  | { type: "cognition_delete"; id: string }

export type ConversationEvent =
  | { type: "initial_message"; text: string }
  | { type: "answer"; text: string }
  | {
      type: "select_options"
      options: QuestionOption[]
      otherText?: string
    }
  | { type: "edit_card"; edits: CardEdit[] }
  | { type: "continue_clarification" }
  | { type: "confirm_card" }

export type ActorPatch = Actor

export type NeedOperation =
  | { operation: "upsert"; item: NeedItem }
  | { operation: "delete"; id: string }

export type CognitionOperation =
  | { operation: "upsert"; item: CognitionItem }
  | { operation: "delete"; id: string }

export type ModelStatePatch = {
  actorUpserts: ActorPatch[]
  roleAssignments: Partial<RoleAssignments>
  purchaseGoal: TrackedField<string> | null
  budget: TrackedField<Budget> | null
  needOperations: NeedOperation[]
  cognitionOperations: CognitionOperation[]
}

export type QuestionCandidate = {
  topic: QuestionTopic
  question: string
  type: "single_select" | "multi_select" | "free_text"
  options: QuestionOption[]
  impactAreas: NeedDimension[]
  impact: 1 | 2 | 3
  uncertainty: 1 | 2 | 3
  answerability: 1 | 2 | 3
  effort: 1 | 2 | 3
}

export type ModelTurnInput = {
  state: NeedUnderstandingState
  recentMessages: Message[]
  event: ConversationEvent
}

export type ModelTurnResult = {
  statePatch: ModelStatePatch
  assistantMessage: string
  nextAction: "ask" | "review"
  questionCandidates: QuestionCandidate[]
}

export type PublicNeedCard = {
  purchasePurpose: {
    goal: string | null
    scenario: string | null
  }
  target: {
    actorId: string | null
    label: string | null
    identity: string | null
    relationship: string | null
    roleSummary: string | null
  }
  confirmedNeeds: Array<{
    id: string
    label: string
    value: string
  }>
  pendingQuestions: Array<{
    id: string
    text: string
  }>
}

export type ConversationTurnRequest = {
  state: NeedUnderstandingState
  recentMessages: Message[]
  event: ConversationEvent
}

export type ConversationTurnResponse = {
  state: NeedUnderstandingState
  assistantMessage: string
  nextAction: "ask" | "review" | "complete"
  question: Question | null
  publicCard: PublicNeedCard
  canConfirm: boolean
  provider: "mock" | "openai"
}
