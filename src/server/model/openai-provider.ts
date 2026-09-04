import OpenAI from "openai"
import { zodTextFormat } from "openai/helpers/zod"
import { modelTurnResultSchema } from "@/domain/need-understanding/schemas"
import type { ModelTurnInput, ModelTurnResult } from "@/domain/need-understanding/types"
import type { NeedUnderstandingModel } from "./adapter"
import {
  buildModelInput,
  NEED_UNDERSTANDING_INSTRUCTIONS,
} from "./prompt"

export class OpenAIModelProvider implements NeedUnderstandingModel {
  readonly providerName = "openai" as const
  private readonly client: OpenAI
  private readonly model: string

  constructor(apiKey: string, model: string) {
    this.client = new OpenAI({ apiKey })
    this.model = model
  }

  async analyzeTurn(input: ModelTurnInput): Promise<ModelTurnResult> {
    const response = await this.client.responses.parse({
      model: this.model,
      instructions: NEED_UNDERSTANDING_INSTRUCTIONS,
      input: buildModelInput(input),
      text: {
        format: zodTextFormat(modelTurnResultSchema, "need_understanding_turn"),
      },
      store: false,
    })

    if (!response.output_parsed) {
      throw new Error("模型没有返回可解析的结构化结果。")
    }

    return modelTurnResultSchema.parse(response.output_parsed)
  }
}
