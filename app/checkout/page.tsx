import { CheckoutClient } from "../../components/CheckoutClient";
import { NavBar } from "../../components/NavBar";
import { getSquareEnv } from "../../lib/env";

export default function CheckoutPage() {
  const env = getSquareEnv();
  return (
    <main className="bg-ember-radial bg-grain">
      <NavBar />
      <CheckoutClient sauceVariationId={env.sauceVariationId} />
    </main>
  );
}
