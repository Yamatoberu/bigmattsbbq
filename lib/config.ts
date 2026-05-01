import { PackageConfig } from "./types";

export const PACKAGES: PackageConfig[] = [
  {
    id: "family-night",
    name: "Family Night",
    description: "Brisket + pulled pork with house sauce. Feeds 4-6.",
    items: [
      {
        itemName: "Brisket",
        variationName: "1/2 lb bag",
        displayVariationName: "1/2 lb bags",
        quantity: 2
      },
      { itemName: "Pulled Pork", variationName: "1/2 lb bag", quantity: 1 },
      { itemName: "BBQ Sauce", variationName: "Bottle", quantity: 1 }
    ]
  },
  {
    id: "backyard-host",
    name: "Backyard Host",
    description: "Double portions for the table. Feeds 8-10.",
    highlight: true,
    items: [
      {
        itemName: "Brisket",
        variationName: "1/2 lb bag",
        displayVariationName: "1/2 lb bags",
        quantity: 2
      },
      {
        itemName: "Pulled Pork",
        variationName: "1/2 lb bag",
        displayVariationName: "1/2 lb bags",
        quantity: 2
      },
      {
        itemName: "BBQ Sauce",
        variationName: "Bottle",
        displayVariationName: "Bottles",
        quantity: 2
      }
    ]
  },
  {
    id: "freezer-stock-up",
    name: "Freezer Stock-Up",
    description: "A deep-freeze reset with plenty of sauce. Feeds 14+.",
    items: [
      {
        itemName: "Brisket",
        variationName: "1/2 lb bag",
        displayVariationName: "1/2 lb bags",
        quantity: 4
      },
      {
        itemName: "Pulled Pork",
        variationName: "1/2 lb bag",
        displayVariationName: "1/2 lb bags",
        quantity: 4
      },
      {
        itemName: "BBQ Sauce",
        variationName: "Bottle",
        displayVariationName: "Bottles",
        quantity: 2
      }
    ]
  }
];
