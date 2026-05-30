# API Endpoints

All endpoints are live at `conduitpay.xyz`.

---

## GET /api/x402

Facilitator discovery endpoint. Returns supported networks, assets, and facilitator information.

**No authentication required.**

### Response

```json
{
  "facilitator": "https://conduitpay.xyz/api/x402",
  "supportedNetworks": ["eip155:5042002"],
  "supportedAssets": ["0x3600000000000000000000000000000000000000"],
  "version": "1.0"
}
```

---

## POST /api/x402/verify

Verify a payment payload before serving your resource. Called automatically by `withPayment()`.

### Request body

```json
{
  "payload": "<base64 encoded payment data>",
  "paymentDetails": {
    "maxAmountRequired": "1000",
    "payTo": "0xYourWallet",
    "network": "eip155:5042002",
    "asset": "0x3600000000000000000000000000000000000000"
  }
}
```

### Response — valid

```json
{
  "isValid": true,
  "networkId": "eip155:5042002",
  "payer": "0xABCD...",
  "amount": "1000",
  "token": "0x3600000000000000000000000000000000000000"
}
```

### Response — invalid

```json
{
  "isValid": false,
  "error": "Payment nonce already used"
}
```

---

## POST /api/x402/settle

Execute the on-chain USDC transfer. Called automatically by `withPayment()` after your handler responds.

### Request body

```json
{
  "payload": "<base64 encoded payment data>",
  "paymentDetails": {
    "payTo": "0xYourWallet",
    "network": "eip155:5042002",
    "asset": "0x3600000000000000000000000000000000000000"
  }
}
```

### Response

```json
{
  "success": true,
  "txHash": "0x1c07e4c7...",
  "network": "eip155:5042002"
}
```

---

## GET /api/arc-stats

Live demo endpoint. Pay 0.001 USDC to receive live Arc Network block stats.

```bash
curl -i https://conduitpay.xyz/api/arc-stats
```

---

## GET /api/x402/payments

Admin endpoint — full history of payments processed through the facilitator.

**Requires** `x-wallet-address` header with the admin wallet address.
