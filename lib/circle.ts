import crypto from "crypto";

const API_KEY = process.env.CIRCLE_API_KEY!;
const ENTITY_SECRET = process.env.CIRCLE_ENTITY_SECRET!;
const WALLET_SET_ID = process.env.CIRCLE_WALLET_SET_ID!;
const BASE_URL = "https://api.circle.com";

// Generate a fresh ciphertext for every API call that requires it
async function generateCiphertext(): Promise<string> {
    const res = await fetch(`${BASE_URL}/v1/w3s/config/entity/publicKey`, {
        headers: { Authorization: `Bearer ${API_KEY}` },
    });
    const { data } = await res.json();
    if (!data?.publicKey) throw new Error("Failed to fetch Circle public key");

    const encrypted = crypto.publicEncrypt(
        {
            key: data.publicKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: "sha256",
        },
        Buffer.from(ENTITY_SECRET, "hex")
    );
    return encrypted.toString("base64");
}

// Create a new wallet for an escrow — returns wallet ID and address
export async function createEscrowWallet(escrowId: string): Promise<{
    walletId: string;
    address: string;
}> {
    const ciphertext = await generateCiphertext();

    const res = await fetch(`${BASE_URL}/v1/w3s/developer/wallets`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            entitySecretCiphertext: ciphertext,
            idempotencyKey: crypto.randomUUID(),
            walletSetId: WALLET_SET_ID,
            blockchains: ["ARC-TESTNET"],
            count: 1,
            accountType: "EOA",
            metadata: [{ name: `escrow-${escrowId}`, refId: escrowId }],
        }),
    });

    const result = await res.json();
    const wallet = result?.data?.wallets?.[0];

    if (!wallet?.id || !wallet?.address) {
        throw new Error(`Failed to create Circle wallet: ${JSON.stringify(result)}`);
    }

    return {
        walletId: wallet.id,
        address: wallet.address.toLowerCase(),
    };
}

// Transfer USDC from a Circle-managed escrow wallet to a recipient
export async function transferFromWallet(
    walletId: string,
    recipientAddress: string,
    amount: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
        const ciphertext = await generateCiphertext();

        const res = await fetch(`${BASE_URL}/v1/w3s/developer/transactions/transfer`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                entitySecretCiphertext: ciphertext,
                idempotencyKey: crypto.randomUUID(),
                walletId,
                destinationAddress: recipientAddress,
                amounts: [amount],
                blockchain: "ARC-TESTNET",
                tokenAddress: "0x3600000000000000000000000000000000000000",
                feeLevel: "MEDIUM",
            }),
        });

        const result = await res.json();
        const txId = result?.data?.id;

        if (!txId) {
            return { success: false, error: `Transfer failed: ${JSON.stringify(result)}` };
        }

        // Poll for transaction completion
        const txHash = await pollTransaction(txId);
        if (!txHash) {
            return { success: false, error: "Transaction timed out waiting for confirmation" };
        }

        return { success: true, txHash };
    } catch (err: any) {
        return { success: false, error: err.message ?? "Circle transfer failed" };
    }
}

// Poll Circle for transaction status until confirmed or failed
async function pollTransaction(txId: string, maxAttempts = 30): Promise<string | null> {
    for (let i = 0; i < maxAttempts; i++) {
        await new Promise(r => setTimeout(r, 3000));

        const res = await fetch(`${BASE_URL}/v1/w3s/transactions/${txId}`, {
            headers: { Authorization: `Bearer ${API_KEY}` },
        });
        const result = await res.json();
        const tx = result?.data?.transaction;

        if (!tx) continue;

        if (tx.state === "CONFIRMED" || tx.state === "COMPLETE") {
            return tx.txHash ?? txId;
        }
        if (tx.state === "FAILED" || tx.state === "CANCELLED") {
            throw new Error(`Transaction ${tx.state}: ${tx.errorReason ?? "unknown"}`);
        }
    }
    return null;
}

// Get wallet balance (useful for verification)
export async function getWalletBalance(walletId: string): Promise<string> {
    const res = await fetch(
        `${BASE_URL}/v1/w3s/wallets/${walletId}/balances`,
        { headers: { Authorization: `Bearer ${API_KEY}` } }
    );
    const result = await res.json();
    const tokenBalance = result?.data?.tokenBalances?.[0];
    return tokenBalance?.amount ?? "0";
}