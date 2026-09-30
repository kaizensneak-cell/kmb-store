"""Backend tests for auth, orders, and favorites (KMB STORE)."""
import os
import time
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") else None
if not BASE_URL:
    # fall back to reading frontend .env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().strip('"').rstrip("/")

ADMIN_PASSWORD = "admin123"


# ---- Helpers to seed a test session directly in Mongo (no OAuth) ----
def _seed_session():
    import subprocess, json
    token = f"test_session_{int(time.time()*1000)}"
    uid = f"test-user-{int(time.time()*1000)}"
    script = f"""
use('test_database');
db.users.insertOne({{ user_id: '{uid}', email: 'testuser_{uid}@example.com', name: 'Pytest User', picture: 'https://via.placeholder.com/150', created_at: new Date() }});
db.user_sessions.insertOne({{ user_id: '{uid}', session_token: '{token}', expires_at: new Date(Date.now()+7*24*60*60*1000), created_at: new Date() }});
"""
    subprocess.run(["mongosh", "--quiet", "--eval", script], check=True, capture_output=True)
    return uid, token


def _cleanup(uid, token):
    import subprocess
    script = f"""
use('test_database');
db.users.deleteOne({{user_id: '{uid}'}});
db.user_sessions.deleteMany({{user_id: '{uid}'}});
db.orders.deleteMany({{user_id: '{uid}'}});
db.favorites.deleteMany({{user_id: '{uid}'}});
"""
    subprocess.run(["mongosh", "--quiet", "--eval", script], capture_output=True)


@pytest.fixture(scope="module")
def session():
    uid, token = _seed_session()
    yield {"user_id": uid, "token": token, "headers": {"Authorization": f"Bearer {token}"}}
    _cleanup(uid, token)


@pytest.fixture(scope="module")
def a_product_id():
    r = requests.get(f"{BASE_URL}/api/products")
    assert r.status_code == 200
    products = r.json()
    assert len(products) > 0
    return products[0]["id"]


# --------- AUTH ---------
class TestAuth:
    def test_me_without_auth_returns_401(self):
        r = requests.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401

    def test_me_with_bearer_returns_user(self, session):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=session["headers"])
        assert r.status_code == 200
        d = r.json()
        assert d["user_id"] == session["user_id"]
        assert "email" in d and "name" in d and "picture" in d
        assert "_id" not in d

    def test_me_with_bad_token_returns_401(self):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": "Bearer BAD_TOKEN_xyz"})
        assert r.status_code == 401


# --------- ORDERS ---------
class TestOrders:
    def test_orders_require_auth(self):
        r = requests.get(f"{BASE_URL}/api/orders")
        assert r.status_code == 401
        r2 = requests.post(f"{BASE_URL}/api/orders", json={
            "items": [], "subtotal": 0, "delivery_fee": 0, "total": 0
        })
        assert r2.status_code == 401

    def test_create_and_list_order(self, session, a_product_id):
        payload = {
            "items": [{"product_id": a_product_id, "name": "Test Sneaker", "brand": "Nike", "size": 42, "qty": 1, "price": 42000}],
            "commune": "Cocody", "landmark": "test", "subtotal": 42000, "delivery_fee": 2000,
            "total": 44000, "method": "whatsapp",
        }
        r = requests.post(f"{BASE_URL}/api/orders", json=payload, headers=session["headers"])
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["user_id"] == session["user_id"]
        assert d["total"] == 44000
        assert d["status"] == "En attente"
        assert "id" in d
        assert "_id" not in d

        # list
        r2 = requests.get(f"{BASE_URL}/api/orders", headers=session["headers"])
        assert r2.status_code == 200
        orders = r2.json()
        assert any(o["id"] == d["id"] for o in orders)

    def test_orders_sorted_newest_first(self, session, a_product_id):
        # Create two more
        for i in range(2):
            requests.post(f"{BASE_URL}/api/orders", json={
                "items": [{"product_id": a_product_id, "name": f"Order {i}", "brand": "X", "size": 40, "qty": 1, "price": 1000}],
                "subtotal": 1000, "delivery_fee": 0, "total": 1000, "method": "wave"
            }, headers=session["headers"])
            time.sleep(0.05)
        r = requests.get(f"{BASE_URL}/api/orders", headers=session["headers"])
        orders = r.json()
        dates = [o["created_at"] for o in orders]
        assert dates == sorted(dates, reverse=True)


# --------- FAVORITES ---------
class TestFavorites:
    def test_favorites_require_auth(self, a_product_id):
        r = requests.get(f"{BASE_URL}/api/favorites")
        assert r.status_code == 401
        r2 = requests.post(f"{BASE_URL}/api/favorites/{a_product_id}")
        assert r2.status_code == 401

    def test_toggle_favorite_on_and_off(self, session, a_product_id):
        r = requests.post(f"{BASE_URL}/api/favorites/{a_product_id}", headers=session["headers"])
        assert r.status_code == 200
        assert r.json()["favorited"] is True

        r2 = requests.get(f"{BASE_URL}/api/favorites", headers=session["headers"])
        assert r2.status_code == 200
        d = r2.json()
        assert a_product_id in d["product_ids"]
        assert any(p["id"] == a_product_id for p in d["products"])

        # toggle off
        r3 = requests.post(f"{BASE_URL}/api/favorites/{a_product_id}", headers=session["headers"])
        assert r3.status_code == 200
        assert r3.json()["favorited"] is False

        r4 = requests.get(f"{BASE_URL}/api/favorites", headers=session["headers"])
        assert a_product_id not in r4.json()["product_ids"]


# --------- LOGOUT ---------
class TestLogout:
    def test_logout_deletes_session(self, a_product_id):
        uid, token = _seed_session()
        h = {"Authorization": f"Bearer {token}"}
        # confirm works first
        assert requests.get(f"{BASE_URL}/api/auth/me", headers=h).status_code == 200
        r = requests.post(f"{BASE_URL}/api/auth/logout", headers=h)
        assert r.status_code == 200
        assert r.json()["success"] is True
        # now should 401
        r2 = requests.get(f"{BASE_URL}/api/auth/me", headers=h)
        assert r2.status_code == 401
        _cleanup(uid, token)


# --------- REGRESSION on existing endpoints ---------
class TestRegression:
    def test_products(self):
        r = requests.get(f"{BASE_URL}/api/products")
        assert r.status_code == 200
        assert len(r.json()) > 0

    def test_config(self):
        r = requests.get(f"{BASE_URL}/api/config")
        assert r.status_code == 200
        assert "communes" in r.json()

    def test_admin_login_wrong(self):
        r = requests.post(f"{BASE_URL}/api/admin/login", json={"password": "wrong"})
        assert r.status_code == 401

    def test_admin_login_correct(self):
        r = requests.post(f"{BASE_URL}/api/admin/login", json={"password": ADMIN_PASSWORD})
        assert r.status_code == 200

    def test_admin_create_product_requires_header(self):
        r = requests.post(f"{BASE_URL}/api/products", json={"brand": "X", "name": "Y", "price": 1})
        assert r.status_code == 401

    def test_admin_create_product_with_header(self):
        r = requests.post(f"{BASE_URL}/api/products",
                          json={"brand": "TEST", "name": "TEST_reg_prod", "price": 100},
                          headers={"X-Admin-Password": ADMIN_PASSWORD})
        assert r.status_code == 200
        pid = r.json()["id"]
        # cleanup
        requests.delete(f"{BASE_URL}/api/products/{pid}", headers={"X-Admin-Password": ADMIN_PASSWORD})
