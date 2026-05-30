# Escrow

Conduit Escrow protects both buyer and seller in a peer-to-peer transaction. The buyer locks USDC before anything is delivered. Funds are held securely until the buyer confirms receipt — then released instantly to the seller.

---

## Custody

{% hint style="success" %}
All escrow funds are held in a **Circle Developer-Controlled Wallet** — a secure MPC (multi-party computation) wallet managed by Circle's infrastructure. No private keys are stored in Conduit's database. No one can steal the funds, even if Conduit is compromised.
{% endhint %}

---

## How it works

### Step 1 — Seller creates the escrow link

The seller goes to **Escrow → Create Escrow** and sets:
- Title and description
- USDC amount
- Delivery window (e.g. 7 days)
- Optional contact info

### Step 2 — Buyer pays

The buyer opens the escrow link and pays. USDC is locked in a dedicated Circle wallet. Status changes to **HOLDING**.

### Step 3 — Seller delivers

The seller completes the work or delivers the goods within the agreed window.

### Step 4 — Buyer confirms receipt

The buyer logs in and clicks **Confirm Receipt**. Funds release instantly to the seller. Status changes to **RELEASED**.

### Step 5 — Auto-release

If the buyer doesn't confirm or dispute within 7 days after delivery, funds auto-release to the seller automatically.

---

## Escrow statuses

| Status | Meaning |
|--------|---------|
| `ACTIVE` | Escrow created, waiting for buyer to pay |
| `HOLDING` | Buyer paid — funds locked, waiting for delivery |
| `CONFIRMED` | Buyer confirmed receipt — release in progress |
| `RELEASED` | Funds transferred to seller |
| `DISPUTED` | Buyer raised a dispute — mediation in progress |
| `MEDIATION` | Both sides responded — awaiting admin or AI review |
| `CANCELLED` | Escrow refunded to buyer |

---

## Disputes

If something goes wrong, the buyer can raise a dispute before confirming receipt.

1. Buyer clicks **Raise Dispute** and provides a reason
2. Both parties have **48 hours** to submit evidence in the dispute thread
3. Auto-resolution rules apply:
   - Seller goes silent for 48 hours → funds **automatically refunded** to buyer
   - Buyer goes silent after seller responds → funds **automatically released** to seller
   - Both respond → escalates to **AI Dispute Agent** or admin review

---

## Fees

Conduit takes **0.5%** of the escrow amount on release. This is deducted from the amount transferred to the seller. No fee is charged if the escrow is refunded.
