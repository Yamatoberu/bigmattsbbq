import { PackageConfig } from "./types";

export const CONTACT_EMAIL = 'bigmattsbarbecue@gmail.com';
export const CATERING_EMAIL = 'catering@bigmattsbbq.com';

export const PACKAGES: PackageConfig[] = [
  {
    id: "family-night",
    bundleVariationId: "MTETMYPIXMPTKTFJFSB5RNPN",
    name: "Family Night",
    description: "Brisket + pulled pork with house sauce. Feeds 4-6.",
    items: [
      {
        itemName: "Brisket",
        variationName: "Regular",
        displayVariationName: "1/2 lb bags",
        quantity: 2
      },
      { itemName: "Pulled Pork", variationName: "Regular", displayVariationName: "1/2 lb bags", quantity: 1 },
      { itemName: "Sauce Bottle", variationName: "Regular", displayVariationName: "Bottle", quantity: 1 }
    ]
  },
  {
    id: "backyard-host",
    bundleVariationId: "TXDOELPK4D7CUBWJBNLVD3TB",
    name: "Backyard Host",
    description: "Double portions for the table. Feeds 8-10.",
    highlight: true,
    items: [
      {
        itemName: "Brisket",
        variationName: "Regular",
        displayVariationName: "1/2 lb bags",
        quantity: 2
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
        displayVariationName: "Bottles",
        quantity: 2
      }
    ]
  },
  {
    id: "freezer-stock-up",
    bundleVariationId: "NKLG3CMIWO5GLE4IQHUP4ZDV",
    name: "Freezer Stock-Up",
    description: "A deep-freeze reset with plenty of sauce. Feeds 14+.",
    items: [
      {
        itemName: "Brisket",
        variationName: "Regular",
        displayVariationName: "1/2 lb bags",
        quantity: 4
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
        displayVariationName: "Bottles",
        quantity: 2
      }
    ]
  }
];
