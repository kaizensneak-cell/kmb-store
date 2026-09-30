import React from "react";
import { MapPin, MessageCircle } from "lucide-react";
import { CONFIG } from "@/config";

export const Footer = () => (
  <footer className="bg-[#111111] text-white mt-4" data-testid="footer">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
        <div>
          <h3 className="font-display font-extrabold text-2xl tracking-tight">{CONFIG.STORE_NAME}</h3>
          <p className="mono-label text-[10px] text-neutral-400 mt-2">Walk with style.</p>
          <p className="text-sm text-neutral-300 mt-1">Premium, immédiat, livré chez toi.</p>
        </div>
        <div>
          <p className="mono-label text-[11px] text-[#DC2626] mb-3">Navigation</p>
          <ul className="space-y-2 text-sm text-neutral-300">
            <li><a href="#accueil" className="hover:text-white">Accueil</a></li>
            <li><a href="#nouveautes" className="hover:text-white">Nouveautés & Best-sellers</a></li>
            <li><a href="#catalogue" className="hover:text-white">Catalogue complet</a></li>
          </ul>
        </div>
        <div>
          <p className="mono-label text-[11px] text-[#DC2626] mb-3">Contact</p>
          <div className="space-y-2 text-sm text-neutral-300">
            <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-[#DC2626]" /> {CONFIG.CITY}</p>
            <a href={`https://wa.me/${CONFIG.WHATSAPP_NUMBER}`} className="flex items-center gap-2 hover:text-white">
              <MessageCircle className="w-4 h-4 text-[#DC2626]" /> WhatsApp {CONFIG.WHATSAPP_DISPLAY}
            </a>
          </div>
        </div>
      </div>
      <div className="h-px my-8 bg-gradient-to-r from-transparent via-[#DC2626] to-transparent" />
      <p className="mono-label text-[10px] text-neutral-500 text-center">© 2026 {CONFIG.STORE_NAME} — Tous droits réservés</p>
    </div>
  </footer>
);
