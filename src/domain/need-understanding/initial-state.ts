import type {
  NeedUnderstandingState,
  RoleAssignments,
  TrackedField,
} from "./types"

export const emptyTrackedField = <T>(): TrackedField<T> => ({
  value: null,
  status: "unknown",
  source: "model_hypothesis",
  updatedAtTurn: 0,
})

export const emptyRoles = (): RoleAssignments => ({
  initiatorIds: ["consumer"],
  buyerIds: [],
  payerIds: [],
  decisionMakerIds: [],
  recipientIds: [],
  userIds: [],
  coUserOrInfluencerIds: [],
})

export const createInitialState = (
  sessionId = globalThis.crypto.randomUUID(),
): NeedUnderstandingState => ({
  schemaVersion: 1,
  sessionId,
  phase: "outline",
  clarificationCount: 0,
  cognitionQuestionCount: 0,
  askedTopics: [],
  actors: [
    {
      id: "consumer",
      label: "你",
      relationshipToConsumer: "本人",
      identitySummary: null,
    },
  ],
  roles: emptyRoles(),
  purchaseGoal: emptyTrackedField<string>(),
  budget: emptyTrackedField(),
  needs: [],
  cognitionItems: [],
})
