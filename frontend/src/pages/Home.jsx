import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, MessageCircle } from "lucide-react";
import { api, imgUrl, waLink } from "@/lib/api";
import { CONFIG, BRANDS } from "@/config";
import { Header } from "@/components/Header";
import { InfoStrip } from "@/components/InfoStrip";
import { ProductCard } from "@/components/ProductCard";
import { BrandCarousel } from "@/components/BrandCarousel";
import { Reviews } from "@/components/Reviews";
import { Footer } from "@/components/Footer";
import { CartDrawer } from "@/components/CartDrawer";

export default function Home() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState(null);
  const [maxPrice, setMaxPrice] = useState("");
  const [sizeFilter, setSizeFilter] = useState(null);
  const [sort, setSort] = useState("");

  useEffect(() => {
    api.get("/products").then((r) => setProducts(r.data)).catch(() => {});
    api.get("/reviews").then((r) => setReviews(r.data)).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const q = search.trim().toLowerCase();
      if (q && !(`${p.name} ${p.brand}`.toLowerCase().includes(q))) return false;
      if (brandFilter && p.brand !== brandFilter) return false;
      if (maxPrice && p.price > Number(maxPrice)) return false;
      if (sizeFilter && !p.sizes?.includes(Number(sizeFilter))) return false;
      return true;
    });
  }, [products, search, brandFilter, maxPrice, sizeFilter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    if (sort === "price-asc") arr.sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") arr.sort((a, b) => b.price - a.price);
    else if (sort === "nouveaute") arr.sort((a, b) => (b.badge === "Nouveau" ? 1 : 0) - (a.badge === "Nouveau" ? 1 : 0) || (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    return arr;
  }, [filtered, sort]);

  const featured = sorted.filter((p) => p.featured).slice(0, 8);
  const byBrand = BRANDS.map((b) => ({ brand: b, items: sorted.filter((p) => p.brand === b) })).filter((g) => g.items.length);

  const isFiltering = search || brandFilter || maxPrice || sizeFilter || sort;
  const SIZES = [37, 38, 39, 40, 41, 42, 43, 44, 45];

  return (
    <div className="min-h-screen bg-[#F6F2EC]">
      <InfoStrip />
      <Header search={search} setSearch={setSearch} />
      <CartDrawer />

      {/* HERO */}
      <section id="accueil" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-10">
        <div className="relative rounded-2xl overflow-hidden bg-[#111111] text-white animate-fade-up">
          <img
            src="https://images.unsplash.com/photo-1633464129147-777bdcc97c1d?auto=format&fit=crop&w=1400&q=80"
            alt="Sneakers"
            className="absolute inset-0 w-full h-full object-cover opacity-30"
            loading="eager"
          />
          <div className="relative px-6 sm:px-12 py-14 sm:py-20 max-w-2xl">
            <p className="mono-label text-[11px] text-[#DC2626] mb-3">{CONFIG.TAGLINE}</p>
            <h1 className="font-display font-black text-4xl sm:text-5xl lg:text-6xl leading-[1.05] tracking-tight">
              +10 000 paires vendues
            </h1>
            <p className="mt-4 text-neutral-300 text-sm sm:text-base max-w-md">
              Sneakers 100% authentiques, livrées partout en Côte d'Ivoire. Paiement Wave, commande express sur WhatsApp.
            </p>
            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => document.getElementById("catalogue")?.scrollIntoView({ behavior: "smooth" })}
                className="h-12 px-6 rounded-full bg-[#DC2626] text-white font-semibold flex items-center justify-center gap-2 hover:bg-[#B91C1C] transition-colors"
                data-testid="hero-catalogue-button"
              >
                Voir le catalogue <ArrowRight className="w-4 h-4" />
              </button>
              <a
                href={waLink(`Bonjour ${CONFIG.STORE_NAME}, je souhaite des informations.`)}
                target="_blank"
                rel="noreferrer"
                className="h-12 px-6 rounded-full bg-[#DC2626] text-white font-semibold flex items-center justify-center gap-2 hover:bg-[#B91C1C] transition-colors"
                data-testid="hero-whatsapp-button"
              >
                <MessageCircle className="w-4 h-4" /> Nous contacter / WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FILTERS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mono-label text-[10px] text-neutral-500 mr-1">Filtres</span>
          <select value={sizeFilter || ""} onChange={(e) => setSizeFilter(e.target.value || null)} className="h-9 px-3 rounded-full bg-white border border-neutral-200 text-xs mono-label" data-testid="filter-size">
            <option value="">Pointure</option>
            {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="h-9 px-3 rounded-full bg-white border border-neutral-200 text-xs mono-label" data-testid="filter-price">
            <option value="">Prix max</option>
            <option value="40000">≤ 40 000</option>
            <option value="60000">≤ 60 000</option>
            <option value="80000">≤ 80 000</option>
            <option value="120000">≤ 120 000</option>
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-9 px-3 rounded-full bg-white border border-neutral-200 text-xs mono-label" data-testid="filter-sort">
            <option value="">Trier</option>
            <option value="price-asc">Prix croissant</option>
            <option value="price-desc">Prix décroissant</option>
            <option value="nouveaute">Nouveautés</option>
          </select>
          {isFiltering && (
            <button onClick={() => { setSearch(""); setBrandFilter(null); setMaxPrice(""); setSizeFilter(null); setSort(""); }} className="h-9 px-4 rounded-full bg-[#111111] text-white text-xs mono-label" data-testid="filter-clear">Réinitialiser</button>
          )}
        </div>
      </section>

      {/* FEATURED */}
      <section id="nouveautes" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
        <p className="mono-label text-[11px] text-[#DC2626] mb-1">Ne les ratez pas</p>
        <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-neutral-900 mb-6">Nouveautés & Best-sellers</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
          {featured.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
        </div>
      </section>

      {/* BRAND STRIP */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
        <BrandCarousel active={brandFilter} onSelect={setBrandFilter} />
      </section>

      {/* CATALOGUE */}
      <section id="catalogue" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
        <p className="mono-label text-[11px] text-[#DC2626] mb-1">Toute la boutique</p>
        <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-neutral-900 mb-6">Catalogue complet</h2>
        {byBrand.length === 0 && <p className="text-sm text-neutral-500 py-8">Aucun produit ne correspond à votre recherche.</p>}
        {byBrand.map((g) => (
          <div key={g.brand} className="mb-10" data-testid={`brand-section-${g.brand}`}>
            <h3 className="font-display font-bold text-lg text-neutral-900 mb-4 flex items-center gap-2">
              {g.brand} <span className="mono-label text-[9px] text-neutral-400">({g.items.length})</span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
              {g.items.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
          </div>
        ))}
      </section>

      <Reviews reviews={reviews} />
      <Footer />
    </div>
  );
}
