import { DropDTO } from "../../lib/types";

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export const activeDropFixture: DropDTO = {
  id: "drop-e2e-fixture",
  title: "August Frozen Drop",
  status: "active",
  orderCutoffAt: new Date(Date.now() + THREE_DAYS_MS).toISOString(),
  pickupOptions: [
    {
      id: "pickup-preston",
      locationLabel: "Preston",
      pickupDateLabel: "Saturday, Aug 30",
      pickupAtISO: new Date(Date.now() + THREE_DAYS_MS).toISOString()
    },
    {
      id: "pickup-orem",
      locationLabel: "Orem",
      pickupDateLabel: "Sunday, Aug 31",
      pickupAtISO: new Date(Date.now() + THREE_DAYS_MS + 24 * 60 * 60 * 1000).toISOString()
    }
  ]
};
