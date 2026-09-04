import type {
  NeedUnderstandingState,
  PublicNeedCard,
} from "@/domain/need-understanding/types"
import type { ReactNode } from "react"

export function NeedCard({
  card,
  state,
  canConfirm,
  onEdit,
  onConfirm,
  onContinue,
}: {
  card: PublicNeedCard
  state: NeedUnderstandingState
  canConfirm: boolean
  onEdit: () => void
  onConfirm: () => void
  onContinue: () => void
}) {
  const hasContent = Boolean(
    card.purchasePurpose.goal || card.target.label || card.confirmedNeeds.length,
  )
  const complete = state.phase === "complete"

  return (
    <aside className="need-card-panel">
      <div className="card-heading">
        <div>
          <p className="eyebrow">NEED CARD</p>
          <h2>需求卡片</h2>
        </div>
        <button className="edit-button" onClick={onEdit} disabled={!hasContent || complete}>
          编辑
        </button>
      </div>

      {!hasContent ? (
        <div className="card-empty">
          <span>01</span>
          <p>回答左侧的问题后，需求会逐步出现在这里。</p>
        </div>
      ) : (
        <div className="card-content">
          <CardSection number="01" title="这次想解决什么">
            <p className="card-primary">{card.purchasePurpose.goal ?? "待补充"}</p>
            {card.purchasePurpose.scenario ? <p>{card.purchasePurpose.scenario}</p> : null}
          </CardSection>

          <CardSection number="02" title="为谁购买">
            <p className="card-primary">
              {[card.target.label, card.target.identity].filter(Boolean).join(" · ") || "待补充"}
            </p>
            {card.target.relationship ? <p>与你的关系：{card.target.relationship}</p> : null}
            {card.target.roleSummary ? <p>{card.target.roleSummary}</p> : null}
          </CardSection>

          <CardSection number="03" title="已经明确的需求">
            {card.confirmedNeeds.length ? (
              <ul className="need-list">
                {card.confirmedNeeds.map((need) => (
                  <li key={need.id}>
                    <span>{need.label}</span>
                    <p>{need.value}</p>
                  </li>
                ))}
              </ul>
            ) : <p className="muted-copy">正在梳理关键需求…</p>}
          </CardSection>

          <CardSection number="04" title="还需要确认">
            {card.pendingQuestions.length ? (
              <ul className="pending-list">
                {card.pendingQuestions.map((item) => <li key={item.id}>{item.text}</li>)}
              </ul>
            ) : <p className="complete-copy">当前没有高影响待确认项</p>}
          </CardSection>
        </div>
      )}

      {hasContent ? (
        <div className="card-actions">
          {complete ? (
            <div className="completed-state"><span>✓</span>需求已确认</div>
          ) : state.phase === "card_review" ? (
            <>
              <button className="primary-button wide" onClick={onConfirm} disabled={!canConfirm}>
                确认这张需求卡片
              </button>
              <button className="secondary-button" onClick={onContinue}>继续补充</button>
            </>
          ) : (
            <p className="card-hint">再回答几个关键问题，就可以确认卡片。</p>
          )}
        </div>
      ) : null}
    </aside>
  )
}

function CardSection({
  number,
  title,
  children,
}: {
  number: string
  title: string
  children: ReactNode
}) {
  return (
    <section className="card-section">
      <div className="section-label"><span>{number}</span><h3>{title}</h3></div>
      <div className="section-body">{children}</div>
    </section>
  )
}
