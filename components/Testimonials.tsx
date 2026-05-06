const testimonials = [
  {
    quote: "Brisket that tastes like it came straight off the smoker. The frozen drop is genius.",
    name: "Jordan P."
  },
  {
    quote: "Pickup was smooth and the family-night pack saved our Friday dinner.",
    name: "Tara M."
  },
  {
    quote: "That sauce? Absolute fire. We keep a jar in the fridge at all times.",
    name: "Leo R."
  },
  {
    quote: "Premium feel without the hassle. Order, pick up, heat, feast.",
    name: "Amelia S."
  }
];

type TestimonialsProps = {
  variant?: "cards" | "strip";
};

export function Testimonials({ variant = "cards" }: TestimonialsProps) {
  if (variant === "strip") {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {testimonials.map((t) => (
          <div key={t.name} className="flex items-start gap-2">
            <span className="mt-0.5 shrink-0 text-xs text-gold-400">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
            <div>
              <p className="text-sm text-smoke-700">&ldquo;{t.quote}&rdquo;</p>
              <p className="mt-1 text-xs uppercase tracking-[0.2em] text-gold-300">&#8212; {t.name}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {testimonials.map((testimonial) => (
        <div key={testimonial.name} className="glass-card p-5">
          <p className="text-sm text-smoke-700">&ldquo;{testimonial.quote}&rdquo;</p>
          <p className="mt-4 flex items-center justify-between text-xs uppercase tracking-[0.3em] text-gold-300">
            <span>{testimonial.name}</span>
            <span className="text-gold-400">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
          </p>
        </div>
      ))}
    </div>
  );
}
