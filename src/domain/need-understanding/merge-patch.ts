import type {
  CardEdit,
  CognitionOperation,
  ModelStatePatch,
  NeedOperation,
  NeedUnderstandingState,
  RoleAssignments,
  TrackedField,
} from "./types"

const sourceRank = {
  model_hypothesis: 1,
  consumer_assumption: 2,
  user_explicit: 3,
} as const

const mergeTrackedField = <T>(
  current: TrackedField<T>,
  incoming: TrackedField<T> | null,
): TrackedField<T> => {
  if (!incoming || incoming.value === null) return current
  if (
    current.status === "confirmed" &&
    incoming.status !== "confirmed" &&
    sourceRank[incoming.source] <= sourceRank[current.source]
  ) {
    return current
  }
  return incoming
}

const applyNeedOperations = (
  state: NeedUnderstandingState,
  operations: NeedOperation[],
) => {
  const items = new Map(state.needs.map((item) => [item.id, item]))
  for (const operation of operations) {
    if (operation.operation === "delete") {
      items.delete(operation.id)
      continue
    }
    const existing = items.get(operation.item.id)
    if (
      existing?.status === "confirmed" &&
      operation.item.status !== "confirmed" &&
      sourceRank[operation.item.source] <= sourceRank[existing.source]
    ) {
      continue
    }
    items.set(operation.item.id, operation.item)
  }
  return [...items.values()]
}

const applyCognitionOperations = (
  state: NeedUnderstandingState,
  operations: CognitionOperation[],
) => {
  const items = new Map(state.cognitionItems.map((item) => [item.id, item]))
  for (const operation of operations) {
    if (operation.operation === "delete") items.delete(operation.id)
    else items.set(operation.item.id, operation.item)
  }
  return [...items.values()]
}

const sanitizeRoles = (
  roles: RoleAssignments,
  validActorIds: Set<string>,
): RoleAssignments =>
  Object.fromEntries(
    Object.entries(roles).map(([key, ids]) => [
      key,
      [...new Set(ids)].filter((id) => validActorIds.has(id)),
    ]),
  ) as RoleAssignments

export const mergeModelPatch = (
  state: NeedUnderstandingState,
  patch: ModelStatePatch,
): NeedUnderstandingState => {
  const actors = new Map(state.actors.map((actor) => [actor.id, actor]))
  for (const actor of patch.actorUpserts) actors.set(actor.id, actor)
  const actorList = [...actors.values()]
  const roles = sanitizeRoles(
    { ...state.roles, ...patch.roleAssignments },
    new Set(actorList.map((actor) => actor.id)),
  )

  return {
    ...state,
    actors: actorList,
    roles,
    purchaseGoal: mergeTrackedField(state.purchaseGoal, patch.purchaseGoal),
    budget: mergeTrackedField(state.budget, patch.budget),
    needs: applyNeedOperations(state, patch.needOperations),
    cognitionItems: applyCognitionOperations(state, patch.cognitionOperations),
  }
}

export const applyCardEdits = (
  state: NeedUnderstandingState,
  edits: CardEdit[],
): NeedUnderstandingState => {
  let next = structuredClone(state)
  const turn = state.clarificationCount

  for (const edit of edits) {
    if (edit.type === "purchase_goal") {
      next.purchaseGoal = edit.value.trim()
        ? {
            value: edit.value.trim(),
            status: "confirmed",
            source: "user_explicit",
            updatedAtTurn: turn,
          }
        : {
            value: null,
            status: "unknown",
            source: "user_explicit",
            updatedAtTurn: turn,
          }
    } else if (edit.type === "budget_preferred") {
      next.budget = {
        value:
          edit.value === null
            ? null
            : {
                currency: "CNY",
                min: null,
                preferred: edit.value,
                max: edit.value,
                flexibility: "unknown",
                attitude: null,
              },
        status: edit.value === null ? "unknown" : "confirmed",
        source: "user_explicit",
        updatedAtTurn: turn,
      }
    } else if (edit.type === "actor") {
      next.actors = next.actors.map((actor) =>
        actor.id === edit.actorId
          ? {
              ...actor,
              label: edit.label,
              relationshipToConsumer: edit.relationshipToConsumer,
              identitySummary: edit.identitySummary,
            }
          : actor,
      )
    } else if (edit.type === "role") {
      next.roles = sanitizeRoles(
        { ...next.roles, [edit.role]: edit.actorIds },
        new Set(next.actors.map((actor) => actor.id)),
      )
    } else if (edit.type === "need_upsert") {
      next.needs = applyNeedOperations(next, [
        {
          operation: "upsert",
          item: {
            ...edit.item,
            status: "confirmed",
            source: "user_explicit",
            updatedAtTurn: turn,
          },
        },
      ])
    } else if (edit.type === "need_delete") {
      next.needs = next.needs.filter((item) => item.id !== edit.id)
    } else if (edit.type === "cognition_delete") {
      next.cognitionItems = next.cognitionItems.filter((item) => item.id !== edit.id)
    }
  }

  return next
}
