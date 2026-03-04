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

export function Testimonials() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {testimonials.map((testimonial) => (
        <div key={testimonial.name} className="glass-card p-5">
          <div className="mb-3 h-24 rounded-md border border-[#3a2a20] bg-[linear-gradient(120deg,#201510,#2a1c14)]" />
          <p className="text-sm text-smoke-700">“{testimonial.quote}”</p>
          <div className="mt-4 flex items-center justify-between text-xs uppercase tracking-[0.3em] text-[#f0c16a]">
            <span>{testimonial.name}</span>
            <span className="text-[#d8b56a]">★★★★★</span>
          </div>
        </div>
      ))}
    </div>
  );
}
