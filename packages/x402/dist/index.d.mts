import { NextRequest, NextResponse } from 'next/server';

interface PaymentOptions {
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
type NextRouteHandler = (req: NextRequest, context?: any) => Promise<NextResponse> | NextResponse;
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
declare function withPayment(options: PaymentOptions, handler: NextRouteHandler): NextRouteHandler;

export { type NextRouteHandler, type PaymentOptions, withPayment };
