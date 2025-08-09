# Google OAuth Setup for Newsletter

## Current Status: Verification in Progress ⏳

Your Google OAuth application is currently under verification by Google. During this period, there are some limitations:

### Testing Mode Limitations:
- **Limited to 100 users** during testing phase
- **Only test users** can sign in (you need to add them manually)
- **Warning screens** shown to users during sign-in
- **Unverified app** warnings displayed

### What Works in Testing Mode:
- ✅ Manual newsletter subscription (always works)
- ✅ Google Sign-In for **test users only**
- ✅ All functionality works for added test users

## Verification Process & Timeline

### Current Status: In Progress
- Your OAuth consent screen is under review by Google
- Typical verification time: **1-2 weeks**
- During this time, the app works in "Testing" mode

### What Google Reviews:
- **App name and description**
- **Privacy policy and terms of service**
- **Scopes requested** (email, profile)
- **Domain verification**
- **App functionality**

### After Verification Approval:
- ✅ Public users can sign in without warnings
- ✅ No 100-user limit
- ✅ Professional appearance with verified badge
- ✅ No "unverified app" warnings

### If Verification is Rejected:
- Google will provide specific feedback
- You can address the issues and resubmit
- Common issues: missing privacy policy, unclear app purpose

## Troubleshooting During Testing Phase

### Common Error Messages:
1. **"This app isn't verified"** → Expected during testing phase
2. **"Access blocked"** → User needs to be added as test user
3. **"Invalid client"** → Check environment variables are set correctly

## Alternative Approaches During Verification

### Option 1: Manual Subscription Only
- Temporarily disable Google Sign-In button
- Focus on manual email subscription
- Simple and reliable for all users

### Option 2: Test Users Only
- Add specific email addresses as test users
- These users can sign in with Google without issues
- Good for internal testing and key stakeholders

### Option 3: Add Warning Message
- Keep Google Sign-In enabled with user warning
- Inform users about "unverified app" message
- Some users may proceed despite warning

## Quick Fix: Disable Google Sign-In Temporarily

If you want to temporarily disable Google Sign-In while waiting for verification:

```bash
# In your .env file, comment out or remove:
# PUBLIC_GOOGLE_CLIENT_ID=your_client_id
# GOOGLE_CLIENT_ID=your_client_id
# GOOGLE_CLIENT_SECRET=your_secret
```

## Speeding Up Verification Process

### Ensure Your App Meets Requirements:

1. **Privacy Policy**: Make sure `https://iquitostech.com/privacy` is accessible and comprehensive
2. **Clear App Purpose**: Newsletter subscription with Google account convenience
3. **Minimal Scopes**: Only requesting `email` and `profile` (which you are)
4. **Domain Verification**: Verify ownership of `iquitostech.com` in Google Search Console
5. **Complete OAuth Consent Screen**: Fill out all sections thoroughly

### Verification Checklist:
- ✅ OAuth consent screen completely filled out
- ✅ Privacy policy accessible at provided URL
- ✅ Terms of service accessible (if provided)
- ✅ App logo uploaded (recommended)
- ✅ Authorized domains added (`iquitostech.com`)
- ✅ Clear app description explaining newsletter functionality
- ✅ Developer contact information provided

### Monitor Progress:
- Check Google Cloud Console regularly for updates
- Look for any emails from Google regarding verification
- Be ready to respond quickly to any feedback

This will automatically disable the Google Sign-In button and show "Google Sign-In no disponible" instead.

You already have the Google OAuth credentials configured in your `.env` file:
- **Client ID**: Your Google OAuth Client ID
- **Client Secret**: Your Google OAuth Client Secret

## Google Cloud Console Configuration

### 1. OAuth Consent Screen
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Select your project
3. Go to **OAuth consent screen**
4. Configure the following:
   - **Application name**: Iquitos Tech Newsletter
   - **User support email**: Your email
   - **Developer contact information**: Your email
   - **Authorized domains**: `iquitostech.com`
   - **Scopes**: 
     - `email` 
     - `profile`

### 2. OAuth 2.0 Client IDs
1. Go to **Credentials** → **OAuth 2.0 Client IDs**
2. Edit your existing OAuth client
3. Add these **Authorized redirect URIs**:
   - `https://iquitostech.com/newsletter`
   - `http://localhost:4322/newsletter` (for development)
   - `http://localhost:4321/newsletter` (for development)

### 3. Enable APIs
Make sure these APIs are enabled:
- Google+ API (for user info)
- OAuth2 API

## Environment Variables

Create a `.env` file in your project root:

```bash
# Google OAuth Configuration
# Note: PUBLIC_ prefix is required for client-side access
PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# Other required variables
RESEND_API_KEY=your_resend_api_key_here
```

**Important Notes:**
- `PUBLIC_GOOGLE_CLIENT_ID` is used by the frontend JavaScript
- `GOOGLE_CLIENT_ID` is used by the backend API
- `GOOGLE_CLIENT_SECRET` is only used by the backend (never exposed to client)

## How It Works

### Manual Subscription
1. User fills in name and email
2. Form submits to `/api/newsletter-subscribe`
3. Sends welcome email via Resend
4. Shows success message

### Google Sign-In Subscription
1. User clicks "Continue with Google"
2. Google OAuth popup opens
3. User authorizes the app
4. Authorization code is sent to `/api/google-oauth`
5. Server exchanges code for user info
6. Automatically subscribes user with Google account details
7. Sends welcome email via Resend
8. Shows success message with user's email

## API Endpoints

### `/api/newsletter-subscribe` (POST)
Subscribe a user to the newsletter manually.

**Body:**
```json
{
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "source": "manual"
}
```

### `/api/google-oauth` (POST)
Handle Google OAuth callback and subscribe user.

**Body:**
```json
{
  "code": "authorization_code_from_google",
  "redirectUri": "https://iquitostech.com/newsletter"
}
```

## Testing

1. Start development server: `npm run dev`
2. Open `http://localhost:4322/newsletter`
3. Try both manual form and Google Sign-In
4. Check console for debugging info

## Production Deployment

1. Set environment variables in your hosting platform
2. Update authorized redirect URIs in Google Cloud Console
3. Ensure HTTPS is properly configured
4. Test the OAuth flow in production

## Troubleshooting

### Common Issues

1. **OAuth Error**: Check redirect URIs in Google Cloud Console
2. **CORS Issues**: Ensure domain is added to authorized domains
3. **Client ID not found**: Verify environment variables are set
4. **Email not sending**: Check Resend API key configuration

### Debug Information

The implementation includes extensive console logging:
- Google OAuth flow steps
- API responses
- Error messages
- User subscription details

Check browser console and server logs for debugging information.
