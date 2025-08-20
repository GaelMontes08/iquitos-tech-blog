import type { APIRoute } from 'astro';
import { getSecureEnv } from '../../lib/env-security.js';

const GOOGLE_CLIENT_ID = getSecureEnv('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = getSecureEnv('GOOGLE_CLIENT_SECRET');

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.error('🔒 CRITICAL: Google OAuth credentials not configured properly');
}

interface GoogleTokenResponse {
  access_token: string;
  id_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  refresh_token?: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.error('❌ Google OAuth credentials not properly configured');
      return new Response(JSON.stringify({
        success: false,
        message: 'El servicio de Google OAuth no está disponible temporalmente. Por favor, usa el formulario manual.',
        errorCode: 'OAUTH_NOT_CONFIGURED'
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const { code, redirectUri } = body;

    if (!code) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Código de autorización requerido.',
        errorCode: 'MISSING_AUTH_CODE'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Google token exchange failed:', error);
      return new Response(JSON.stringify({
        success: false,
        message: 'Error al autenticar con Google.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const tokenData: GoogleTokenResponse = await tokenResponse.json();

    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userResponse.ok) {
      console.error('Failed to get user info from Google');
      return new Response(JSON.stringify({
        success: false,
        message: 'Error al obtener información del usuario.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userData: GoogleUserInfo = await userResponse.json();

    if (!userData.verified_email) {
      return new Response(JSON.stringify({
        success: false,
        message: 'El email de Google no está verificado.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Google OAuth successful for:', userData.email);

    try {
      const subscribeResponse = await fetch(`${new URL(request.url).origin}/api/newsletter-subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': request.headers.get('x-forwarded-for') || '',
          'user-agent': request.headers.get('user-agent') || ''
        },
        body: JSON.stringify({
          email: userData.email,
          firstName: userData.given_name,
          lastName: userData.family_name,
          source: 'google',
          googleId: userData.id
        }),
      });

      const subscribeResult = await subscribeResponse.json();

      if (!subscribeResult.success) {
        console.error('Newsletter subscription failed:', subscribeResult.message);
        return new Response(JSON.stringify({
          success: false,
          message: subscribeResult.message
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        success: true,
        message: '¡Te has suscrito correctamente al newsletter!',
        user: {
          email: userData.email,
          name: userData.name,
          firstName: userData.given_name,
          lastName: userData.family_name,
          picture: userData.picture
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (subscribeError) {
      console.error('Newsletter subscription error:', subscribeError);
      return new Response(JSON.stringify({
        success: false,
        message: 'Error al suscribirse al newsletter.'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Google OAuth error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      message: 'Error interno del servidor. Inténtalo de nuevo más tarde.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
