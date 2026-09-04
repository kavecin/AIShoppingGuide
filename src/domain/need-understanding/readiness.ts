import type { NeedUnderstandingState, QuestionTopic } from "./types"

const cognitionTopics = new Set<QuestionTopic>([
  "target_behavior",
  "prior_experience",
  "capability_fit",
  "co_user_context",
])

export const isCognitionTopic = (topic: QuestionTopic) => cognitionTopics.has(topic)

export const isOutlineReady = (state: NeedUnderstandingState) => {
  const targetIds = new Set([
    ...state.roles.recipientIds,
    ...state.roles.userIds,
  ])
  const hasTarget = targetIds.size > 0
  const hasRelationship = state.actors.some(
    (actor) => targetIds.has(actor.id) && actor.relationshipToConsumer.length > 0,
  )
  const hasPurchaseAuthority =
    state.roles.buyerIds.length > 0 || state.roles.decisionMakerIds.length > 0

  return hasTarget && hasRelationship && hasPurchaseAuthority
}

export const isDirectNeedsReady = (state: NeedUnderstandingState) => {
  const hasUsageContext = state.needs.some(
    (need) => need.dimension === "usage_context" && need.status !== "unknown",
  )
  const hasDecisionAnchor = state.needs.some(
    (need) =>
      ["hard_constraint", "exclusion", "desired_outcome"].includes(need.dimension) ||
      need.priority === "must" ||
      need.priority === "important",
  )
  const hasPricePosition =
    state.budget.value !== null ||
    state.needs.some((need) => need.dimension === "budget_value")

  return (
    state.purchaseGoal.value !== null &&
    hasPricePosition &&
    hasUsageContext &&
    hasDecisionAnchor
  )
}

export const unresolvedHighImpactCognition = (state: NeedUnderstandingState) =>
  state.cognitionItems.filter(
    (item) => item.impactLevel === "high" && !item.resolved,
  )

export const canReviewCard = (state: NeedUnderstandingState) =>
  isOutlineReady(state) && isDirectNeedsReady(state)

export const mustReviewCard = (state: NeedUnderstandingState) =>
  state.clarificationCount >= 5 ||
  (canReviewCard(state) &&
    state.cognitionQuestionCount > 0 &&
    unresolvedHighImpactCognition(state).length === 0)
