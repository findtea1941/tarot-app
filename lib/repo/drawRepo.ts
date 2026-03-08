import { db, Draw } from "@/lib/db";

export async function createDraw(input: Omit<Draw, "id" | "createdAt">) {
  const item: Draw = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  };
  await db.draws.add(item);
  return item;
}

export async function listDrawsByCase(caseId: string): Promise<Draw[]> {
  return db.draws.where("caseId").equals(caseId).reverse().sortBy("createdAt");
}