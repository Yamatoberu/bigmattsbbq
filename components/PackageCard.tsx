import Image from "next/image";
import { PackageConfig } from "../lib/types";
import { getPackageImage } from "../lib/productImages";
import { SoldOutCapture } from "./SoldOutCapture";

interface PackageCardProps {
  pkg: PackageConfig;
  onAdd: () => void;
  isDisabled: boolean;
  soldOut?: boolean;
}

export function PackageCard({ pkg, onAdd, isDisabled, soldOut = false }: PackageCardProps) {
  const image = getPackageImage(pkg);

  return (
    <article
      className={`glass-card relative flex h-full flex-col gap-4 p-6 transition hover:-translate-y-1 ${
        pkg.highlight ? "md:scale-[1.03] md:border-[#d8b56a]" : ""
      }`}
    >
      {pkg.highlight && (
        <span className="badge absolute -top-3 left-1/2 -translate-x-1/2">Most Popular</span>
      )}
      <h3 className="text-xl font-semibold text-smoke-900" style={{ fontFamily: "var(--font-display)" }}>
        {pkg.name}
      </h3>
      <p className="text-sm text-smoke-700">{pkg.description}</p>
      <ul className="text-sm text-smoke-800">
        {pkg.items.map((item) => (
          <li key={`${pkg.id}-${item.itemName}-${item.variationName}`} className="flex items-start gap-2">
            <span className="mt-1 text-xs text-[#b8893a]">•</span>
            <span>
              {item.quantity} {item.itemName}{" "}
              {item.variationName
                ? `(${item.displayVariationName ?? item.variationName})`
                : ""}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-auto flex flex-col gap-3">
        <div className="relative h-28 overflow-hidden rounded-md border border-[#3a2a20] bg-[#201510]">
          <Image src={image.src} alt={image.alt} fill sizes="(min-width: 768px) 280px, 100vw" className="object-cover" />
        </div>
        {soldOut ? (
          <SoldOutCapture />
        ) : (
          <button
            className="button-primary"
            onClick={onAdd}
            disabled={isDisabled}
          >
            Add to Cart
          </button>
        )}
      </div>
    </article>
  );
}
