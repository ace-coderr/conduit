# How It Works

The full x402 payment flow from first request to on-chain settlement.

---

## The 5-step flow

### 01 — Client hits your API

The client (AI agent or browser) makes a request to your API route. No payment header is present.

Your route returns `402 Payment Required` with a `PAYMENT-REQUIRED` header containing:
- Amount required (in USDC base units)
- Token address (Arc USDC)
- Network (Arc Testnet)
- Recipient address
- Facilitator URL

### 02 — Client pays on Arc

**For AI agents:**
The agent signs an EIP-3009 `transferWithAuthorization` on Arc Testnet and retries the request with a `PAYMENT-SIGNATURE` header containing the base64-encoded payment payload.

**For browsers:**
The browser is redirected to the Conduit pay page at `conduitpay.xyz/pay/...`. The user connects MetaMask, confirms the transaction, and the browser retries with the transaction hash.

### 03 — withPayment() verifies

The `withPayment()` middleware calls `POST /api/x402/verify` on Conduit's facilitator.

Conduit checks:
- Payload decodes to a valid payment object
- `validAfter` has passed and `validBefore` has not expired
- Payment amount meets the required minimum
- Recipient address matches `payTo`
- Nonce has not been used (checked via `authorizationState` on Arc USDC contract)
- Payer has sufficient USDC balance on Arc

### 04 — Handler is called

Verification passed — your handler function runs and the response is served to the client immediately. No delay.

### 05 — Conduit settles async

After serving the response, `withPayment()` calls `POST /api/x402/settle` in the background. Conduit executes the `transferWithAuthorization` on Arc. The USDC transfer confirms on-chain.

---

## Security — replay protection

Every EIP-3009 authorization has a unique nonce. Before processing, Conduit calls `authorizationState(from, nonce)` on the USDC contract on Arc.

If the nonce was already used in a previous `transferWithAuthorization`, the verification is rejected immediately. Replay attacks are impossible.

---

## Sequence diagram

```
Client          Your API         Conduit /verify    Arc Network
  |                |                  |                  |
  |--- GET ------->|                  |                  |
  |                |--- 402 -------->|                  |
  |<-- 402 --------|                  |                  |
  |                |                  |                  |
  |  [pays on Arc] |                  |                  |
  |                |                  |                  |
  |--- GET + sig ->|                  |                  |
  |                |--- verify(sig) ->|                  |
  |                |                  |--- check nonce ->|
  |                |                  |<-- nonce ok -----|
  |                |<-- isValid:true --|                  |
  |                |                  |                  |
  |<-- 200 response|                  |                  |
  |                |--- settle(sig) ->|--- transferWith ->|
  |                |                  |                  |
```
