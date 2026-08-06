import { AppKit } from "@circle-fin/app-kit";
import { toHex, type Chain } from "viem";
import {
  arbitrumSepolia, avalancheFuji, baseSepolia,
  optimismSepolia, polygonAmoy, sepolia,
} from "viem/chains";

// Supported source chains for Unified Balance (testnet)
export const SOURCE_CHAINS = [
  { id: "Base_Sepolia",      name: "Base",      icon: "🔵", color: "#0052ff" },
  { id: "Ethereum_Sepolia",  name: "Ethereum",  icon: "⟠",  color: "#627eea" },
  { id: "Arbitrum_Sepolia",  name: "Arbitrum",  icon: "🔷", color: "#28a0f0" },
  { id: "Polygon_Amoy",      name: "Polygon",   icon: "🟣", color: "#8247e5" },
  { id: "Avalanche_Fuji",    name: "Avalanche", icon: "🔺", color: "#e84142" },
  { id: "OP_Sepolia",        name: "Optimism",  icon: "🔴", color: "#ff0420" },
] as const;

export type SourceChainId = typeof SOURCE_CHAINS[number]["id"];

// Canonical chain definitions for every source chain we offer. This is the one
// source for both the chain id and the EIP-3085 params we hand to
// wallet_addEthereumChain — a wallet that has never seen e.g. Arbitrum Sepolia
// can't switch to it, so we have to be able to describe it. Typed as a total
// Record so adding a SOURCE_CHAINS entry without a definition fails the build.
export const SOURCE_CHAIN_DEFS: Record<SourceChainId, Chain> = {
  Base_Sepolia: baseSepolia,
  Ethereum_Sepolia: sepolia,
  Arbitrum_Sepolia: arbitrumSepolia,
  Polygon_Amoy: polygonAmoy,
  Avalanche_Fuji: avalancheFuji,
  OP_Sepolia: optimismSepolia,
};

function addChainParams(chain: Chain) {
  const explorer = chain.blockExplorers?.default.url;
  return {
    chainId: toHex(chain.id),
    chainName: chain.name,
    nativeCurrency: {
      name: chain.nativeCurrency.name,
      symbol: chain.nativeCurrency.symbol,
      decimals: chain.nativeCurrency.decimals,
    },
    rpcUrls: [...chain.rpcUrls.default.http],
    ...(explorer ? { blockExplorerUrls: [explorer] } : {}),
  };
}

function isUserRejection(err: any): boolean {
  const code = err?.code ?? err?.cause?.code ?? err?.data?.originalError?.code;
  if (code === 4001) return true;
  const msg = String(err?.message ?? "").toLowerCase();
  return msg.includes("user rejected") || msg.includes("user denied");
}

/**
 * Put the wallet on `sourceChainId`, adding the network first if the wallet
 * doesn't already know it.
 *
 * wallet_switchEthereumChain on its own only works for chains the wallet has;
 * for anything else it fails with "Unrecognized chain ID". MetaMask reports
 * that as 4902 but other wallets wrap it as -32603 or bury it in `cause`, so
 * rather than sniff codes we treat any non-rejection switch failure as
 * "wallet doesn't have this chain", add it, then switch again — adding does
 * not reliably leave the wallet on the new chain by itself.
 */
export async function ensureWalletOnChain(sourceChainId: SourceChainId): Promise<void> {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No wallet found. Please install MetaMask.");
  }
  const provider = window.ethereum as any;
  const chain = SOURCE_CHAIN_DEFS[sourceChainId];
  const chainIdHex = toHex(chain.id);

  // Already on it — don't prompt at all.
  try {
    const current = await provider.request({ method: "eth_chainId" });
    if (typeof current === "string" && current.toLowerCase() === chainIdHex.toLowerCase()) return;
  } catch { /* couldn't read it — fall through and switch */ }

  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: chainIdHex }] });
    return;
  } catch (switchErr: any) {
    if (isUserRejection(switchErr)) throw new Error(`Network switch to ${chain.name} was rejected.`);

    try {
      await provider.request({ method: "wallet_addEthereumChain", params: [addChainParams(chain)] });
    } catch (addErr: any) {
      if (isUserRejection(addErr)) throw new Error(`Adding ${chain.name} to your wallet was rejected.`);
      throw new Error(`Could not add ${chain.name} to your wallet. ${addErr?.message ?? ""}`.trim());
    }

    try {
      await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: chainIdHex }] });
    } catch (finalErr: any) {
      if (isUserRejection(finalErr)) throw new Error(`Network switch to ${chain.name} was rejected.`);
      throw finalErr;
    }
  }
}

// Singleton App Kit instance
let _kit: AppKit | null = null;

export function getAppKit(): AppKit {
  if (!_kit) {
    _kit = new AppKit();
  }
  return _kit;
}

// Create viem adapter from browser wallet (MetaMask)
export async function createBrowserAdapter() {
  const { createViemAdapterFromProvider } = await import("@circle-fin/adapter-viem-v2");

  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No wallet found. Please install MetaMask.");
  }

  // Wrap provider to fix gas pricing on testnets
  // Rule: maxFeePerGas = baseFee * multiplier + maxPriorityFeePerGas
  //       maxFeePerGas must ALWAYS be >= maxPriorityFeePerGas
  const wrappedProvider = {
    request: async (args: { method: string; params?: any[] }) => {
      if (args.method === "eth_sendTransaction" && args.params?.[0]) {
        const tx = { ...args.params[0] };

        try {
          const block = await (window.ethereum as any).request({
            method: "eth_getBlockByNumber",
            params: ["latest", false],
          });

          if (block?.baseFeePerGas) {
            const baseFee = BigInt(block.baseFeePerGas);
            const priority = BigInt("1500000000"); // 1.5 gwei tip
            // maxFee = (baseFee * 3) + priority — always > priority
            const maxFee = baseFee * BigInt(3) + priority;

            tx.maxFeePerGas = `0x${maxFee.toString(16)}`;
            tx.maxPriorityFeePerGas = `0x${priority.toString(16)}`;
            delete tx.gasPrice;
          } else {
            // No EIP-1559 support — use legacy gas price
            const priority = BigInt("1500000000");
            const maxFee = BigInt("3000000000") + priority; // 3 gwei + tip
            tx.maxFeePerGas = `0x${maxFee.toString(16)}`;
            tx.maxPriorityFeePerGas = `0x${priority.toString(16)}`;
            delete tx.gasPrice;
          }
        } catch {
          // Fallback — safe values where maxFee > priority
          const priority = BigInt("1500000000");
          const maxFee = BigInt("5000000000") + priority; // 5 gwei + tip
          tx.maxFeePerGas = `0x${maxFee.toString(16)}`;
          tx.maxPriorityFeePerGas = `0x${priority.toString(16)}`;
          delete tx.gasPrice;
        }

        return (window.ethereum as any).request({
          method: "eth_sendTransaction",
          params: [tx],
        });
      }

      // All other methods pass through normally
      return (window.ethereum as any).request(args);
    },
  };

  return createViemAdapterFromProvider({
    provider: wrappedProvider as any,
  });
}