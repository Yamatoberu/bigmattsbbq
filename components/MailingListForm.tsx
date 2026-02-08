'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { subscribeToMailingList } from '@/app/actions';

const initialState = { status: 'idle', message: '' } as const;

type Props = { variant?: 'inline' | 'card' };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-1 inline-flex rounded-xl border border-slate-400/40 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-300 shadow-glow transition hover:translate-y-[-1px] hover:border-slate-200/60 hover:bg-white/10 disabled:opacity-70"
    >
      {pending ? 'Saving...' : 'Join the List'}
    </button>
  );
}

export default function MailingListForm({ variant = 'inline' }: Props) {
  const [state, formAction] = useActionState(subscribeToMailingList, initialState);

  return (
    <form
      action={formAction}
      className={
        variant === 'card'
          ? 'card flex flex-col gap-4 rounded-2xl'
          : 'flex flex-col gap-2 rounded-xl border border-white/5 bg-black/40 p-4'
      }
    >
      <div className="flex-1">
        <label className="text-sm text-slate-300" htmlFor="email">
          Get first dibs on drops
        </label>
        <input
          required
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          className="mt-2 w-full rounded-lg border border-white/10 bg-smoke px-3 py-3 text-sm text-white placeholder:text-slate-500 focus:border-ember focus:outline-none"
        />
        <input type="hidden" name="source" value="site" />
        {state.message && (
          <p className={`mt-2 text-xs ${state.status === 'error' ? 'text-amber-300' : 'text-emerald-300'}`}>
            {state.message}
          </p>
        )}
      </div>
      <div className="flex justify-center">
        <SubmitButton />
      </div>
    </form>
  );
}
