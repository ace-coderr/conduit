import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { SplitPayClient } from "./client";
import { calculateFee } from "@/lib/fees";
import type { Metadata } from "next";

interface Props { params: { splitId: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const split = await db.splitLink.findUnique({ where: { id: params.splitId } });
    if (!split) return { title: "Split Not Found — Conduit" };
    return { title: `Pay ${split.amount} USDC — ${split.title} | Conduit` };
}

export default async function SplitPayPage({ params }: Props) {
    const split = await db.splitLink.findUnique({ where: { id: params.splitId } });
    if (!split) return notFound();

    const fee = calculateFee(split.amount);

    return (
        <SplitPayClient
            split={{
                id: split.id,
                title: split.title,
                description: split.description ?? undefined,
                amount: split.amount,
                splitAddress: split.splitAddress,
                recipients: split.recipients as any,
                status: split.status,
                txHash: split.txHash ?? undefined,
                payouts: (split.payouts as any) ?? undefined,
            }}
            fee={fee}
        />
    );
}