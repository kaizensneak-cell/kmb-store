import React from "react";
import { Truck, Wallet, Package } from "lucide-react";

export const InfoStrip = () => {
  const items = [
    { icon: Truck, text: "Livraison partout en CI" },
    { icon: Wallet, text: "Paiement Wave" },
    { icon: Package, text: "+10 000 paires" },
  ];
  return (
    <div className="bg-[#111111] text-white" data-testid="info-strip">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-center gap-5 sm:gap-10 flex-wrap">
        {items.map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-center gap-2">
            <Icon className="w-3.5 h-3.5 text-[#DC2626]" strokeWidth={2.5} />
            <span className="mono-label text-[10px] sm:text-[11px] text-neutral-200">{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
