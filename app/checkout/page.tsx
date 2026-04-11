import { redirect } from "next/navigation";
import { CheckoutClient } from "../../components/CheckoutClient";
import { NavBar } from "../../components/NavBar";
import { getSquareEnv } from "../../lib/env";
import { fetchActiveDrop } from "../../lib/drops";
import { logError } from "../../lib/logger";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const env = getSquareEnv();
  let drop = null;
  try {
    drop = await fetchActiveDrop();
  } catch (error) {
    logError("CheckoutPage fetchActiveDrop failed", error, "checkout-ssr");
  }
  if (!drop || drop.status !== "active") {
    redirect("/");
  }
  return (
    <main className="bg-ember-radial bg-grain">
      <NavBar />
      <CheckoutClient sauceVariationId={env.sauceVariationId} drop={drop} />
    </main>
  );
}
