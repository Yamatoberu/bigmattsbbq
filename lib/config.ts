import { PackageConfig } from "./types";

export const CONTACT_EMAIL = 'bigmattsbarbecue@gmail.com';
export const CATERING_EMAIL = 'catering@bigmattsbbq.com';

export const PACKAGES: PackageConfig[] = [
  {
    id: "family-night",
    name: "Family Night",
    catalogName: "Family Night Bundle",
    description: "Brisket + pulled pork with house sauce. Feeds 4-6.",
    items: [
      {
        itemName: "Brisket",
        variationName: "Regular",
        displayVariationName: "1/2 lb bags",
        quantity: 2
      },
      { itemName: "Pulled Pork", variationName: "Regular", displayVariationName: "1/2 lb bags", quantity: 1 },
      { itemName: "Sauce Bottle", variationName: "Regular", displayName: "Sauce Bottle", quantity: 1 }
    ]
  },
  {
    id: "backyard-host",
    name: "Backyard Host",
    catalogName: "Backyard Host Bundle",
    description: "Double portions for the table. Feeds 8-10.",
    highlight: true,
    items: [
      {
        itemName: "Brisket",
        variationName: "Regular",
        displayVariationName: "1/2 lb bags",
        quantity: 3
      },
      {
        itemName: "Pulled Pork",
        variationName: "Regular",
        displayVariationName: "1/2 lb bags",
        quantity: 2
      },
      {
        itemName: "Sauce Bottle",
        variationName: "Regular",
        displayName: "Sauce Bottle",
        quantity: 1
      }
    ]
  },
  {
    id: "freezer-filler",
    name: "Freezer Filler",
    catalogName: "Freezer Filler Bundle",
    description: "A deep-freeze reset with plenty of sauce. Feeds 14+.",
    items: [
      {
        itemName: "Brisket",
        variationName: "Regular",
        displayVariationName: "1/2 lb bags",
        quantity: 5
      },
      {
        itemName: "Pulled Pork",
        variationName: "Regular",
        displayVariationName: "1/2 lb bags",
        quantity: 4
      },
      {
        itemName: "Sauce Bottle",
        variationName: "Regular",
        displayName: "Sauce Bottle",
        quantity: 1
      }
    ]
  }
];
