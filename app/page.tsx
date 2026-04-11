import { OrderLanding } from "../components/OrderLanding";
import { fetchActiveDrop } from "../lib/drops";
import { logError } from "../lib/logger";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let initialDrop = null;
  try {
    initialDrop = await fetchActiveDrop();
  } catch (error) {
    logError("HomePage fetchActiveDrop failed", error, "home-ssr");
  }
  return <OrderLanding initialDrop={initialDrop} />;
}
