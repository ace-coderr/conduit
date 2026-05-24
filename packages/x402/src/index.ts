import { NextRequest, NextResponse } from "next/server";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PaymentOptions {
  /** Amount in USDC — e.g. "0.001" */
  amount: string;
  /** Wallet address that receives payment. Defaults to Conduit fee collector */
  payTo?: string;
  /** Facilitator URL. Defaults to Conduit's facilitator on Arc */
  facilitatorUrl?: string;
  /** Network CAIP-2. Defaults to Arc Testnet */
  network?: string;
  /** USDC contract address. Defaults to Arc Testnet USDC */
  asset?: string;
  /** RPC URL for on-chain tx verification. Defaults to Arc Testnet */
  rpcUrl?: string;
  /** Description shown in 402 response and pay page */
  description?: string;
  /** Max transaction age in seconds. Defaults to 300 */
  maxTimeoutSeconds?: number;
  /** Resource URL for tracking. Defaults to request URL */
  resource?: string;
}

export type NextRouteHandler = (
  req: NextRequest,
  context?: any
) => Promise<NextResponse> | NextResponse;

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_FACILITATOR = "https://conduit-pay.vercel.app/api/x402";
const DEFAULT_NETWORK = "eip155:5042002";
const DEFAULT_ASSET = "0x3600000000000000000000000000000000000000";
const DEFAULT_PAY_TO = "0x2d2eba8c0da5879ab25b5bd37e211d230aabbb5c";
const DEFAULT_RPC = "https://rpc.testnet.arc.network";
const CHAIN_ID = 5042002;
const CHAIN_HEX = "0x4CE692";
const TRANSFER_SELECTOR = "0xa9059cbb";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toAtomicUnits(amount: string): string {
  const parsed = parseFloat(amount);
  if (isNaN(parsed) || parsed <= 0) throw new Error(`Invalid amount: ${amount}`);
  return Math.round(parsed * 1_000_000).toString();
}

function buildPaymentDetails(req: NextRequest, opts: Required<PaymentOptions>) {
  return {
    scheme: "exact",
    network: opts.network,
    maxAmountRequired: toAtomicUnits(opts.amount),
    resource: opts.resource || req.url,
    description: opts.description,
    mimeType: "application/json",
    payTo: opts.payTo,
    maxTimeoutSeconds: opts.maxTimeoutSeconds,
    asset: opts.asset,
    extra: { name: "USDC", version: "2" },
  };
}

function build402(req: NextRequest, opts: Required<PaymentOptions>, isHuman: boolean): NextResponse {
  const details = buildPaymentDetails(req, opts);
  const encoded = Buffer.from(JSON.stringify({ accepts: [details] })).toString("base64");

  const headers: Record<string, string> = {
    "PAYMENT-REQUIRED": encoded,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Expose-Headers": "PAYMENT-REQUIRED",
  };

  if (isHuman) {
    return new NextResponse(
      buildPayPage(opts.amount, opts.description, opts.payTo, opts.asset),
      { status: 402, headers: { ...headers, "Content-Type": "text/html" } }
    );
  }

  return new NextResponse(
    JSON.stringify({ error: "Payment Required", accepts: [details] }),
    { status: 402, headers: { ...headers, "Content-Type": "application/json" } }
  );
}

async function verifyAgentPayment(
  payload: string,
  opts: Required<PaymentOptions>,
  resourceUrl: string
): Promise<{ valid: boolean }> {
  try {
    const res = await fetch(`${opts.facilitatorUrl}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payload,
        paymentDetails: {
          scheme: "exact",
          network: opts.network,
          maxAmountRequired: toAtomicUnits(opts.amount),
          payTo: opts.payTo,
          asset: opts.asset,
          resource: resourceUrl,
        },
      }),
    });
    const data = await res.json() as { isValid?: boolean };
return { valid: data.isValid === true };
  } catch {
    return { valid: false };
  }
}

function settleAgentPayment(
  payload: string,
  opts: Required<PaymentOptions>,
  resourceUrl: string
): void {
  fetch(`${opts.facilitatorUrl}/settle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      payload,
      paymentDetails: {
        scheme: "exact",
        network: opts.network,
        maxAmountRequired: toAtomicUnits(opts.amount),
        payTo: opts.payTo,
        asset: opts.asset,
        resource: resourceUrl,
      },
    }),
  }).catch(() => {});
}

async function verifyTxPayment(
  txHash: string,
  opts: Required<PaymentOptions>
): Promise<{ valid: boolean; error?: string }> {
  try {
    const { createPublicClient, http, decodeAbiParameters, parseAbiParameters, getAddress } =
      await import("viem");

    const arcTestnet = {
      id: CHAIN_ID,
      name: "Arc Testnet",
      nativeCurrency: { decimals: 6, name: "USD Coin", symbol: "USDC" },
      rpcUrls: {
        default: { http: [opts.rpcUrl] },
        public: { http: [opts.rpcUrl] },
      },
    } as const;

    const client = createPublicClient({
      chain: arcTestnet as any,
      transport: http(opts.rpcUrl),
    });

    const receipt = await client.getTransactionReceipt({
      hash: txHash as `0x${string}`,
    });

    if (!receipt || receipt.status !== "success") {
      return { valid: false, error: "Transaction failed or not found" };
    }

    if (receipt.to?.toLowerCase() !== opts.asset.toLowerCase()) {
      return { valid: false, error: "Wrong contract" };
    }

    const tx = await client.getTransaction({ hash: txHash as `0x${string}` });
    if (!tx?.input || tx.input.length < 10) {
      return { valid: false, error: "No input data" };
    }

    const selector = tx.input.slice(0, 10).toLowerCase();
    if (selector !== TRANSFER_SELECTOR) {
      return { valid: false, error: "Not a transfer call" };
    }

    const [recipient, amount] = decodeAbiParameters(
      parseAbiParameters("address, uint256"),
      `0x${tx.input.slice(10)}` as `0x${string}`
    );

    if (getAddress(recipient).toLowerCase() !== opts.payTo.toLowerCase()) {
      return { valid: false, error: `Wrong recipient: ${recipient}` };
    }

    const required = BigInt(toAtomicUnits(opts.amount));
    if (amount < required) {
      return { valid: false, error: `Insufficient amount` };
    }

    const block = await client.getBlock({ blockNumber: receipt.blockNumber });
    const txAge = Math.floor(Date.now() / 1000) - Number(block.timestamp);
    if (txAge > opts.maxTimeoutSeconds) {
      return { valid: false, error: `Transaction too old: ${txAge}s` };
    }

    return { valid: true };
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Wrap any Next.js route handler with an x402 USDC payment gate.
 * Powered by Conduit — the first x402 facilitator on Arc Network.
 *
 * @example
 * import { withPayment } from "@ace_won/x402";
 *
 * async function handler(req) {
 *   return Response.json({ data: "your content" });
 * }
 *
 * export const GET = withPayment({ amount: "0.001" }, handler);
 *
 * @example With custom options
 * export const GET = withPayment({
 *   amount: "0.01",
 *   payTo: "0xYourWallet",
 *   description: "Premium API access",
 * }, handler);
 */
export function withPayment(
  options: PaymentOptions,
  handler: NextRouteHandler
): NextRouteHandler {
  const opts: Required<PaymentOptions> = {
    amount: options.amount,
    payTo: options.payTo ?? DEFAULT_PAY_TO,
    facilitatorUrl: options.facilitatorUrl ?? DEFAULT_FACILITATOR,
    network: options.network ?? DEFAULT_NETWORK,
    asset: options.asset ?? DEFAULT_ASSET,
    rpcUrl: options.rpcUrl ?? DEFAULT_RPC,
    description: options.description ?? `Pay ${options.amount} USDC to access this resource`,
    maxTimeoutSeconds: options.maxTimeoutSeconds ?? 300,
    resource: options.resource ?? "",
  };

  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    const acceptHeader = req.headers.get("accept") ?? "";
    const isHuman = acceptHeader.includes("text/html");
    const resourceUrl = opts.resource || req.url;

    const sig =
      req.headers.get("PAYMENT-SIGNATURE") ||
      req.headers.get("payment-signature");

    if (!sig) return build402(req, opts, isHuman);

    // Human: direct ERC-20 transfer
    if (sig.startsWith("tx:")) {
      const { valid, error } = await verifyTxPayment(sig.slice(3), opts);
      if (!valid) {
        console.warn(`[@ace_won/x402] TX verify failed: ${error}`);
        return build402(req, opts, isHuman);
      }
      return handler(req, context);
    }

    // Agent: EIP-3009 authorization
    const { valid } = await verifyAgentPayment(sig, opts, resourceUrl);
    if (!valid) return build402(req, opts, isHuman);
    settleAgentPayment(sig, opts, resourceUrl);
    return handler(req, context);
  };
}

// ─── Pay page HTML ────────────────────────────────────────────────────────────

function buildPayPage(
  amount: string,
  description: string,
  payTo: string,
  asset: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Pay to Access — Conduit x402</title>
  <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800;900&family=IBM+Plex+Mono:wght@400;700&display=swap" rel="stylesheet"/>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:#0a0a0a;color:#f0f0f0;font-family:'Sora',sans-serif;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px}
    .card{background:#111;border:1px solid #222;border-radius:16px;padding:40px;max-width:480px;width:100%;position:relative;overflow:hidden}
    .bar{height:2px;background:linear-gradient(90deg,#00E5A0,#5b8ff9);position:absolute;top:0;left:0;right:0}
    .badge{display:inline-flex;align-items:center;gap:6px;background:rgba(0,229,160,.1);border:1px solid rgba(0,229,160,.2);border-radius:20px;padding:4px 12px;margin-bottom:24px}
    .badge-dot{width:6px;height:6px;border-radius:50%;background:#00E5A0}
    .badge-text{font-size:10px;color:#00E5A0;font-family:'IBM Plex Mono',monospace;font-weight:700;letter-spacing:.08em}
    h1{font-size:24px;font-weight:900;letter-spacing:-.04em;margin-bottom:8px}
    .desc{font-size:13px;color:#888;line-height:1.6;margin-bottom:28px}
    .price-box{background:#0d0d0d;border:1px solid #222;border-radius:12px;padding:20px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:center}
    .price-val{font-size:22px;font-weight:800;color:#00E5A0;font-family:'IBM Plex Mono',monospace}
    .price-unit{font-size:13px;color:#5b8ff9;margin-left:4px;font-weight:700}
    .network-badge{font-size:10px;color:#a78bfa;background:rgba(167,139,250,.1);border:1px solid rgba(167,139,250,.2);border-radius:8px;padding:6px 12px;font-family:'IBM Plex Mono',monospace;font-weight:700}
    .btn{width:100%;padding:14px;background:#00E5A0;border:none;border-radius:10px;color:#000;font-size:14px;font-weight:800;cursor:pointer;margin-bottom:12px;transition:opacity .15s}
    .btn:disabled{opacity:.4;cursor:not-allowed}
    .status{font-size:12px;color:#888;text-align:center;margin-top:12px;font-family:'IBM Plex Mono',monospace;min-height:18px}
    .status.ok{color:#00E5A0}.status.err{color:#f03e5f}
    .powered{font-size:11px;color:#333;text-align:center;margin-top:24px;font-family:'IBM Plex Mono',monospace}
    .powered a{color:#444;text-decoration:none}
  </style>
</head>
<body>
  <div class="card">
    <div class="bar"></div>
    <div class="badge"><span class="badge-dot"></span><span class="badge-text">x402 PAYMENT REQUIRED</span></div>
    <h1>Payment Required</h1>
    <p class="desc">${description}</p>
    <div class="price-box">
      <div>
        <div style="font-size:11px;color:#666;font-family:'IBM Plex Mono',monospace;margin-bottom:4px">ONE-TIME PAYMENT</div>
        <div><span class="price-val">${amount}</span><span class="price-unit">USDC</span></div>
      </div>
      <div class="network-badge">Arc Testnet</div>
    </div>
    <button class="btn" id="btn" onclick="pay()">Connect Wallet & Pay ${amount} USDC</button>
    <div class="status" id="s"></div>
  </div>
  <p class="powered">Powered by <a href="https://conduit-pay.vercel.app">Conduit</a> · Arc Network · Circle USDC</p>
  <script>
  const USDC='${asset}',PAY_TO='${payTo}',AMOUNT='${toAtomicUnits(amount)}';
  function enc(to,amt){return'0xa9059cbb'+to.slice(2).padStart(64,'0')+BigInt(amt).toString(16).padStart(64,'0')}
  async function wait(h){const s=Date.now();while(Date.now()-s<60000){const r=await ethereum.request({method:'eth_getTransactionReceipt',params:[h]});if(r?.status)return r;await new Promise(x=>setTimeout(x,2000))}throw new Error('timeout')}
  async function pay(){
    const btn=document.getElementById('btn'),s=document.getElementById('s');
    if(!window.ethereum){s.textContent='MetaMask not found';s.className='status err';return}
    try{
      btn.disabled=true;s.textContent='Connecting...';
      const[acct]=await ethereum.request({method:'eth_requestAccounts'});
      try{await ethereum.request({method:'wallet_switchEthereumChain',params:[{chainId:'${CHAIN_HEX}'}]})}
      catch(e){if(e.code===4902)await ethereum.request({method:'wallet_addEthereumChain',params:[{chainId:'${CHAIN_HEX}',chainName:'Arc Testnet',nativeCurrency:{name:'USD Coin',symbol:'USDC',decimals:18},rpcUrls:['${DEFAULT_RPC}'],blockExplorerUrls:['https://testnet.arcscan.app']}]})}
      s.textContent='Confirm in MetaMask...';
      const tx=await ethereum.request({method:'eth_sendTransaction',params:[{from:acct,to:USDC,data:enc(PAY_TO,AMOUNT)}]});
      s.textContent='Waiting for confirmation...';
      await wait(tx);
      s.textContent='Verifying...';
      const r=await fetch(location.href,{headers:{'PAYMENT-SIGNATURE':'tx:'+tx}});
      if(r.ok){s.textContent='✓ Paid! Reloading...';s.className='status ok';setTimeout(()=>location.reload(),1000)}
      else{s.textContent='Verification failed. Try again.';s.className='status err';btn.disabled=false}
    }catch(e){s.textContent=e.code===4001?'Rejected.':'Error: '+(e.message||'unknown');s.className='status err';btn.disabled=false}
  }
  </script>
</body>
</html>`;
}