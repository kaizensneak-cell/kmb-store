import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, ShoppingBag, MessageCircle, Wallet, CheckCircle2, Heart } from "lucide-react";
import { api, imgUrl, fmtFCFA, waLink } from "@/lib/api";
import { CONFIG } from "@/config";
import { InfoStrip } from "@/components/InfoStrip";
import { Header } from "@/components/Header";
import { CartDrawer } from "@/components/CartDrawer";
import { Footer } from "@/components/Footer";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const SIZES = [37, 38, 39, 40, 41, 42, 43, 44, 45];

export default function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem, setOpen, setCommune: setCartCommune, setLandmark: setCartLandmark } = useCart();
  const { recordOrder, isFavorite, toggleFavorite } = useAuth();

  const [product, setProduct] = useState(null);
  const [communes, setCommunes] = useState([]);
  const [size, setSize] = useState(null);
  const [commune, setCommune] = useState(null);
  const [landmark, setLandmark] = useState("");
  const [activePhoto, setActivePhoto] = useState(0);
  const [search, setSearch] = useState("");
  const [restockOpen, setRestockOpen] = useState(false);
  const [restockPhone, setRestockPhone] = useState("");
  const [restockSize, setRestockSize] = useState("");

  useEffect(() => {
    api.get(`/products/${id}`).then((r) => setProduct(r.data)).catch(() => navigate("/"));
    api.get("/config").then((r) => setCommunes(r.data.communes || [])).catch(() => {});
    window.scrollTo(0, 0);
  }, [id, navigate]);

  const soldOut = product?.stock === 0;
  const complete = size && commune && !soldOut;
  const deliveryFee = commune ? commune.fee : 0;
  const total = product ? product.price + deliveryFee : 0;

  const syncCart = () => {
    if (commune) { setCartCommune(commune); setCartLandmark(landmark); }
  };

  const handleAddToCart = () => {
    if (soldOut) { toast.error("Ce modèle est épuisé."); return; }
    if (!complete) { toast.error("Sélectionnez une pointure et une commune."); return; }
    syncCart();
    addItem(product, size, 1);
    setOpen(true);
    toast.success("Ajouté au panier");
  };

  const orderMessage = () => {
    let msg = `Bonjour ${CONFIG.STORE_NAME}, je commande :\n\n`;
    msg += `Modèle : ${product.name} (${product.brand})\n`;
    msg += `Pointure : ${size}\n`;
    msg += `Prix produit : ${fmtFCFA(product.price)}\n`;
    msg += `Commune : ${commune.name}\n`;
    if (landmark) msg += `Repère : ${landmark}\n`;
    msg += `Livraison : ${fmtFCFA(deliveryFee)}\n`;
    msg += `\nTOTAL À PAYER : ${fmtFCFA(total)}`;
    return msg;
  };

  const orderPayload = (method) => ({
    items: [{ product_id: product.id, name: product.name, brand: product.brand, size, qty: 1, price: product.price }],
    commune: commune.name, landmark, subtotal: product.price, delivery_fee: deliveryFee, total, method,
  });

  const handleWhatsApp = () => {
    if (!complete) return;
    syncCart();
    recordOrder(orderPayload("whatsapp"));
    window.open(waLink(orderMessage()), "_blank");
  };

  const handleWave = () => {
    if (!complete) return;
    syncCart();
    recordOrder(orderPayload("wave"));
    // Alerte automatique au gérant (WhatsApp pré-rempli) + ouverture du paiement Wave
    const alertMsg = `🔔 NOUVELLE COMMANDE (Wave)\n${product.name} — Pointure ${size}\nCommune : ${commune.name}${landmark ? " (" + landmark + ")" : ""}\nTotal : ${fmtFCFA(total)}`;
    window.open(waLink(alertMsg), "_blank");
    window.open(CONFIG.WAVE_LINK, "_blank");
  };

  const submitRestock = async () => {
    const sz = restockSize || size;
    if (!sz) { toast.error("Choisissez une pointure."); return; }
    if (!restockPhone.trim()) { toast.error("Entrez votre numéro WhatsApp."); return; }
    try {
      await api.post("/restock", { product_id: product.id, size: Number(sz), whatsapp: restockPhone.trim() });
      toast.success("Nous vous préviendrons dès le retour en stock !");
      setRestockOpen(false); setRestockPhone(""); setRestockSize("");
    } catch { toast.error("Erreur, réessayez."); }
  };

  const handlePaid = () => {
    const msg = `Bonjour ${CONFIG.STORE_NAME}, j'ai payé ma commande via Wave :\n\n${product.name} — Pointure ${size}\nTotal : ${fmtFCFA(total)}\n\nVoici la capture de mon paiement 👇`;
    window.open(waLink(msg), "_blank");
  };

  if (!product) return <div className="min-h-screen bg-[#F6F2EC]" />;
  const photos = product.photos?.length ? product.photos : [""];

  return (
    <div className="min-h-screen bg-[#F6F2EC]">
      <InfoStrip />
      <Header search={search} setSearch={setSearch} />
      <CartDrawer />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <button onClick={() => navigate("/")} className="mono-label text-[11px] text-neutral-600 hover:text-[#DC2626] flex items-center gap-1.5 mb-6" data-testid="back-to-catalogue">
          <ArrowLeft className="w-3.5 h-3.5" /> Retour au catalogue
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* GALLERY */}
          <div>
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-white border border-neutral-200">
              <span className="absolute top-3 left-3 z-10 px-3 py-1 rounded-full bg-white border border-neutral-200 mono-label text-[9px] font-bold text-neutral-900">Nouveauté</span>
              <img src={imgUrl(photos[activePhoto])} alt={product.name} className="w-full h-full object-cover" data-testid="product-main-photo" />
            </div>
            {photos.length > 1 && (
              <div className="flex gap-2 mt-3">
                {photos.map((ph, i) => (
                  <button key={i} onClick={() => setActivePhoto(i)} className={`w-16 h-16 rounded-lg overflow-hidden border-2 ${activePhoto === i ? "border-[#DC2626]" : "border-neutral-200"}`} data-testid={`thumb-${i}`}>
                    <img src={imgUrl(ph)} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* DETAILS */}
          <div>
            <p className="mono-label text-[11px] text-[#DC2626] mb-1">{product.brand}</p>
            <div className="flex items-start justify-between gap-3">
              <h1 className="font-display font-black text-3xl sm:text-4xl leading-tight text-neutral-900" data-testid="product-title">{product.name}</h1>
              <button
                onClick={() => toggleFavorite(product.id)}
                className="shrink-0 w-11 h-11 rounded-full border border-neutral-200 bg-white flex items-center justify-center hover:border-[#DC2626] transition-colors"
                data-testid="product-favorite-button"
                aria-label="Ajouter aux favoris"
              >
                <Heart className={`w-5 h-5 ${isFavorite(product.id) ? "fill-[#DC2626] text-[#DC2626]" : "text-neutral-500"}`} />
              </button>
            </div>
            <div className="mt-3 flex items-baseline gap-3">
              <span className="font-mono font-bold text-[#DC2626] text-3xl sm:text-4xl" data-testid="product-detail-price">{fmtFCFA(product.price)}</span>
              {product.old_price && <span className="font-mono text-neutral-400 line-through text-lg">{fmtFCFA(product.old_price)}</span>}
            </div>
            {soldOut && <span className="inline-block mt-2 px-3 py-1 rounded-full bg-[#111111] text-white mono-label text-[10px] font-bold" data-testid="sold-out-badge">Épuisé</span>}
            <p className="mt-4 text-sm text-neutral-600 leading-relaxed">{product.description}</p>

            {/* SIZES */}
            <div className="mt-7">
              <p className="mono-label text-[11px] text-neutral-900 mb-3">Pointure</p>
              <div className="grid grid-cols-5 gap-2">
                {SIZES.map((s) => {
                  const avail = product.sizes?.includes(s);
                  return (
                    <button
                      key={s}
                      disabled={!avail}
                      onClick={() => setSize(s)}
                      className={`h-11 rounded-lg mono-label text-xs font-bold transition-colors ${
                        size === s ? "bg-[#DC2626] text-white" : avail ? "bg-neutral-100 text-neutral-800 hover:bg-neutral-200" : "bg-neutral-50 text-neutral-300 line-through cursor-not-allowed"
                      }`}
                      data-testid={`size-${s}`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
              <button onClick={() => setRestockOpen((v) => !v)} className="mt-3 mono-label text-[10px] text-neutral-600 underline underline-offset-2" data-testid="restock-toggle">
                Pointure indisponible ? Prévenez-moi quand elle revient
              </button>
              {restockOpen && (
                <div className="mt-3 bg-white rounded-xl border border-neutral-200 p-4 space-y-2" data-testid="restock-form">
                  <div className="grid grid-cols-2 gap-2">
                    <select value={restockSize} onChange={(e) => setRestockSize(e.target.value)} className="h-10 px-3 rounded-lg border border-neutral-200 text-sm" data-testid="restock-size">
                      <option value="">{`Pointure${size ? ` (${size})` : ""}`}</option>
                      {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <input value={restockPhone} onChange={(e) => setRestockPhone(e.target.value)} placeholder="Votre WhatsApp" className="h-10 px-3 rounded-lg border border-neutral-200 text-sm" data-testid="restock-phone" />
                  </div>
                  <button onClick={submitRestock} className="w-full h-10 rounded-full bg-[#DC2626] text-white font-semibold text-sm" data-testid="restock-submit">M'alerter au retour en stock</button>
                </div>
              )}
            </div>

            {/* COMMUNE */}
            <div className="mt-7">
              <p className="mono-label text-[11px] text-neutral-900 mb-3 flex items-center gap-1.5"><MapPin className="w-4 h-4 text-[#DC2626]" /> Commune de livraison</p>
              <div className="grid grid-cols-2 gap-2">
                {communes.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => setCommune(c)}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      commune?.name === c.name ? "border-[#DC2626] bg-[#FEF2F2]" : "border-neutral-200 bg-white hover:border-neutral-300"
                    }`}
                    data-testid={`commune-${c.name}`}
                  >
                    <p className="font-semibold text-sm text-neutral-900">{c.name}</p>
                    <p className="mono-label text-[9px] text-neutral-500 mt-0.5">{fmtFCFA(c.fee)}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* LANDMARK */}
            <div className="mt-5">
              <p className="mono-label text-[11px] text-neutral-900 mb-2">Repère / quartier exact (optionnel)</p>
              <input
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="Ex : près de la pharmacie X, rue Y…"
                className="w-full h-11 px-4 rounded-lg bg-white border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#DC2626]/40"
                data-testid="landmark-input"
              />
            </div>

            {/* SUMMARY */}
            <div className="mt-6 bg-white rounded-xl border border-neutral-200 p-5">
              <div className="flex justify-between text-sm mb-2">
                <span className="mono-label text-[10px] text-neutral-500">Prix produit</span>
                <span className="font-mono font-semibold">{fmtFCFA(product.price)}</span>
              </div>
              <div className="flex justify-between text-sm mb-3">
                <span className="mono-label text-[10px] text-neutral-500">Livraison</span>
                <span className="font-mono font-semibold" data-testid="summary-delivery">{commune ? fmtFCFA(deliveryFee) : "–"}</span>
              </div>
              <div className="h-px bg-gradient-to-r from-transparent via-[#DC2626] to-transparent" />
              <div className="flex justify-between items-baseline mt-3">
                <span className="mono-label text-[11px]">Total à payer</span>
                <span className="font-mono font-black text-[#DC2626] text-3xl" data-testid="summary-total">{fmtFCFA(total)}</span>
              </div>
            </div>

            {/* ACTIONS */}
            <div className="mt-5 space-y-3">
              <button onClick={handleAddToCart} disabled={soldOut} className={`w-full py-3.5 rounded-full font-semibold flex items-center justify-center gap-2 transition-colors ${soldOut ? "bg-neutral-200 text-neutral-400 cursor-not-allowed" : "bg-[#111111] text-white hover:bg-neutral-800"}`} data-testid="add-to-cart-button">
                <ShoppingBag className="w-5 h-5" /> Ajouter au panier
              </button>
              {soldOut ? (
                <p className="text-[#DC2626] text-xs text-center font-bold" data-testid="sold-out-msg">Ce modèle est épuisé pour le moment.</p>
              ) : !complete && (
                <p className="text-[#DC2626] text-xs text-center" data-testid="incomplete-error">
                  Sélectionnez une pointure et une commune pour commander.
                </p>
              )}
              <button onClick={handleWhatsApp} disabled={!complete} className={`w-full py-3.5 rounded-full border font-semibold flex items-center justify-center gap-2 transition-colors ${complete ? "border-[#111111] text-[#111111] hover:bg-[#111111] hover:text-white" : "border-neutral-200 text-neutral-300 cursor-not-allowed"}`} data-testid="order-whatsapp-button">
                <MessageCircle className="w-5 h-5" /> Commander via WhatsApp
              </button>
              <button onClick={handleWave} disabled={!complete} className={`w-full py-3.5 rounded-full font-semibold flex items-center justify-center gap-2 transition-colors ${complete ? "bg-[#DC2626] text-white hover:bg-[#B91C1C]" : "bg-neutral-200 text-neutral-400 cursor-not-allowed"}`} data-testid="order-wave-button">
                <Wallet className="w-5 h-5" /> Payer via Wave
              </button>
              <button onClick={handlePaid} className="w-full py-3.5 rounded-full border border-neutral-300 text-neutral-800 font-semibold flex items-center justify-center gap-2 hover:bg-white transition-colors" data-testid="paid-confirm-button">
                <CheckCircle2 className="w-5 h-5 text-[#DC2626]" /> J'ai payé → Confirmer
              </button>
              <p className="mono-label text-[9px] text-neutral-500 text-center pt-1">
                Paiement Wave · Contact WhatsApp {CONFIG.WHATSAPP_DISPLAY}
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
