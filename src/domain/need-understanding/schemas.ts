import { z } from "zod"
import {
  conversationPhases,
  informationSources,
  needDimensions,
  questionTopics,
  reviewStatuses,
  roleKeys,
} from "./types"

const reviewStatusSchema = z.enum(reviewStatuses)
const informationSourceSchema = z.enum(informationSources)
const needDimensionSchema = z.enum(needDimensions)
const questionTopicSchema = z.enum(questionTopics)
const roleKeySchema = z.enum(roleKeys)

export const actorSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(40),
  relationshipToConsumer: z.string().max(80),
  identitySummary: z.string().max(160).nullable(),
})

export const budgetSchema = z.object({
  currency: z.literal("CNY"),
  min: z.number().nonnegative().nullable(),
  preferred: z.number().nonnegative().nullable(),
  max: z.number().nonnegative().nullable(),
  flexibility: z.enum(["fixed", "slightly_flexible", "flexible", "unknown"]),
  attitude: z.string().max(160).nullable(),
})

const trackedField = <T extends z.ZodType>(value: T) =>
  z.object({
    value: value.nullable(),
    status: reviewStatusSchema,
    source: informationSourceSchema,
    updatedAtTurn: z.number().int().nonnegative(),
  })

export const needItemSchema = z.object({
  id: z.string().min(1),
  dimension: needDimensionSchema,
  statement: z.string().min(1).max(240),
  priority: z.enum(["must", "important", "optional", "unranked"]),
  status: reviewStatusSchema,
  source: informationSourceSchema,
  updatedAtTurn: z.number().int().nonnegative(),
})

export const cognitionItemSchema = z.object({
  id: z.string().min(1),
  statement: z.string().min(1).max(240),
  kind: z.enum(["confirmed_information", "consumer_assumption", "unknown"]),
  impactAreas: z.array(needDimensionSchema).max(4),
  impactLevel: z.enum(["high", "medium", "low"]),
  resolved: z.boolean(),
  updatedAtTurn: z.number().int().nonnegative(),
})

export const roleAssignmentsSchema = z.object({
  initiatorIds: z.array(z.string()),
  buyerIds: z.array(z.string()),
  payerIds: z.array(z.string()),
  decisionMakerIds: z.array(z.string()),
  recipientIds: z.array(z.string()),
  userIds: z.array(z.string()),
  coUserOrInfluencerIds: z.array(z.string()),
})

export const needUnderstandingStateSchema = z.object({
  schemaVersion: z.literal(1),
  sessionId: z.string().min(1),
  phase: z.enum(conversationPhases),
  clarificationCount: z.number().int().min(0).max(20),
  cognitionQuestionCount: z.number().int().min(0).max(5),
  askedTopics: z.array(questionTopicSchema),
  actors: z.array(actorSchema).min(1).max(12),
  roles: roleAssignmentsSchema,
  purchaseGoal: trackedField(z.string().min(1).max(300)),
  budget: trackedField(budgetSchema),
  needs: z.array(needItemSchema).max(40),
  cognitionItems: z.array(cognitionItemSchema).max(20),
})

export const questionOptionSchema = z.object({
  id: z.string().min(1).max(80),
  label: z.string().min(1).max(80),
})

export const questionCandidateSchema = z.object({
  topic: questionTopicSchema,
  question: z.string().min(1).max(180),
  type: z.enum(["single_select", "multi_select", "free_text"]),
  options: z.array(questionOptionSchema).max(4),
  impactAreas: z.array(needDimensionSchema).max(4),
  impact: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  uncertainty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  answerability: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  effort: z.union([z.literal(1), z.literal(2), z.literal(3)]),
})

const needOperationSchema = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("upsert"), item: needItemSchema }),
  z.object({ operation: z.literal("delete"), id: z.string().min(1) }),
])

const cognitionOperationSchema = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("upsert"), item: cognitionItemSchema }),
  z.object({ operation: z.literal("delete"), id: z.string().min(1) }),
])

export const modelTurnResultSchema = z.object({
  statePatch: z.object({
    actorUpserts: z.array(actorSchema).max(6),
    roleAssignments: roleAssignmentsSchema.partial(),
    purchaseGoal: trackedField(z.string().min(1).max(300)).nullable(),
    budget: trackedField(budgetSchema).nullable(),
    needOperations: z.array(needOperationSchema).max(12),
    cognitionOperations: z.array(cognitionOperationSchema).max(8),
  }),
  assistantMessage: z.string().min(1).max(240),
  nextAction: z.enum(["ask", "review"]),
  questionCandidates: z.array(questionCandidateSchema).max(3),
})

const cardEditSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("purchase_goal"), value: z.string().max(300) }),
  z.object({ type: z.literal("budget_preferred"), value: z.number().nonnegative().nullable() }),
  z.object({
    type: z.literal("actor"),
    actorId: z.string(),
    label: z.string().min(1).max(40),
    relationshipToConsumer: z.string().max(80),
    identitySummary: z.string().max(160).nullable(),
  }),
  z.object({
    type: z.literal("role"),
    role: roleKeySchema,
    actorIds: z.array(z.string()).max(12),
  }),
  z.object({ type: z.literal("need_upsert"), item: needItemSchema }),
  z.object({ type: z.literal("need_delete"), id: z.string() }),
  z.object({ type: z.literal("cognition_delete"), id: z.string() }),
])

export const conversationEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("initial_message"), text: z.string().min(1).max(2000) }),
  z.object({ type: z.literal("answer"), text: z.string().min(1).max(2000) }),
  z.object({
    type: z.literal("select_options"),
    options: z.array(questionOptionSchema).min(1).max(4),
    otherText: z.string().max(500).optional(),
  }),
  z.object({ type: z.literal("edit_card"), edits: z.array(cardEditSchema).min(1).max(30) }),
  z.object({ type: z.literal("continue_clarification") }),
  z.object({ type: z.literal("confirm_card") }),
])

export const messageSchema = z.object({
  id: z.string().min(1),
  role: z.enum(["user", "assistant"]),
  content: z.string().max(4000),
})

export const conversationTurnRequestSchema = z.object({
  state: needUnderstandingStateSchema,
  recentMessages: z.array(messageSchema).max(16),
  event: conversationEventSchema,
})
