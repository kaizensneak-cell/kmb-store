# Auth Testing Playbook (Emergent Google Auth)

Auth-Gated App Testing Playbook. Testing agent: read this before testing auth-gated pages.

## Step 1: Create Test User & Session (mongosh)
```
mongosh --eval "
use('test_database');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({ user_id: userId, email: 'test.user.' + Date.now() + '@example.com', name: 'Test User', picture: 'https://via.placeholder.com/150', created_at: new Date() });
db.user_sessions.insertOne({ user_id: userId, session_token: sessionToken, expires_at: new Date(Date.now() + 7*24*60*60*1000), created_at: new Date() });
print('Session token: ' + sessionToken);
print('User ID: ' + userId);
"
```

## Step 2: Backend API
```
curl -X GET "$URL/api/auth/me" -H "Authorization: Bearer YOUR_SESSION_TOKEN"
curl -X GET "$URL/api/orders" -H "Authorization: Bearer YOUR_SESSION_TOKEN"
curl -X POST "$URL/api/favorites/PRODUCT_ID" -H "Authorization: Bearer YOUR_SESSION_TOKEN"
curl -X GET "$URL/api/favorites" -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

## Step 3: Browser
Set cookie `session_token` (httpOnly, secure, sameSite None, path /) then goto app. Or navigate to /compte with the cookie.

## Notes
- Backend accepts session_token via httpOnly cookie OR Authorization: Bearer header.
- Callback detection uses `useLocation().hash`.
- All user queries use `{"_id": 0}` projection and custom `user_id`.
- Google OAuth uses no app-managed passwords.
