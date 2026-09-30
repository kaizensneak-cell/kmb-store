# KMB STORE — Boutique de sneakers (Abidjan, CI)

Site vitrine e-commerce mobile-first pour une boutique de sneakers à Abidjan.
Commande via **WhatsApp** et paiement via **Wave**. Interface 100% en français, devise **FCFA**.

## Stack
- **Frontend**: React 19 + Vite + Tailwind v4 + shadcn/ui
- **Backend**: FastAPI + MongoDB
- **Stockage images**: Emergent Object Storage (upload admin)

## Lancer
Les services tournent via supervisor (`frontend`, `backend`, `mongodb`).
- Frontend: port 3000 · Backend: port 8001 (préfixe `/api`)

## Configuration centrale
Tout est centralisé dans **`/app/frontend/src/config.js`** :
- `STORE_NAME`, `TAGLINE`
- `WHATSAPP_NUMBER` (format international sans `+`) et `WHATSAPP_DISPLAY`
- `WAVE_LINK` (lien de paiement Wave — remplacez par le vôtre)
- `CURRENCY`, `CITY`, `PRIMARY_COLOR`
- `BRANDS`, `BRAND_LOGOS`

Le **mot de passe admin** est dans `/app/backend/.env` → `ADMIN_PASSWORD` (défaut `admin123`).

## Espace Admin
- Accès : bouton menu (☰) en haut à droite, ou `/admin`
- Mot de passe par défaut : **admin123**
- Fonctions :
  - Ajouter / modifier / supprimer des produits
  - Uploader des photos (stockage cloud)
  - Gérer badges, pointures, stock, mise en avant
  - Éditer les frais de livraison par commune

## Données
- Produits, avis et frais de livraison sont initialisés automatiquement (seed) au premier démarrage.
- Modèle produit : `brand, name, price, old_price, badge, description, photos[], sizes[], stock, featured`

## Pages
- `/` : accueil (hero, nouveautés, marques, catalogue par marque, avis, footer)
- `/produit/:id` : fiche produit (pointure, commune, résumé, commande WhatsApp/Wave)
- `/admin` : administration
