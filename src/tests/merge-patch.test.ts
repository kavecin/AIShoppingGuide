import { describe, expect, it } from "vitest"
import { createInitialState } from "@/domain/need-understanding/initial-state"
import {
  applyCardEdits,
  mergeModelPatch,
} from "@/domain/need-understanding/merge-patch"
import type { ModelStatePatch } from "@/domain/need-understanding/types"

const emptyPatch = (): ModelStatePatch => ({
  actorUpserts: [],
  roleAssignments: {},
  purchaseGoal: null,
  budget: null,
  needOperations: [],
  cognitionOperations: [],
})

describe("mergeModelPatch", () => {
  it("keeps confirmed explicit information when a weaker hypothesis conflicts", () => {
    const state = createInitialState("merge-test")
    state.purchaseGoal = {
      value: "给爸爸准备退休礼物",
      status: "confirmed",
      source: "user_explicit",
      updatedAtTurn: 1,
    }
    const patch = emptyPatch()
    patch.purchaseGoal = {
      value: "可能是给朋友的礼物",
      status: "tentative",
      source: "model_hypothesis",
      updatedAtTurn: 2,
    }

    const result = mergeModelPatch(state, patch)

    expect(result.purchaseGoal.value).toBe("给爸爸准备退休礼物")
  })

  it("drops role assignments that reference unknown actors", () => {
    const state = createInitialState("role-test")
    const patch = emptyPatch()
    patch.roleAssignments = {
      userIds: ["missing", "consumer", "consumer"],
    }

    const result = mergeModelPatch(state, patch)

    expect(result.roles.userIds).toEqual(["consumer"])
  })
})

describe("applyCardEdits", () => {
  it("treats card edits as confirmed user input", () => {
    const state = createInitialState("edit-test")

    const result = applyCardEdits(state, [
      { type: "purchase_goal", value: "  改善居家办公体验  " },
      { type: "budget_preferred", value: 1800 },
    ])

    expect(result.purchaseGoal).toMatchObject({
      value: "改善居家办公体验",
      status: "confirmed",
      source: "user_explicit",
    })
    expect(result.budget.value?.preferred).toBe(1800)
  })
})
