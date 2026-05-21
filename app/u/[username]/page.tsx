import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { UserPayClient } from "./client";

interface Props { params: { username: string } }

export default async function UsernamePage({ params }: Props) {
    const username = params.username.toLowerCase().replace(/^@/, "");
    const profile = await db.userProfile.findUnique({ where: { username } });
    if (!profile) notFound();

    return <UserPayClient profile={profile} username={username} />;
}