import React from "react";
import { useNavigate } from "react-router-dom";
import { fmtFCFA, imgUrl } from "@/lib/api";

const badgeStyle = (badge) => {
  if (!badge) return "";
  return "bg-[#DC2626] text-white";
};

export const ProductCard = ({ product, index = 0 }) => {
  const navigate = useNavigate();
  const photo = imgUrl(product.photos?.[0]);

  return (
    <button
      onClick={() => navigate(`/produit/${product.id}`)}
      className="group text-left bg-white rounded-xl border border-neutral-200 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
      data-testid={`product-card-${product.id}`}
    >
      <div className="relative aspect-square overflow-hidden bg-[#EFEAE2]">
        {product.badge && (
          <span
            className={`absolute top-2 left-2 z-10 px-2.5 py-1 rounded-full mono-label text-[9px] font-bold ${badgeStyle(product.badge)}`}
            data-testid={`product-badge-${product.id}`}
          >
            {product.badge}
          </span>
        )}
        {photo && (
          <img
            src={photo}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        )}
      </div>
      <div className="p-3 sm:p-4">
        <p className="mono-label text-[9px] text-neutral-500 mb-1">{product.brand}</p>
        <h3 className="font-display font-bold text-sm leading-snug text-neutral-900 line-clamp-2 min-h-[2.5rem]" data-testid={`product-name-${product.id}`}>
          {product.name}
        </h3>
        <div className="mt-2 flex items-baseline gap-2 flex-wrap">
          <span className="font-mono font-bold text-[#DC2626] text-base sm:text-lg" data-testid={`product-price-${product.id}`}>
            {fmtFCFA(product.price)}
          </span>
          {product.old_price && (
            <span className="font-mono text-xs text-neutral-400 line-through">{fmtFCFA(product.old_price)}</span>
          )}
        </div>
      </div>
    </button>
  );
};
