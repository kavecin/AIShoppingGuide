import type { ModelTurnInput } from "@/domain/need-understanding/types"

export const NEED_UNDERSTANDING_PROMPT_VERSION = "need-understanding-v1"

export const NEED_UNDERSTANDING_INSTRUCTIONS = `
你是 AI Shopping Guide 的需求理解模块。你的唯一任务是从消费者的模糊购物表达中更新结构化需求，并提出最多三个下一问题候选。

必须遵守：
1. 不推荐商品、品牌、品类方案、价格或购买链接。
2. 每个问题只处理一个主题，并保持简短。
3. 不重复 askedTopics 中的主题。
4. 不根据年龄、性别、职业或家庭角色直接推断偏好。
5. 消费者对目标者的判断默认是 consumer_assumption，除非有明确行为或目标者直接表达。
6. 候选直接需求来自有限需求维度，每个问题必须说明 impactAreas。
7. 认知补全优先询问行为、过去事件、能力和排除项。
8. 没有高价值问题或信息已足够时，nextAction 返回 review。
9. 只返回结构化结果，不输出分析过程。
`.trim()

export const buildModelInput = (input: ModelTurnInput) =>
  JSON.stringify(
    {
      promptVersion: NEED_UNDERSTANDING_PROMPT_VERSION,
      state: input.state,
      recentMessages: input.recentMessages.slice(-10),
      event: input.event,
      remainingClarifications: Math.max(0, 5 - input.state.clarificationCount),
    },
    null,
    2,
  )
