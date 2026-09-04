import type {
  NeedDimension,
  NeedUnderstandingState,
  PublicNeedCard,
  RoleKey,
} from "./types"

const dimensionLabels: Record<NeedDimension, string> = {
  desired_outcome: "希望结果",
  budget_value: "预算与价值",
  usage_context: "使用情境",
  hard_constraint: "硬性限制",
  function_performance: "功能与性能",
  style_feeling: "风格与感受",
  usage_cost: "使用成本",
  quality_lifespan: "品质与寿命",
  risk_trust: "风险与信任",
  relationship_expression: "关系表达",
  time_limit: "时间限制",
  exclusion: "排除项",
}

const roleLabels: Record<RoleKey, string> = {
  initiatorIds: "发起",
  buyerIds: "购买",
  payerIds: "付款",
  decisionMakerIds: "决定",
  recipientIds: "接收",
  userIds: "使用",
  coUserOrInfluencerIds: "共同使用或影响",
}

const budgetText = (state: NeedUnderstandingState) => {
  const budget = state.budget.value
  if (!budget) return null
  if (budget.preferred !== null) return `预算约 ¥${budget.preferred.toLocaleString("zh-CN")}`
  if (budget.max !== null) return `预算不超过 ¥${budget.max.toLocaleString("zh-CN")}`
  return budget.attitude
}

export const toPublicNeedCard = (
  state: NeedUnderstandingState,
): PublicNeedCard => {
  const targetId =
    state.roles.recipientIds.find((id) => id !== "consumer") ??
    state.roles.userIds.find((id) => id !== "consumer") ??
    state.roles.userIds[0] ??
    null
  const target = state.actors.find((actor) => actor.id === targetId) ?? null
  const actorLabels = new Map(state.actors.map((actor) => [actor.id, actor.label]))
  const roleParts = Object.entries(state.roles)
    .filter(([, ids]) => ids.length > 0)
    .map(([key, ids]) => {
      const people = ids.map((id) => actorLabels.get(id) ?? id).join("、")
      return `${people}${roleLabels[key as RoleKey]}`
    })

  const usageScenario = state.needs.find(
    (need) => need.dimension === "usage_context" && need.status === "confirmed",
  )
  const confirmedNeeds = state.needs
    .filter((need) => need.status === "confirmed")
    .map((need) => ({
      id: need.id,
      label: dimensionLabels[need.dimension],
      value: need.statement,
    }))
  const budget = budgetText(state)
  if (budget) {
    confirmedNeeds.unshift({ id: "budget", label: "预算", value: budget })
  }

  const tentativeNeeds = state.needs
    .filter((need) => need.status === "tentative")
    .map((need) => ({ id: need.id, text: need.statement }))
  const cognitionQuestions = state.cognitionItems
    .filter((item) => !item.resolved && item.impactLevel === "high")
    .map((item) => ({ id: item.id, text: item.statement }))

  return {
    purchasePurpose: {
      goal: state.purchaseGoal.value,
      scenario: usageScenario?.statement ?? null,
    },
    target: {
      actorId: target?.id ?? null,
      label: target?.label ?? null,
      identity: target?.identitySummary ?? null,
      relationship: target?.relationshipToConsumer ?? null,
      roleSummary: roleParts.length > 0 ? roleParts.join("；") : null,
    },
    confirmedNeeds,
    pendingQuestions: [...tentativeNeeds, ...cognitionQuestions],
  }
}
