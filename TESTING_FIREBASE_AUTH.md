# Testing Firebase Authentication Locally

## Prerequisites

1. **Backend running locally** on `http://localhost:8000`
2. **Frontend running locally** on `http://localhost:3000`
3. **Firebase Authentication enabled** in Firebase Console
4. **Firestore Database enabled** in Firebase Console

## Step 1: Start Backend Server

```bash
cd backend
python -m uvicorn main:app --reload
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

## Step 2: Start Frontend Server

```bash
cd frontend
npm start
```

You should see:
```
Compiled successfully!
Local: http://localhost:3000
```

## Step 3: Test Registration Flow

1. **Open browser** to `http://localhost:3000/register`
2. **Open Browser DevTools** (F12 or Cmd+Option+I)
   - Go to **Console** tab
   - Go to **Network** tab
3. **Fill out registration form:**
   - Email: `test@example.com`
   - Username: `testuser`
   - Password: `test123` (at least 6 characters)
4. **Click "Create account"**

### What to Check:

#### In Browser Console:
- ✅ Should see: `✅ Firebase token added to request: /api/...`
- ✅ Should see: `Registration successful! Please verify your email.`
- ❌ If you see: `⚠️ No current user in Firebase auth` - Firebase Auth not working

#### In Browser Network Tab:
- Look for requests to `localhost:8000/api/...`
- Check the **Request Headers** - should have:
  ```
  Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
  ```

#### In Backend Terminal:
- Should see debug logs:
  ```
  DEBUG: Received token (first 20 chars): eyJhbGciOiJSUzI1NiIs...
  DEBUG: Decoded token payload keys: ['iss', 'aud', 'auth_time', 'user_id', 'sub', 'iat', 'exp', 'email', 'email_verified', 'firebase', 'name']
  DEBUG: Token issuer (iss): https://securetoken.google.com/turtle-stock
  DEBUG: Token email: test@example.com
  DEBUG: Successfully extracted email from Firebase token: test@example.com
  DEBUG: Verified email from token: test@example.com
  ```

## Step 4: Test Login Flow

1. **Log out** if you're logged in
2. **Go to** `http://localhost:3000/login`
3. **Enter credentials:**
   - Email: `test@example.com`
   - Password: `test123`
4. **Click "Sign in"**

### What to Check:

#### In Browser Console:
- ✅ Should see: `✅ Firebase token added to request: /api/...`
- ✅ Should see: `Login successful!`
- ✅ Should redirect to dashboard (`/`)

#### In Backend Terminal:
- Should see same debug logs as registration

## Step 5: Test Protected API Endpoints

1. **After logging in**, go to the **Portfolio** page (`/`)
2. **Check Browser Console:**
   - Should see: `✅ Firebase token added to request: /api/portfolio/performance`
   - Should NOT see: `⚠️ No current user in Firebase auth`
3. **Check Browser Network Tab:**
   - Look for `GET /api/portfolio/performance?period=1y`
   - Status should be **200 OK** (not 401 Unauthorized)
   - Check **Request Headers** - should have `Authorization: Bearer ...`

#### In Backend Terminal:
- Should see:
  ```
  DEBUG: Received token (first 20 chars): ...
  DEBUG: Verified email from token: test@example.com
  INFO:     127.0.0.1:xxxxx - "GET /api/portfolio/performance?period=1y HTTP/1.1" 200 OK
  ```

## Step 6: Test Token Refresh

Firebase tokens automatically refresh. To test:

1. **Wait 1 hour** (tokens expire after 1 hour)
2. **OR** Force token refresh in browser console:
   ```javascript
   // In browser console
   import { auth } from './firebase';
   auth.currentUser.getIdToken(true); // Force refresh
   ```
3. **Make an API request** - should still work

## Troubleshooting

### Issue: 401 Unauthorized

**Check:**
1. **Browser Console:**
   - Is token being added? Look for `✅ Firebase token added`
   - Is user authenticated? Check `auth.currentUser` in console

2. **Backend Terminal:**
   - Is token being received? Look for `DEBUG: Received token`
   - Is email extracted? Look for `DEBUG: Verified email from token`
   - If email is `None`, token verification failed

3. **Common Causes:**
   - User not logged in → Check Firebase Auth state
   - Token not being sent → Check API interceptor
   - Token verification failing → Check backend logs
   - User doesn't exist in database → Should auto-create

### Issue: "No current user in Firebase auth"

**Solution:**
1. Check if you're logged in
2. Refresh the page
3. Check Firebase Console → Authentication → Users
4. Try logging out and logging back in

### Issue: Token verification failing

**Check Backend Logs:**
- Look for `DEBUG: Error decoding Firebase token: ...`
- Check if token format is correct (should have 3 parts separated by `.`)

### Issue: User not found in database

**Solution:**
- Backend should auto-create users
- Check backend logs for auto-creation
- Check database: `sqlite3 backend/turtle_stock.db "SELECT * FROM users;"`

## Quick Test Script

Run this in browser console after logging in:

```javascript
// Test Firebase Auth
import { auth } from './firebase';
console.log('Current user:', auth.currentUser?.email);

// Test getting token
const token = await auth.currentUser?.getIdToken();
console.log('Token (first 50 chars):', token?.substring(0, 50));

// Test API call
const response = await fetch('http://localhost:8000/api/portfolio/performance?period=1y', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
console.log('API Response Status:', response.status);
console.log('API Response:', await response.json());
```

## Expected Results

✅ **Success:**
- Registration creates Firebase user
- Login authenticates with Firebase
- API requests include Firebase token
- Backend verifies token and extracts email
- Backend auto-creates user if needed
- Protected routes work
- Status codes: 200 OK

❌ **Failure:**
- 401 Unauthorized errors
- "Could not validate credentials"
- "No current user in Firebase auth"
- Token not in request headers

## Next Steps

Once local testing works:
1. Deploy backend to Render
2. Deploy frontend to Firebase Hosting/Vercel
3. Update Firebase config with production URLs
4. Test in production

