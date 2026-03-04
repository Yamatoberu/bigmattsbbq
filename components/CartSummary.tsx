import Link from "next/link";

interface CartSummaryProps {
  itemCount: number;
  estimatedTotal: string;
}

export function CartSummary({ itemCount, estimatedTotal }: CartSummaryProps) {
  if (itemCount === 0) {
    return (
      <div className="glass-card flex items-center justify-between px-5 py-4 text-sm text-smoke-600">
        <span>Add packs or items to start your order.</span>
      </div>
    );
  }

  return (
    <div className="glass-card flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-sm font-semibold text-smoke-800">
          {itemCount} item{itemCount === 1 ? "" : "s"} in cart
        </p>
        <p className="text-xs text-smoke-500">Estimated total: {estimatedTotal}</p>
      </div>
      <Link href="/checkout" className="button-primary text-sm">
        Review &amp; Checkout
      </Link>
    </div>
  );
}
