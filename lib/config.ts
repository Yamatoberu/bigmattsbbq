import { PackageConfig, PickupOption } from "./types";

export const PACKAGES: PackageConfig[] = [
  {
    id: "family-night",
    name: "Family Night Pack",
    description: "Brisket + pulled pork with house sauce. Feeds 4-6.",
    items: [
      { itemName: "Brisket", variationName: "1 lb", quantity: 1 },
      { itemName: "Pulled Pork", variationName: "1 lb", quantity: 1 },
      { itemName: "BBQ Sauce", variationName: "Jar", quantity: 1 }
    ]
  },
  {
    id: "backyard-host",
    name: "Backyard Host Pack",
    description: "Double portions for the table. Feeds 8-10.",
    highlight: true,
    items: [
      { itemName: "Brisket", variationName: "1 lb", quantity: 2 },
      { itemName: "Pulled Pork", variationName: "1 lb", quantity: 2 },
      { itemName: "BBQ Sauce", variationName: "Jar", quantity: 2 }
    ]
  },
  {
    id: "freezer-stock-up",
    name: "Freezer Stock-Up Pack",
    description: "A deep-freeze reset with plenty of sauce. Feeds 14+.",
    items: [
      { itemName: "Brisket", variationName: "1 lb", quantity: 4 },
      { itemName: "Pulled Pork", variationName: "1 lb", quantity: 4 },
      { itemName: "BBQ Sauce", variationName: "Jar", quantity: 4 }
    ]
  }
];

export const PICKUP_OPTIONS: PickupOption[] = [
  {
    locationLabel: "Preston",
    pickupDateLabel: "3/14",
    pickupAtISO: "2026-03-14T17:30:00-07:00"
  },
  {
    locationLabel: "Orem",
    pickupDateLabel: "3/28",
    pickupAtISO: "2026-03-28T17:30:00-07:00"
  }
];
