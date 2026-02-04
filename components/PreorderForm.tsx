'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { placePreorderAction, type PreorderActionState } from '@/app/actions';
import { formatWindow, poundsFromBags } from '@/lib/utils';

type Product = {
  productId: string;
  name: string;
  bagSize: number;
  remaining: number;
  description?: string | null;
};

type Pickup = {
  id: string;
  label: string;
  window?: string;
  instructions?: string | null;
};

type Props = {
  dropId: string;
  dropName: string;
  products: Product[];
  pickups: Pickup[];
};

const initialState: PreorderActionState = { status: 'idle', message: '' };

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="w-full rounded-full bg-ember px-6 py-3 text-base font-semibold text-black shadow-glow transition hover:translate-y-[-1px] disabled:opacity-60"
    >
      {pending ? 'Placing order...' : 'Place Pre-Order'}
    </button>
  );
}

export default function PreorderForm({ dropId, dropName, products, pickups }: Props) {
  const [state, formAction] = useFormState(placePreorderAction, initialState);
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(products.map((p) => [p.productId, 0]))
  );
  const [pickupId, setPickupId] = useState<string>(pickups[0]?.id ?? '');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [optIn, setOptIn] = useState(true);

  const summary = useMemo(() => {
    const lineItems = products
      .map((p) => {
        const qty = Math.min(quantities[p.productId] ?? 0, p.remaining);
        return { ...p, qty, pounds: poundsFromBags(qty, p.bagSize) };
      })
      .filter((p) => p.qty > 0);
    const totals = lineItems.reduce(
      (acc, item) => {
        acc.bags += item.qty;
        acc.pounds += item.pounds;
        return acc;
      },
      { bags: 0, pounds: 0 }
    );
    return { lineItems, totals };
  }, [products, quantities]);

  const handleQty = (productId: string, delta: number, max: number) => {
    setQuantities((prev) => {
      const next = Math.max(0, Math.min((prev[productId] ?? 0) + delta, max));
      return { ...prev, [productId]: next };
    });
  };

  const currentPickup = pickups.find((p) => p.id === pickupId);

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-[2fr,1fr]">
      <input type="hidden" name="drop_id" value={dropId} />
      <input
        type="hidden"
        name="items"
        value={JSON.stringify(summary.lineItems.map((item) => ({ product_id: item.productId, qty: item.qty })))}
      />

      <div className="space-y-6">
        <div className="card">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">{dropName}</h2>
            <span className="rounded-full bg-ember/10 px-3 py-1 text-xs font-semibold text-ember">Live</span>
          </div>
          <p className="text-sm text-slate-300">Select quantities per product. Remaining inventory updates live.</p>
          <div className="mt-4 space-y-4">
            {products.map((product) => {
              const qty = quantities[product.productId] ?? 0;
              const remaining = product.remaining;
              const soldOut = remaining <= 0;
              return (
                <div
                  key={product.productId}
                  className="flex flex-col gap-3 rounded-xl border border-white/5 bg-smoke/60 p-4 md:flex-row md:items-center"
                >
                  <div className="flex-1">
                    <p className="text-base font-semibold text-white">{product.name}</p>
                    <p className="text-xs text-slate-400">
                      0.5 lb bags • {product.bagSize.toFixed(1)} lb each {product.description ? '• ' + product.description : ''}
                    </p>
                    <p className={clsx('text-xs font-semibold', soldOut ? 'text-amber-300' : 'text-emerald-300')}>
                      {soldOut ? 'Sold out' : `${remaining} bag${remaining === 1 ? '' : 's'} remaining`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleQty(product.productId, -1, remaining)}
                      className="h-10 w-10 rounded-full border border-white/10 bg-black/40 text-xl disabled:opacity-40"
                      disabled={qty === 0}
                    >
                      −
                    </button>
                    <div className="flex h-10 min-w-[3rem] items-center justify-center rounded-lg border border-white/10 bg-black/60 px-3 text-lg font-semibold">
                      {qty}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleQty(product.productId, 1, remaining)}
                      className="h-10 w-10 rounded-full bg-ember text-black shadow-glow transition hover:translate-y-[-1px] disabled:opacity-50"
                      disabled={soldOut || qty >= remaining}
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card space-y-4">
          <h3 className="text-lg font-semibold text-white">Pickup location</h3>
          <p className="text-sm text-slate-300">Choose where you want to grab your order.</p>
          <div className="space-y-3">
            {pickups.map((pickup) => (
              <label
                key={pickup.id}
                className={clsx(
                  'flex cursor-pointer flex-col gap-1 rounded-xl border px-4 py-3 transition',
                  pickupId === pickup.id ? 'border-ember bg-ember/10' : 'border-white/10 bg-black/30'
                )}
              >
                <input
                  type="radio"
                  name="pickup_id"
                  value={pickup.id}
                  className="hidden"
                  checked={pickupId === pickup.id}
                  onChange={() => setPickupId(pickup.id)}
                  required
                />
                <span className="text-sm font-semibold text-white">{pickup.label}</span>
                <span className="text-xs text-slate-400">{pickup.window ?? 'Pickup window TBA'}</span>
                {pickup.instructions && <span className="text-xs text-slate-500">{pickup.instructions}</span>}
              </label>
            ))}
          </div>
        </div>

        <div className="card space-y-4">
          <h3 className="text-lg font-semibold text-white">Your info</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm text-slate-300" htmlFor="full_name">
                Full name *
              </label>
              <input
                id="full_name"
                name="full_name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-3 text-sm text-white focus:border-ember focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-300" htmlFor="email">
                Email *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-3 text-sm text-white focus:border-ember focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-300" htmlFor="phone">
                Phone (optional)
              </label>
              <input
                id="phone"
                name="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-3 text-sm text-white focus:border-ember focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2 pt-8">
              <input
                id="opt_in"
                name="opt_in"
                type="checkbox"
                checked={optIn}
                onChange={(e) => setOptIn(e.target.checked)}
                className="h-4 w-4 accent-ember"
              />
              <label htmlFor="opt_in" className="text-sm text-slate-300">
                Notify me about future drops
              </label>
            </div>
          </div>
        </div>
      </div>

      <aside className="space-y-4">
        <div className="card space-y-3">
          <h3 className="text-lg font-semibold text-white">Order summary</h3>
          <div className="space-y-2 text-sm text-slate-300">
            {summary.lineItems.length === 0 && <p>No items selected yet.</p>}
            {summary.lineItems.map((item) => (
              <div key={item.productId} className="flex justify-between">
                <span>
                  {item.name} · {item.qty} bag{item.qty === 1 ? '' : 's'}
                </span>
                <span className="text-slate-100">{item.pounds.toFixed(1)} lbs</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-white/5 pt-3 text-sm font-semibold text-white">
            <span>Total bags</span>
            <span>{summary.totals.bags}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-slate-300">
            <span>Total weight</span>
            <span>{summary.totals.pounds.toFixed(1)} lbs</span>
          </div>
          <div className="rounded-lg border border-amber/30 bg-amber/10 px-3 py-2 text-xs text-amber-200">
            Payment collected at pickup.
          </div>
        </div>

        <div className="card space-y-3">
          <h3 className="text-lg font-semibold text-white">Pickup details</h3>
          <p className="text-sm text-slate-300">
            {currentPickup?.label ?? 'Choose a pickup location to view timing.'}
          </p>
          {currentPickup?.window && <p className="text-sm text-slate-200">{currentPickup.window}</p>}
          {currentPickup?.instructions && <p className="text-xs text-slate-400">{currentPickup.instructions}</p>}
        </div>

        {state.status === 'error' && (
          <div className="rounded-lg border border-amber/40 bg-amber/10 px-3 py-2 text-sm text-amber-200">
            {state.message}
          </div>
        )}

        <SubmitButton disabled={summary.totals.bags === 0} />
        <p className="text-xs text-slate-400">You&apos;ll be redirected to confirmation after submission.</p>
      </aside>
    </form>
  );
}
