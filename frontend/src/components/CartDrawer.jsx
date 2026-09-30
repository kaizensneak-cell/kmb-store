import React, { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Trash2, Plus, Minus, MessageCircle, ShoppingBag } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { api, fmtFCFA, imgUrl, waLink } from "@/lib/api";
import { CONFIG } from "@/config";

export const CartDrawer = () => {
  const { items, open, setOpen, removeItem, updateQty, commune, landmark, subtotal, deliveryFee, total } = useCart();
  const [stockMap, setStockMap] = useState({});

  useEffect(() => {
    if (!open) return;
    api.get("/products").then((r) => {
      const m = {};
      r.data.forEach((p) => { m[p.id] = p.stock; });
      setStockMap(m);
    }).catch(() => {});
  }, [open]);

  const hasSoldOut = items.some((i) => stockMap[i.product.id] === 0);

  const checkout = () => {
    if (hasSoldOut) return;
    let msg = `Bonjour ${CONFIG.STORE_NAME}, je souhaite commander :\n\n`;
    items.forEach((i) => {
      msg += `• ${i.product.name} (${i.product.brand}) — Pointure ${i.size} × ${i.qty} = ${fmtFCFA(i.product.price * i.qty)}\n`;
    });
    msg += `\nSous-total : ${fmtFCFA(subtotal)}`;
    if (commune) {
      msg += `\nCommune : ${commune.name}`;
      if (landmark) msg += `\nRepère : ${landmark}`;
      msg += `\nLivraison : ${fmtFCFA(deliveryFee)}`;
    }
    msg += `\n\nTOTAL : ${fmtFCFA(total)}`;
    window.open(waLink(msg), "_blank");
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="w-full sm:max-w-md flex flex-col bg-[#F6F2EC] p-0" data-testid="cart-drawer">
        <SheetHeader className="px-5 py-4 border-b border-neutral-200 bg-white">
          <SheetTitle className="font-display font-extrabold text-xl flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#DC2626]" /> Mon panier
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 && (
            <div className="text-center py-16">
              <p className="mono-label text-[11px] text-neutral-500">Votre panier est vide</p>
            </div>
          )}
          {items.map((i) => (
            <div key={i.product.id + i.size} className="bg-white rounded-xl border border-neutral-200 p-3 flex gap-3" data-testid={`cart-item-${i.product.id}-${i.size}`}>
              <img src={imgUrl(i.product.photos?.[0])} alt={i.product.name} loading="lazy" className="w-16 h-16 rounded-lg object-cover bg-[#EFEAE2]" />
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-sm text-neutral-900 line-clamp-1">{i.product.name}</p>
                <p className="mono-label text-[9px] text-neutral-500 mt-0.5">Pointure {i.size}</p>
                <p className="font-mono font-bold text-[#DC2626] text-sm mt-1">{fmtFCFA(i.product.price * i.qty)}</p>
                {stockMap[i.product.id] === 0 && (
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-[#111111] text-white mono-label text-[8px]" data-testid={`cart-soldout-${i.product.id}-${i.size}`}>Épuisé</span>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <button onClick={() => updateQty(i.product.id, i.size, i.qty - 1)} className="w-6 h-6 rounded-full border border-neutral-300 flex items-center justify-center" data-testid={`cart-dec-${i.product.id}-${i.size}`}><Minus className="w-3 h-3" /></button>
                  <span className="mono-label text-xs w-5 text-center">{i.qty}</span>
                  <button onClick={() => updateQty(i.product.id, i.size, i.qty + 1)} className="w-6 h-6 rounded-full border border-neutral-300 flex items-center justify-center" data-testid={`cart-inc-${i.product.id}-${i.size}`}><Plus className="w-3 h-3" /></button>
                </div>
              </div>
              <button onClick={() => removeItem(i.product.id, i.size)} className="text-neutral-400 hover:text-[#DC2626] self-start" data-testid={`cart-remove-${i.product.id}-${i.size}`}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {commune && (
            <div className="bg-white rounded-xl border border-neutral-200 p-3">
              <p className="mono-label text-[9px] text-neutral-500">Livraison</p>
              <p className="text-sm font-semibold text-neutral-900">{commune.name} — {fmtFCFA(commune.fee)}</p>
              {landmark && <p className="text-xs text-neutral-500 mt-0.5">{landmark}</p>}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-neutral-200 bg-white p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-600">Sous-total</span>
              <span className="font-mono font-semibold">{fmtFCFA(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-600">Livraison</span>
              <span className="font-mono font-semibold">{commune ? fmtFCFA(deliveryFee) : "–"}</span>
            </div>
            <div className="h-px bg-gradient-to-r from-transparent via-[#DC2626] to-transparent" />
            <div className="flex justify-between items-baseline">
              <span className="mono-label text-[11px]">Total</span>
              <span className="font-mono font-bold text-[#DC2626] text-2xl" data-testid="cart-total">{fmtFCFA(total)}</span>
            </div>
            {hasSoldOut && <p className="text-[#DC2626] text-xs text-center" data-testid="cart-soldout-warning">Un article est épuisé. Retirez-le pour continuer.</p>}
            <button onClick={checkout} disabled={hasSoldOut} className={`w-full h-12 rounded-full font-semibold flex items-center justify-center gap-2 transition-colors ${hasSoldOut ? "bg-neutral-200 text-neutral-400 cursor-not-allowed" : "bg-[#111111] text-white hover:bg-neutral-800"}`} data-testid="cart-whatsapp-checkout">
              <MessageCircle className="w-5 h-5" /> Commander via WhatsApp
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
