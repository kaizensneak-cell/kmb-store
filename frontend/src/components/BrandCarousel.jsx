import React from "react";
import { BRANDS, BRAND_LOGOS } from "@/config";

export const BrandCarousel = ({ active, onSelect }) => {
  const row = [...BRANDS, ...BRANDS];
  return (
    <div className="overflow-hidden" data-testid="brand-carousel">
      <div className="flex gap-4 animate-marquee w-max">
        {row.map((brand, i) => (
          <button
            key={brand + i}
            onClick={() => onSelect(active === brand ? null : brand)}
            className={`flex flex-col items-center gap-2 shrink-0 w-24 sm:w-28 py-4 rounded-xl border transition-colors ${
              active === brand ? "border-[#DC2626] bg-[#FEF2F2]" : "border-neutral-200 bg-white hover:border-neutral-300"
            }`}
            data-testid={`brand-chip-${brand}`}
          >
            <div className="w-12 h-12 rounded-full bg-[#F6F2EC] border border-neutral-200 flex items-center justify-center overflow-hidden">
              <img src={BRAND_LOGOS[brand]} alt={brand} loading="lazy" className="w-7 h-7 object-contain" />
            </div>
            <span className="mono-label text-[9px] text-neutral-700">{brand}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
