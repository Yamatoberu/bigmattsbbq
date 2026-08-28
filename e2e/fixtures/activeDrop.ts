import { DropDTO } from "../../lib/types";

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

function slot(total: number, reserved: number) {
  return { total, reserved };
}

export const activeDropFixture: DropDTO = {
  id: "drop-e2e-fixture",
  title: "August Frozen Drop",
  status: "active",
  orderCutoffAt: new Date(Date.now() + THREE_DAYS_MS).toISOString(),
  capacity: {
    pulledPork: slot(40, 10),
    brisket: slot(30, 5),
    sauce: slot(60, 12),
    familyNight: slot(15, 3),
    backyardHost: slot(10, 2),
    freezerFiller: slot(6, 1)
  },
  soldOut: {
    pulledPork: false,
    brisket: false,
    sauce: false,
    familyNight: false,
    backyardHost: false,
    freezerFiller: false
  },
  pickupOptions: [
    {
      id: "pickup-preston",
      locationLabel: "Preston",
      pickupDateLabel: "Saturday, Aug 30",
      pickupAtISO: new Date(Date.now() + THREE_DAYS_MS).toISOString(),
      isSoldOut: false
    },
    {
      id: "pickup-orem",
      locationLabel: "Orem",
      pickupDateLabel: "Sunday, Aug 31",
      pickupAtISO: new Date(Date.now() + THREE_DAYS_MS + 24 * 60 * 60 * 1000).toISOString(),
      isSoldOut: false
    }
  ],
  capacityEnforced: true
};

export function withSoldOut(flags: Partial<DropDTO["soldOut"]>): DropDTO {
  return {
    ...activeDropFixture,
    soldOut: {
      ...activeDropFixture.soldOut,
      ...flags
    }
  };
}
