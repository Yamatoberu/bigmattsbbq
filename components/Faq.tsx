const faqs = [
  {
    question: "How do frozen drops work?",
    answer:
      "Order during the drop, choose your pickup window, and we email an invoice for payment. Pickup and reheat when ready."
  },
  {
    question: "What's the best way to reheat?",
    answer:
      "Everything is fully pre-cooked. Thaw and eat if you're in a hurry. For the best result, reheat by boiling in the bag — it comes out nearly as good as fresh off the smoker."
  },
  {
    question: "How long does the BBQ stay frozen?",
    answer:
      "Vacuum-sealed portions keep their quality for months when stored frozen and reheated gently."
  },
  {
    question: "Can I add extra sauce?",
    answer:
      "Yes. Build-your-own items or the sauce bump on checkout let you stock up fast."
  },
  {
    question: "What if I miss the pickup window?",
    answer:
      "Email us right away and we will coordinate the next possible pickup time."
  }
];

export function Faq() {
  return (
    <div className="space-y-3">
      {faqs.map((faq) => (
        <details key={faq.question} className="glass-card px-5 py-4">
          <summary className="cursor-pointer text-sm font-semibold text-smoke-800">
            {faq.question}
          </summary>
          <p className="mt-3 text-sm text-smoke-600">{faq.answer}</p>
        </details>
      ))}
    </div>
  );
}
