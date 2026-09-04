import type { NeedUnderstandingModel } from "./adapter"
import { MockModelProvider } from "./mock-provider"
import { OpenAIModelProvider } from "./openai-provider"

export const createModelProvider = (): NeedUnderstandingModel => {
  if (process.env.MODEL_PROVIDER !== "openai") return new MockModelProvider()

  const apiKey = process.env.OPENAI_API_KEY
  const model = process.env.OPENAI_MODEL
  if (!apiKey || !model) {
    throw new Error(
      "MODEL_PROVIDER=openai 时必须配置 OPENAI_API_KEY 和 OPENAI_MODEL。",
    )
  }

  return new OpenAIModelProvider(apiKey, model)
}
