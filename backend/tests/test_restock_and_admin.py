"""Backend tests for new restock endpoints and admin order status regression."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().strip('"').rstrip("/")

ADMIN_HEADER = {"X-Admin-Password": "admin123"}


@pytest.fixture(scope="module")
def a_product():
    r = requests.get(f"{BASE_URL}/api/products")
    assert r.status_code == 200
    return r.json()[0]


@pytest.fixture(scope="module")
def created_restock_ids():
    ids = []
    yield ids
    # cleanup any that remain
    for i in ids:
        requests.delete(f"{BASE_URL}/api/admin/restock/{i}", headers=ADMIN_HEADER)


# ---- Restock endpoints ----
class TestRestock:
    def test_create_restock_no_auth_required(self, a_product, created_restock_ids):
        payload = {"product_id": a_product["id"], "size": 42, "whatsapp": "0700000001"}
        r = requests.post(f"{BASE_URL}/api/restock", json=payload)
        assert r.status_code == 200, r.text
        assert r.json().get("success") is True

    def test_admin_list_restock_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/admin/restock")
        assert r.status_code == 401

    def test_admin_list_restock_with_auth_and_persistence(self, a_product, created_restock_ids):
        # create first
        payload = {"product_id": a_product["id"], "size": 43, "whatsapp": "0700000002"}
        rc = requests.post(f"{BASE_URL}/api/restock", json=payload)
        assert rc.status_code == 200

        r = requests.get(f"{BASE_URL}/api/admin/restock", headers=ADMIN_HEADER)
        assert r.status_code == 200
        docs = r.json()
        assert isinstance(docs, list) and len(docs) >= 1
        # newest-first (dates descending)
        dates = [d["created_at"] for d in docs]
        assert dates == sorted(dates, reverse=True)
        # find our entry - verify product_name/brand stored
        entry = next((d for d in docs if d["whatsapp"] == "0700000002" and d["size"] == 43), None)
        assert entry is not None
        assert entry["product_name"] == a_product["name"]
        assert entry["brand"] == a_product["brand"]
        assert "id" in entry
        assert "_id" not in entry
        created_restock_ids.append(entry["id"])

    def test_admin_delete_restock(self, a_product):
        # create one
        rc = requests.post(f"{BASE_URL}/api/restock", json={"product_id": a_product["id"], "size": 44, "whatsapp": "0700000099"})
        assert rc.status_code == 200
        # fetch id
        docs = requests.get(f"{BASE_URL}/api/admin/restock", headers=ADMIN_HEADER).json()
        target = next(d for d in docs if d["whatsapp"] == "0700000099")
        rid = target["id"]

        # delete requires auth
        assert requests.delete(f"{BASE_URL}/api/admin/restock/{rid}").status_code == 401

        rd = requests.delete(f"{BASE_URL}/api/admin/restock/{rid}", headers=ADMIN_HEADER)
        assert rd.status_code == 200
        # confirm removed
        docs2 = requests.get(f"{BASE_URL}/api/admin/restock", headers=ADMIN_HEADER).json()
        assert all(d["id"] != rid for d in docs2)


# ---- Admin orders regression ----
class TestAdminOrders:
    def test_admin_list_orders_auth_gate(self):
        assert requests.get(f"{BASE_URL}/api/admin/orders").status_code == 401
        r = requests.get(f"{BASE_URL}/api/admin/orders", headers=ADMIN_HEADER)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_admin_update_order_status_404_on_bad_id(self):
        r = requests.put(f"{BASE_URL}/api/admin/orders/does-not-exist/status",
                         json={"status": "Livré"}, headers=ADMIN_HEADER)
        assert r.status_code == 404


# ---- Basic regression ----
class TestCore:
    def test_products(self):
        assert requests.get(f"{BASE_URL}/api/products").status_code == 200

    def test_config(self):
        r = requests.get(f"{BASE_URL}/api/config")
        assert r.status_code == 200 and "communes" in r.json()

    def test_reviews(self):
        assert requests.get(f"{BASE_URL}/api/reviews").status_code == 200
