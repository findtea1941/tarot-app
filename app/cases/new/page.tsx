import { redirect } from "next/navigation";

/** 新建案例统一走塔罗流程，重定向到 Step 2 */
export default function NewCasePage() {
  redirect("/tarot");
}
