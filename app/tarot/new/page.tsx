import { redirect } from "next/navigation";

/** /tarot/new 与 /tarot 统一为 Step 2 基础信息页 */
export default function TarotNewRedirect() {
  redirect("/tarot");
}
