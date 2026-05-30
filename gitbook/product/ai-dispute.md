# AI Dispute Agent

Conduit uses an AI mediator powered by **Google Gemini 2.0 Flash** to automatically resolve escrow disputes. When a dispute is escalated, the AI reads the full evidence thread and issues a binding verdict.

---

## How it works

1. A dispute is raised and both parties submit evidence in the mediation thread
2. Admin clicks **AI Verdict** in the admin dashboard
3. Gemini reads the full escrow details and every message in the thread
4. Gemini returns a structured verdict with a confidence score
5. If confidence ≥ 80% → verdict auto-executes via Circle wallet
6. If confidence < 80% → verdict is saved as advisory for admin review
7. A system message is posted to the dispute thread with the result

---

## Verdict types

| Verdict | Meaning | When issued |
|---------|---------|-------------|
| `RELEASE` | Funds go to seller | Seller provided convincing delivery evidence, buyer's claim is weak |
| `REFUND` | Funds go to buyer | Seller failed to deliver, ignored dispute, or has no evidence |
| `UNCERTAIN` | Human review needed | Evidence is genuinely ambiguous or both sides have valid claims |

---

## Confidence scoring

| Confidence | Meaning |
|-----------|---------|
| 90–100% | Clear-cut case — auto-executes |
| 80–89% | High confidence — auto-executes |
| 50–79% | Leaning one way — advisory only |
| Below 50% | Returns UNCERTAIN |

---

## Fairness

The AI evaluates only the **content** of the dispute thread — not wallet identities or amounts. It cannot be biased toward buyer or seller. Decisions are consistent, evidence-based, and instant.

---

{% hint style="info" %}
Auto-execution happens via Circle Developer-Controlled Wallets. No human presses a button — the USDC transfer executes directly on Arc Network when confidence is sufficient.
{% endhint %}
