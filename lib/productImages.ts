import { FrozenItemDTO, PackageConfig } from "./types";

export interface ProductImageConfig {
  src: string;
  alt: string;
}

const DEFAULT_ITEM_IMAGE: ProductImageConfig = {
  src: "/smoke.png",
  alt: "Big Matt's BBQ smoked product"
};

const ITEM_IMAGE_BY_KEY: Record<string, ProductImageConfig> = {
  brisket: {
    src: "/images/items/brisket-card.svg",
    alt: "Sliced smoked brisket"
  },
  "pulled-pork": {
    src: "/images/items/pulled-pork-card.svg",
    alt: "Pulled pork with bark and smoke"
  },
  "bbq-sauce": {
    src: "/images/items/bbq-sauce-card.svg",
    alt: "Bottle of Big Matt's BBQ sauce"
  }
};

const PACKAGE_IMAGE_BY_ID: Record<string, ProductImageConfig> = {
  "family-night": {
    src: "/images/packages/family-night-card.svg",
    alt: "Family Night bundle with brisket, pulled pork, and sauce"
  },
  "backyard-host": {
    src: "/images/packages/backyard-host-card.svg",
    alt: "Backyard Host bundle with larger portions for a group"
  },
  "freezer-stock-up": {
    src: "/images/packages/freezer-stock-up-card.svg",
    alt: "Freezer Stock-Up bundle with bulk barbecue portions"
  }
};

function normalizeProductKey(name: string) {
  const lower = name.trim().toLowerCase();

  if (lower.includes("pulled pork")) {
    return "pulled-pork";
  }

  if (lower.includes("brisket")) {
    return "brisket";
  }

  if (lower.includes("sauce")) {
    return "bbq-sauce";
  }

  return lower.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function getFrozenItemImage(item: Pick<FrozenItemDTO, "name">): ProductImageConfig {
  return ITEM_IMAGE_BY_KEY[normalizeProductKey(item.name)] ?? DEFAULT_ITEM_IMAGE;
}

export function getPackageImage(pkg: Pick<PackageConfig, "id" | "name">): ProductImageConfig {
  return (
    PACKAGE_IMAGE_BY_ID[pkg.id] ?? {
      src: "/smoke.png",
      alt: `${pkg.name} bundle`
    }
  );
}
