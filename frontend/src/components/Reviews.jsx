import React from "react";
import { Star } from "lucide-react";

export const Reviews = ({ reviews }) => {
  if (!reviews?.length) return null;
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10" data-testid="reviews-section">
      <p className="mono-label text-[11px] text-[#DC2626] mb-1">Ils nous font confiance</p>
      <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-neutral-900 mb-6">Avis clients</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {reviews.map((r) => (
          <div key={r.id} className="bg-white rounded-xl border border-neutral-200 p-5" data-testid={`review-${r.id}`}>
            <div className="flex gap-0.5 mb-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`w-4 h-4 ${i < r.rating ? "fill-[#DC2626] text-[#DC2626]" : "text-neutral-300"}`} />
              ))}
            </div>
            <p className="text-sm text-neutral-700 leading-relaxed mb-4">« {r.comment} »</p>
            <div className="flex items-center justify-between">
              <span className="font-display font-bold text-sm text-neutral-900">{r.name}</span>
              {r.commune && <span className="mono-label text-[9px] text-neutral-500">{r.commune}</span>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
