from fastapi import FastAPI, APIRouter, HTTPException, Header, Depends, UploadFile, File, Query, Request
from fastapi.responses import Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import requests
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'admin123')
EMERGENT_KEY = os.environ.get('EMERGENT_LLM_KEY')
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
APP_NAME = "kmb-store"

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ---------------- Object Storage ----------------
storage_key = None

def init_storage(force: bool = False):
    global storage_key
    if storage_key and not force:
        return storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key, "Content-Type": content_type}, data=data, timeout=120)
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.put(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key, "Content-Type": content_type}, data=data, timeout=120)
    resp.raise_for_status()
    return resp.json()

def get_object(path: str):
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

MIME_TYPES = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "gif": "image/gif", "webp": "image/webp"}

# ---------------- Models ----------------
class Product(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    brand: str
    name: str
    price: int
    old_price: Optional[int] = None
    badge: Optional[str] = None
    description: str = ""
    photos: List[str] = []
    sizes: List[int] = []
    stock: int = 0
    featured: bool = False

class ProductInput(BaseModel):
    brand: str
    name: str
    price: int
    old_price: Optional[int] = None
    badge: Optional[str] = None
    description: str = ""
    photos: List[str] = []
    sizes: List[int] = []
    stock: int = 0
    featured: bool = False

class Commune(BaseModel):
    name: str
    fee: int

class Review(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    rating: int
    comment: str
    commune: str = ""

class LoginInput(BaseModel):
    password: str

# ---------------- Admin auth ----------------
def require_admin(x_admin_password: Optional[str] = Header(None)):
    if x_admin_password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Mot de passe incorrect")
    return True

# ---------------- User / Auth models ----------------
class OrderItem(BaseModel):
    product_id: str
    name: str
    brand: str
    size: int
    qty: int
    price: int

class OrderInput(BaseModel):
    items: List[OrderItem]
    commune: Optional[str] = None
    landmark: str = ""
    subtotal: int
    delivery_fee: int
    total: int
    method: str = "whatsapp"

async def get_current_user(request: Request):
    token = request.cookies.get("session_token")
    if not token:
        auth = request.headers.get("Authorization")
        if auth and auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Non authentifié")
    sess = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not sess:
        raise HTTPException(status_code=401, detail="Session invalide")
    expires_at = sess["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expirée")
    user = await db.users.find_one({"user_id": sess["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Utilisateur introuvable")
    return user

# ---------------- Auth routes ----------------
@api_router.post("/auth/session")
async def create_session(request: Request, response: Response):
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        raise HTTPException(status_code=400, detail="X-Session-ID manquant")
    r = requests.get(
        "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
        headers={"X-Session-ID": session_id}, timeout=30,
    )
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Session Google invalide")
    data = r.json()
    existing = await db.users.find_one({"email": data["email"]}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one({"user_id": user_id}, {"$set": {"name": data.get("name"), "picture": data.get("picture")}})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id, "email": data["email"], "name": data.get("name"),
            "picture": data.get("picture"), "created_at": datetime.now(timezone.utc).isoformat(),
        })
    session_token = data["session_token"]
    expires = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id, "session_token": session_token,
        "expires_at": expires.isoformat(), "created_at": datetime.now(timezone.utc).isoformat(),
    })
    response.set_cookie("session_token", session_token, httponly=True, secure=True, samesite="none", path="/", max_age=7 * 24 * 3600)
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return user

@api_router.get("/auth/me")
async def auth_me(user: dict = Depends(get_current_user)):
    return user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if not token:
        auth = request.headers.get("Authorization")
        if auth and auth.startswith("Bearer "):
            token = auth[7:]
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/", samesite="none", secure=True)
    return {"success": True}

# ---------------- Orders ----------------
@api_router.post("/orders")
async def create_order(data: OrderInput, user: dict = Depends(get_current_user)):
    order = {
        "id": str(uuid.uuid4()), "user_id": user["user_id"],
        **data.model_dump(), "status": "En attente",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.orders.insert_one(order)
    order.pop("_id", None)
    return order

@api_router.get("/orders")
async def list_orders(user: dict = Depends(get_current_user)):
    docs = await db.orders.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return docs

# ---------------- Favorites ----------------
@api_router.post("/favorites/{product_id}")
async def toggle_favorite(product_id: str, user: dict = Depends(get_current_user)):
    existing = await db.favorites.find_one({"user_id": user["user_id"], "product_id": product_id})
    if existing:
        await db.favorites.delete_one({"user_id": user["user_id"], "product_id": product_id})
        return {"favorited": False}
    await db.favorites.insert_one({"user_id": user["user_id"], "product_id": product_id, "created_at": datetime.now(timezone.utc).isoformat()})
    return {"favorited": True}

@api_router.get("/favorites")
async def list_favorites(user: dict = Depends(get_current_user)):
    favs = await db.favorites.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(500)
    ids = [f["product_id"] for f in favs]
    products = await db.products.find({"id": {"$in": ids}}, {"_id": 0}).to_list(500)
    return {"product_ids": ids, "products": products}

# ---------------- Routes ----------------
@api_router.get("/")
async def root():
    return {"message": "KMB STORE API"}

@api_router.post("/admin/login")
async def admin_login(data: LoginInput):
    if data.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Mot de passe incorrect")
    return {"success": True, "token": ADMIN_PASSWORD}

@api_router.get("/config")
async def get_config():
    doc = await db.config.find_one({"_id": "main"}, {"_id": 0})
    if not doc:
        doc = {"communes": DEFAULT_COMMUNES}
    return doc

@api_router.put("/config/communes")
async def update_communes(communes: List[Commune], _: bool = Depends(require_admin)):
    data = [c.model_dump() for c in communes]
    await db.config.update_one({"_id": "main"}, {"$set": {"communes": data}}, upsert=True)
    return {"communes": data}

@api_router.get("/products", response_model=List[Product])
async def list_products(brand: Optional[str] = None):
    q = {}
    if brand:
        q["brand"] = brand
    docs = await db.products.find(q, {"_id": 0}).to_list(1000)
    return docs

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    doc = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Produit introuvable")
    return doc

@api_router.post("/products", response_model=Product)
async def create_product(data: ProductInput, _: bool = Depends(require_admin)):
    product = Product(**data.model_dump())
    await db.products.insert_one(product.model_dump())
    return product

@api_router.put("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, data: ProductInput, _: bool = Depends(require_admin)):
    existing = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Produit introuvable")
    updated = {**existing, **data.model_dump()}
    await db.products.update_one({"id": product_id}, {"$set": updated})
    return updated

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, _: bool = Depends(require_admin)):
    res = await db.products.delete_one({"id": product_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Produit introuvable")
    return {"success": True}

@api_router.get("/reviews", response_model=List[Review])
async def list_reviews():
    docs = await db.reviews.find({}, {"_id": 0}).to_list(100)
    return docs

@api_router.post("/upload")
async def upload_image(file: UploadFile = File(...), _: bool = Depends(require_admin)):
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else "bin"
    content_type = MIME_TYPES.get(ext, file.content_type or "application/octet-stream")
    path = f"{APP_NAME}/uploads/{uuid.uuid4()}.{ext}"
    data = await file.read()
    result = put_object(path, data, content_type)
    await db.files.insert_one({"id": str(uuid.uuid4()), "storage_path": result["path"], "content_type": content_type, "is_deleted": False, "created_at": datetime.now(timezone.utc).isoformat()})
    backend_url = os.environ.get("REACT_APP_BACKEND_URL", "")
    return {"url": f"/api/files/{result['path']}", "path": result["path"]}

@api_router.get("/files/{path:path}")
async def serve_file(path: str):
    record = await db.files.find_one({"storage_path": path, "is_deleted": False})
    if not record:
        raise HTTPException(status_code=404, detail="Fichier introuvable")
    data, content_type = get_object(path)
    return Response(content=data, media_type=record.get("content_type", content_type))

# ---------------- Seed data ----------------
DEFAULT_COMMUNES = [
    {"name": "Abobo", "fee": 2000}, {"name": "Yopougon", "fee": 2000},
    {"name": "Marcory", "fee": 1500}, {"name": "Port-Bouët", "fee": 2000},
    {"name": "Attécoubé", "fee": 1500}, {"name": "Grand-Bassam", "fee": 2500},
    {"name": "Treichville", "fee": 1500}, {"name": "Songon", "fee": 3000},
    {"name": "Bingerville", "fee": 2000}, {"name": "Koumassi", "fee": 1500},
    {"name": "Cocody", "fee": 2000}, {"name": "Adjamé", "fee": 1500},
    {"name": "Anyama", "fee": 2500}, {"name": "Plateau", "fee": 1500},
]

def img(code):
    return f"https://images.unsplash.com/photo-{code}?auto=format&fit=crop&w=800&q=80"

IMGS = {
    "nike_dunk": img("1600185365483-26d7a4cc7519"),
    "jordan_chicago": img("1597639564819-8fa17aa752db"),
    "yeezy": img("1587855049254-351f4e55fe2a"),
    "airmax": img("1550399865-ec7d23b18e8e"),
    "orange": img("1600185365926-3a2ce3cdb9eb"),
    "nike_white": img("1634316427452-3eac60a2803d"),
    "nike_athletic": img("1605348532760-6753d2c43329"),
    "nike_sky": img("1767684807239-56bf9d81be4a"),
    "adidas_low": img("1508609349937-5ec4ae374ebf"),
    "jordan_rb": img("1731132198530-e4b2dc51d511"),
    "jordan_rw": img("1656944227480-98180d2a5155"),
    "jordan_pair": img("1656335362192-2bc9051b1824"),
    "wall": img("1633464129147-777bdcc97c1d"),
}

ALL_SIZES = [37, 38, 39, 40, 41, 42, 43, 44, 45]
LTD_SIZES = [40, 41, 42, 43]

def demo_products():
    d = "Paire 100% authentique, livrée en boîte d'origine. Confort premium, tige résistante et semelle amortie — le must-have streetwear de la saison à Abidjan."
    P = lambda **k: k
    return [
        # Nike
        P(brand="Nike", name="Nike Dunk Low Panda", price=42000, old_price=52000, badge="-19 %", photos=[IMGS["nike_dunk"], IMGS["nike_white"]], sizes=ALL_SIZES, stock=18, featured=True, description=d),
        P(brand="Nike", name="Nike Air Max 95 OG", price=65000, badge="Nouveau", photos=[IMGS["airmax"], IMGS["orange"]], sizes=ALL_SIZES, stock=12, featured=True, description=d),
        P(brand="Nike", name="Nike Air Force 1 '07", price=38000, photos=[IMGS["nike_athletic"]], sizes=ALL_SIZES, stock=25, description=d),
        P(brand="Nike", name="Nike SB Zoom Blazer", price=45000, badge="Stock limité", photos=[IMGS["nike_sky"]], sizes=LTD_SIZES, stock=4, description=d),
        # Adidas
        P(brand="Adidas", name="Adidas Samba OG", price=40000, badge="Nouveau", photos=[IMGS["adidas_low"]], sizes=ALL_SIZES, stock=20, featured=True, description=d),
        P(brand="Adidas", name="Adidas Ultraboost Light", price=72000, old_price=85000, badge="-15 %", photos=[IMGS["nike_white"], IMGS["adidas_low"]], sizes=ALL_SIZES, stock=9, description=d),
        P(brand="Adidas", name="Adidas Forum Low", price=35000, photos=[IMGS["nike_athletic"]], sizes=ALL_SIZES, stock=16, description=d),
        P(brand="Adidas", name="Adidas Gazelle Bold", price=43000, badge="Stock limité", photos=[IMGS["adidas_low"]], sizes=LTD_SIZES, stock=5, description=d),
        # New Balance
        P(brand="New Balance", name="New Balance 550 White Green", price=55000, badge="Nouveau", photos=[IMGS["nike_athletic"], IMGS["nike_white"]], sizes=ALL_SIZES, stock=14, featured=True, description=d),
        P(brand="New Balance", name="New Balance 990v5", price=88000, photos=[IMGS["airmax"]], sizes=ALL_SIZES, stock=7, description=d),
        P(brand="New Balance", name="New Balance 9060 Grey", price=68000, old_price=78000, badge="-13 %", photos=[IMGS["nike_sky"]], sizes=ALL_SIZES, stock=10, description=d),
        P(brand="New Balance", name="New Balance 574 Classic", price=32000, photos=[IMGS["nike_white"]], sizes=ALL_SIZES, stock=22, description=d),
        # Jordan
        P(brand="Jordan", name="Jordan 1 Mid Chicago", price=68000, badge="Nouveau", photos=[IMGS["jordan_chicago"], IMGS["jordan_rw"]], sizes=ALL_SIZES, stock=11, featured=True, description=d),
        P(brand="Jordan", name="Jordan 4 Retro Military", price=95000, old_price=110000, badge="-14 %", photos=[IMGS["jordan_pair"]], sizes=ALL_SIZES, stock=6, featured=True, description=d),
        P(brand="Jordan", name="Jordan 1 Low Bred", price=58000, badge="Stock limité", photos=[IMGS["jordan_rw"]], sizes=LTD_SIZES, stock=4, description=d),
        P(brand="Jordan", name="Air Jordan 3 Black Cat", price=82000, photos=[IMGS["jordan_rb"]], sizes=ALL_SIZES, stock=8, description=d),
        # Asics
        P(brand="Asics", name="Asics Gel-Kayano 14", price=60000, badge="Nouveau", photos=[IMGS["airmax"], IMGS["nike_athletic"]], sizes=ALL_SIZES, stock=13, featured=True, description=d),
        P(brand="Asics", name="Asics Gel-1130 Cream", price=52000, photos=[IMGS["nike_athletic"]], sizes=ALL_SIZES, stock=17, description=d),
        P(brand="Asics", name="Asics Gel-NYC", price=58000, old_price=66000, badge="-12 %", photos=[IMGS["nike_sky"]], sizes=ALL_SIZES, stock=9, description=d),
        P(brand="Asics", name="Asics Gel-Lyte III", price=45000, photos=[IMGS["nike_white"]], sizes=ALL_SIZES, stock=15, description=d),
        # Puma
        P(brand="Puma", name="Puma Suede Classic XXI", price=30000, badge="Nouveau", photos=[IMGS["orange"]], sizes=ALL_SIZES, stock=21, featured=True, description=d),
        P(brand="Puma", name="Puma RS-X Efekt", price=48000, photos=[IMGS["orange"], IMGS["airmax"]], sizes=ALL_SIZES, stock=12, description=d),
        P(brand="Puma", name="Puma Palermo Vintage", price=38000, badge="Stock limité", photos=[IMGS["nike_white"]], sizes=LTD_SIZES, stock=5, description=d),
        P(brand="Puma", name="Puma Speedcat OG", price=42000, old_price=50000, badge="-16 %", photos=[IMGS["nike_athletic"]], sizes=ALL_SIZES, stock=10, description=d),
    ]

DEMO_REVIEWS = [
    {"name": "Koffi A.", "rating": 5, "comment": "Livraison rapide à Cocody, paire authentique et emballage nickel. Je recommande KMB STORE !", "commune": "Cocody"},
    {"name": "Aïcha D.", "rating": 5, "comment": "Commande via WhatsApp super simple, payé par Wave en 2 minutes. Mes Jordan sont magnifiques.", "commune": "Marcory"},
    {"name": "Yann K.", "rating": 4, "comment": "Bon rapport qualité-prix. Reçu le lendemain à Yopougon, taille parfaite.", "commune": "Yopougon"},
    {"name": "Fatou S.", "rating": 5, "comment": "Le meilleur spot pour les sneakers à Abidjan. Service client au top sur WhatsApp.", "commune": "Plateau"},
    {"name": "Ibrahim T.", "rating": 5, "comment": "Des paires rares et originales. Livré à Bingerville sans souci. Merci KMB !", "commune": "Bingerville"},
    {"name": "Marlène G.", "rating": 4, "comment": "Très satisfaite de mes New Balance. Prix en FCFA clair et pas de mauvaise surprise.", "commune": "Treichville"},
]

@app.on_event("startup")
async def startup():
    try:
        init_storage()
        logger.info("Storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
    await db.config.update_one({"_id": "main"}, {"$setOnInsert": {"communes": DEFAULT_COMMUNES}}, upsert=True)
    if await db.products.count_documents({}) == 0:
        for p in demo_products():
            await db.products.insert_one(Product(**p).model_dump())
        logger.info("Seeded demo products")
    if await db.reviews.count_documents({}) == 0:
        for r in DEMO_REVIEWS:
            await db.reviews.insert_one(Review(**r).model_dump())
        logger.info("Seeded demo reviews")

app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
