import { FrozenItemDTO } from "../../lib/types";

export const variationIds = {
  pulledPork: "var-pulled-pork",
  brisket: "var-brisket",
  sauce: "var-sauce",
  familyNight: "var-family-night",
  backyardHost: "var-backyard-host",
  freezerFiller: "var-freezer-filler"
};

export const frozenItemsFixture: FrozenItemDTO[] = [
  {
    itemId: "item-pulled-pork",
    name: "Pulled Pork",
    description: "Smoked low and slow, vacuum-sealed in 0.5 lb bags.",
    variations: [
      {
        variationId: variationIds.pulledPork,
        name: "Regular",
        priceCents: 1349,
        currency: "USD",
        remaining: 24
      }
    ]
  },
  {
    itemId: "item-brisket",
    name: "Brisket",
    description: "12-14 hour smoked brisket, vacuum-sealed in 0.5 lb bags.",
    variations: [
      {
        variationId: variationIds.brisket,
        name: "Regular",
        priceCents: 1699,
        currency: "USD",
        remaining: 18
      }
    ]
  },
  {
    itemId: "item-sauce",
    name: "House BBQ Sauce",
    description: "Our signature house-made BBQ sauce.",
    variations: [
      {
        variationId: variationIds.sauce,
        name: "Regular",
        priceCents: 899,
        currency: "USD",
        remaining: 40
      }
    ]
  },
  {
    itemId: "item-family-night",
    name: "Family Night Bundle",
    description: "Brisket + pulled pork with house sauce. Feeds 4-6.",
    variations: [
      {
        variationId: variationIds.familyNight,
        name: "Regular",
        priceCents: 4599,
        currency: "USD",
        remaining: 10
      }
    ]
  },
  {
    itemId: "item-backyard-host",
    name: "Backyard Host Bundle",
    description: "Double portions for the table. Feeds 8-10.",
    variations: [
      {
        variationId: variationIds.backyardHost,
        name: "Regular",
        priceCents: 8299,
        currency: "USD",
        remaining: 6
      }
    ]
  },
  {
    itemId: "item-freezer-filler",
    name: "Freezer Filler Bundle",
    description: "A deep-freeze reset with plenty of sauce. Feeds 14+.",
    variations: [
      {
        variationId: variationIds.freezerFiller,
        name: "Regular",
        priceCents: 13999,
        currency: "USD",
        remaining: 4
      }
    ]
  }
];
