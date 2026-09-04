"use client"

import { useEffect, useRef, useState } from "react"
import type { Message, Question, QuestionOption } from "@/domain/need-understanding/types"

export function ConversationPanel({
  messages,
  question,
  loading,
  error,
  completed,
  onAnswer,
  onSelectOptions,
  onRetry,
}: {
  messages: Message[]
  question: Question | null
  loading: boolean
  error: string | null
  completed: boolean
  onAnswer: (text: string) => void
  onSelectOptions: (options: QuestionOption[]) => void
  onRetry: () => void
}) {
  const [draft, setDraft] = useState("")
  const [selected, setSelected] = useState<QuestionOption[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => setSelected([]), [question?.topic, question?.prompt])
  useEffect(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), [messages, loading])

  const submitDraft = () => {
    if (!draft.trim() || loading || completed) return
    onAnswer(draft.trim())
    setDraft("")
  }

  const choose = (item: QuestionOption) => {
    if (!question || loading) return
    if (question.type === "single_select") {
      onSelectOptions([item])
      return
    }
    setSelected((current) =>
      current.some((selectedItem) => selectedItem.id === item.id)
        ? current.filter((selectedItem) => selectedItem.id !== item.id)
        : current.length >= 2
          ? current
          : [...current, item],
    )
  }

  return (
    <section className="conversation-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">CONVERSATION</p>
          <h2>一起把需求梳理清楚</h2>
        </div>
        <span className="round-counter">{messages.filter((message) => message.role === "assistant").length} / 5</span>
      </div>

      <div className="message-list" aria-live="polite">
        {messages.map((message) => (
          <article key={message.id} className={`message ${message.role}`}>
            <div className="message-avatar">{message.role === "assistant" ? "N" : "你"}</div>
            <div>
              <span className="message-author">{message.role === "assistant" ? "Need Lens" : "你的回答"}</span>
              <p>{message.content}</p>
            </div>
          </article>
        ))}

        {question && !loading && !completed ? (
          <div className="answer-area">
            {question.options.length ? (
              <div className="option-grid">
                {question.options.map((item) => {
                  const active = selected.some((selectedItem) => selectedItem.id === item.id)
                  return (
                    <button
                      key={item.id}
                      className={active ? "option-button selected" : "option-button"}
                      onClick={() => choose(item)}
                    >
                      <span>{active ? "✓" : "+"}</span>{item.label}
                    </button>
                  )
                })}
                <button className="option-button muted" onClick={() => onAnswer("我还不确定") }>
                  <span>?</span>我还不确定
                </button>
              </div>
            ) : null}
            {question.type === "multi_select" && selected.length ? (
              <button className="confirm-options" onClick={() => onSelectOptions(selected)}>
                确认选择（{selected.length}）
              </button>
            ) : null}
          </div>
        ) : null}

        {loading ? (
          <div className="thinking-row">
            <span /><span /><span />
            <em>正在更新需求理解</em>
          </div>
        ) : null}

        {error ? (
          <div className="error-banner">
            <span>{error}</span>
            <button onClick={onRetry}>重试</button>
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      <form
        className="message-composer"
        onSubmit={(event) => {
          event.preventDefault()
          submitDraft()
        }}
      >
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={completed ? "需求已确认" : "也可以直接输入你的回答…"}
          disabled={loading || completed}
        />
        <button disabled={!draft.trim() || loading || completed} aria-label="发送">
          ↑
        </button>
      </form>
    </section>
  )
}
