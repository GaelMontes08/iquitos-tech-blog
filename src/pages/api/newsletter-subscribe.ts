import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { NewsletterDB } from '../../lib/newsletter-db.js';
import type { NewsletterSubscriber } from '../../lib/newsletter-db.js';
import { sanitizeEmail, sanitizeName } from '../../lib/content-transformer.js';
import { checkAdvancedRateLimit, createRateLimitResponse, addRateLimitHeaders } from '../../lib/rate-limit.js';
import { getSecureEnv } from '../../lib/env-security.js';

// Secure environment variable loading
const RESEND_API_KEY = getSecureEnv('RESEND_API_KEY', import.meta.env.RESEND_API_KEY || process.env.RESEND_API_KEY);
const RECAPTCHA_SECRET_KEY = getSecureEnv('RECAPTCHA_SECRET_KEY', import.meta.env.RECAPTCHA_SECRET_KEY || process.env.RECAPTCHA_SECRET_KEY);
const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

// Resend audience ID for newsletter subscribers
const RESEND_AUDIENCE_ID = getSecureEnv('RESEND_AUDIENCE_ID', import.meta.env.RESEND_AUDIENCE_ID || process.env.RESEND_AUDIENCE_ID);

// Validate critical API keys at startup
if (!RESEND_API_KEY) {
  console.error('🔒 CRITICAL: RESEND_API_KEY not configured or invalid');
}

if (!RECAPTCHA_SECRET_KEY) {
  console.warn('🔒 WARNING: RECAPTCHA_SECRET_KEY not configured - spam protection disabled');
}

// Initialize Resend securely
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

// Rate limiting configuration
const RATE_LIMIT_ATTEMPTS = 3; // Max attempts per hour
const RATE_LIMIT_HOURS = 1; // Time window in hours

interface NewsletterSubscribeRequest {
  email: string;
  firstName?: string;
  lastName?: string;
  source: 'manual' | 'google';
  googleId?: string;
  recaptchaToken?: string;
}

function getClientIP(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0] || 
         request.headers.get('x-real-ip') || 
         request.headers.get('cf-connecting-ip') || 
         'unknown';
}

function getUserAgent(request: Request): string {
  return request.headers.get('user-agent') || 'unknown';
}

export const POST: APIRoute = async ({ request }) => {
  // Apply rate limiting first
  const rateLimit = checkAdvancedRateLimit(request, 'api');
  
  if (!rateLimit.allowed) {
    console.log(`🚫 Newsletter subscription rate limited: ${rateLimit.reason || 'Rate limit exceeded'}`);
    return createRateLimitResponse(rateLimit.resetTime || Date.now() + 60000);
  }

  const ipAddress = getClientIP(request);
  const userAgent = getUserAgent(request);
  
  try {
    const body = await request.json();
    const { email: rawEmail, firstName: rawFirstName, lastName: rawLastName, source = 'manual', googleId, recaptchaToken }: NewsletterSubscribeRequest = body;

    // Sanitize inputs
    const email = sanitizeEmail(rawEmail || '');
    const firstName = sanitizeName(rawFirstName || '', 50);
    const lastName = sanitizeName(rawLastName || '', 50);

    // Validate required fields
    if (!email) {
      // Log failed attempt
      await NewsletterDB.logAttempt({
        email: email || 'missing',
        ipAddress,
        success: false,
        source,
        errorMessage: 'Email requerido',
        userAgent
      });

      return new Response(JSON.stringify({
        success: false,
        message: 'El email es obligatorio.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      // Log failed attempt
      await NewsletterDB.logAttempt({
        email,
        ipAddress,
        success: false,
        source,
        errorMessage: 'Formato de email inválido',
        userAgent
      });

      return new Response(JSON.stringify({
        success: false,
        message: 'El formato del email no es válido.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate reCAPTCHA for manual subscriptions (Google OAuth doesn't need it)
    if (source === 'manual' && recaptchaToken && RECAPTCHA_SECRET_KEY) {
      try {
        console.log('🔍 Validating reCAPTCHA token...');
        
        const recaptchaResponse = await fetch(RECAPTCHA_VERIFY_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `secret=${RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}&remoteip=${ipAddress}`
        });

        const recaptchaResult = await recaptchaResponse.json();

        if (!recaptchaResult.success) {
          console.log('❌ reCAPTCHA verification failed:', recaptchaResult);
          
          // Log failed attempt
          await NewsletterDB.logAttempt({
            email,
            ipAddress,
            success: false,
            source,
            errorMessage: 'reCAPTCHA verification failed',
            userAgent
          });

          return new Response(JSON.stringify({
            success: false,
            message: 'Verificación de seguridad fallida. Inténtalo de nuevo.'
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        // For reCAPTCHA v3, check the score (0.0 to 1.0, higher is better)
        if (recaptchaResult.score !== undefined) {
          if (recaptchaResult.score < 0.5) {
            console.log('❌ reCAPTCHA score too low:', recaptchaResult.score);
            
            // Log failed attempt
            await NewsletterDB.logAttempt({
              email,
              ipAddress,
              success: false,
              source,
              errorMessage: `reCAPTCHA score too low: ${recaptchaResult.score}`,
              userAgent
            });

            return new Response(JSON.stringify({
              success: false,
              message: 'Verificación de seguridad fallida. Inténtalo de nuevo.'
            }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' }
            });
          }

          // Check if the action matches
          if (recaptchaResult.action && recaptchaResult.action !== 'newsletter_subscribe') {
            console.log('❌ reCAPTCHA action mismatch:', recaptchaResult.action);
            
            // Log failed attempt
            await NewsletterDB.logAttempt({
              email,
              ipAddress,
              success: false,
              source,
              errorMessage: `reCAPTCHA action mismatch: ${recaptchaResult.action}`,
              userAgent
            });

            return new Response(JSON.stringify({
              success: false,
              message: 'Verificación de seguridad fallida. Inténtalo de nuevo.'
            }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' }
            });
          }

          console.log('✅ reCAPTCHA v3 verification successful. Score:', recaptchaResult.score);
        } else {
          console.log('✅ reCAPTCHA v2 verification successful');
        }

      } catch (recaptchaError) {
        console.error('❌ reCAPTCHA validation error:', recaptchaError);
        
        // Log the error but don't fail the request - reCAPTCHA might be temporarily unavailable
        console.warn('⚠️ Proceeding without reCAPTCHA validation due to error');
      }
    } else if (source === 'manual' && !recaptchaToken && RECAPTCHA_SECRET_KEY) {
      console.log('⚠️ reCAPTCHA token missing for manual subscription, but continuing...');
    }

    // Check rate limiting
    const recentAttempts = await NewsletterDB.getRecentAttemptsByIP(ipAddress, RATE_LIMIT_HOURS);
    if (recentAttempts >= RATE_LIMIT_ATTEMPTS) {
      // Log rate limit exceeded
      await NewsletterDB.logAttempt({
        email,
        ipAddress,
        success: false,
        source,
        errorMessage: 'Rate limit exceeded',
        userAgent
      });

      console.log(`🚫 Rate limit exceeded for IP ${ipAddress}: ${recentAttempts} attempts in last ${RATE_LIMIT_HOURS} hour(s)`);
      
      return new Response(JSON.stringify({
        success: false,
        message: 'Demasiados intentos. Inténtalo de nuevo más tarde.'
      }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if email is already subscribed
    const alreadySubscribed = await NewsletterDB.isEmailSubscribed(email);
    if (alreadySubscribed) {
      // Log duplicate attempt
      await NewsletterDB.logAttempt({
        email,
        ipAddress,
        success: false,
        source,
        errorMessage: 'Email ya suscrito',
        userAgent
      });

      return new Response(JSON.stringify({
        success: false,
        message: 'Este email ya está suscrito al newsletter.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Prepare subscriber data
    const subscriberData: NewsletterSubscriber = {
      email: email.toLowerCase().trim(),
      firstName: firstName?.trim(),
      lastName: lastName?.trim(),
      source,
      ipAddress,
      userAgent,
      googleId
    };

    // Add subscriber to database
    const dbResult = await NewsletterDB.addSubscriber(subscriberData);
    
    if (!dbResult.success) {
      // Log database error
      await NewsletterDB.logAttempt({
        email,
        ipAddress,
        success: false,
        source,
        errorMessage: dbResult.error || 'Database error',
        userAgent
      });

      return new Response(JSON.stringify({
        success: false,
        message: dbResult.error || 'Error al suscribirse al newsletter.'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Add subscriber to Resend audience
    if (resend && RESEND_AUDIENCE_ID) {
      try {
        console.log('📋 Adding subscriber to Resend audience...');
        
        const audienceContact = {
          email: email,
          first_name: firstName || '',
          last_name: lastName || '',
          unsubscribed: false
        };

        const { data: audienceData, error: audienceError } = await resend.contacts.create({
          email: audienceContact.email,
          firstName: audienceContact.first_name,
          lastName: audienceContact.last_name,
          unsubscribed: audienceContact.unsubscribed,
          audienceId: RESEND_AUDIENCE_ID,
        });

        if (audienceError) {
          console.error('❌ Error adding to Resend audience:', audienceError);
          // Don't fail the entire request - subscriber is already in database
          console.warn('⚠️ Subscriber added to database but not to Resend audience');
        } else {
          console.log('✅ Subscriber added to Resend audience:', audienceData);
        }

      } catch (audienceError) {
        console.error('❌ Resend audience error:', audienceError);
        // Don't fail the entire request - subscriber is already in database
      }
    } else {
      console.warn('⚠️ Resend API key or audience ID not configured');
    }

    // Log successful attempt
    await NewsletterDB.logAttempt({
      email,
      ipAddress,
      success: true,
      source,
      userAgent
    });

    console.log('✅ Newsletter subscription successful:', {
      email,
      firstName,
      lastName,
      source,
      ipAddress,
      timestamp: new Date().toISOString()
    });

    // Send welcome email using Resend
    if (resend) {
      try {
        // Send welcome email to subscriber
        const { data, error } = await resend.emails.send({
          from: 'Iquitos Tech <newsletter@iquitostech.com>',
          to: [email],
          subject: '🚀 ¡Bienvenido al Newsletter de Iquitos Tech!',
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <title>Bienvenido a Iquitos Tech</title>
              <style>
                body { 
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                  line-height: 1.6; 
                  color: #333; 
                  max-width: 600px; 
                  margin: 0 auto; 
                  padding: 20px; 
                  background-color: #f8f9fa;
                }
                .container { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
                .header { 
                  background: linear-gradient(135deg, #2847d7, #4c6ef5); 
                  color: white; 
                  padding: 40px 20px; 
                  text-align: center; 
                }
                .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
                .content { padding: 40px 30px; }
                .welcome-text { font-size: 18px; margin-bottom: 20px; }
                .features { margin: 30px 0; }
                .feature { display: flex; align-items: center; margin: 15px 0; }
                .feature-icon { width: 24px; height: 24px; margin-right: 12px; }
                .cta-button { 
                  display: inline-block; 
                  background: #2847d7; 
                  color: white; 
                  padding: 12px 24px; 
                  text-decoration: none; 
                  border-radius: 8px; 
                  font-weight: 600; 
                  margin: 20px 0;
                }
                .footer { 
                  background: #f8f9fa; 
                  padding: 20px; 
                  text-align: center; 
                  font-size: 14px; 
                  color: #6c757d; 
                }
                .footer a { color: #2847d7; text-decoration: none; }
                .stats { 
                  background: #e3f2fd; 
                  padding: 15px; 
                  border-radius: 8px; 
                  margin: 20px 0; 
                  text-align: center; 
                  font-size: 14px; 
                  color: #1565c0; 
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🚀 ¡Bienvenido a Iquitos Tech!</h1>
                  <p>Tu fuente de noticias tecnológicas desde la Amazonía</p>
                </div>
                
                <div class="content">
                  <p class="welcome-text">
                    Hola${firstName ? ` ${firstName}` : ''},
                  </p>
                  
                  <p>
                    ¡Gracias por suscribirte a nuestro newsletter! Ahora formas parte de nuestra comunidad tecnológica.
                  </p>
                  
                  <div class="features">
                    <div class="feature">
                      <span class="feature-icon">📱</span>
                      <span>Las últimas noticias de tecnología y gaming</span>
                    </div>
                    <div class="feature">
                      <span class="feature-icon">🌟</span>
                      <span>Análisis exclusivos y recomendaciones</span>
                    </div>
                    <div class="feature">
                      <span class="feature-icon">⚡</span>
                      <span>Contenido fresco cada semana</span>
                    </div>
                    <div class="feature">
                      <span class="feature-icon">🎯</span>
                      <span>Sin spam, solo contenido de calidad</span>
                    </div>
                  </div>
                  
                  <div class="stats">
                    <strong>Suscripción completada el ${new Date().toLocaleDateString('es-ES', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}</strong><br>
                    Fuente: ${source === 'google' ? 'Google Sign-In' : 'Suscripción manual'}
                  </div>
                  
                  <p>
                    Mientras tanto, puedes explorar nuestro sitio web para no perderte nada:
                  </p>
                  
                  <a href="https://iquitostech.com" class="cta-button">
                    Visitar Iquitos Tech
                  </a>
                  
                  <p style="margin-top: 30px; font-size: 14px; color: #6c757d;">
                    Recibirás nuestro primer newsletter muy pronto. Si tienes alguna pregunta, 
                    no dudes en <a href="https://iquitostech.com/contact" style="color: #2847d7;">contactarnos</a>.
                  </p>
                </div>
                
                <div class="footer">
                  <p><strong>Iquitos Tech</strong></p>
                  <p>
                    Si no deseas recibir más emails, puedes 
                    <a href="https://iquitostech.com/newsletter?unsubscribe=${encodeURIComponent(email)}">darte de baja aquí</a>
                  </p>
                  <p style="margin-top: 15px;">
                    <a href="https://iquitostech.com">Sitio Web</a> • 
                    <a href="https://iquitostech.com/privacy">Política de Privacidad</a>
                  </p>
                </div>
              </div>
            </body>
            </html>
          `,
          text: `
¡Bienvenido a Iquitos Tech!

Hola${firstName ? ` ${firstName}` : ''},

¡Gracias por suscribirte a nuestro newsletter! Ahora formas parte de nuestra comunidad tecnológica.

Qué puedes esperar:
📱 Las últimas noticias de tecnología y gaming
🌟 Análisis exclusivos y recomendaciones  
⚡ Contenido fresco cada semana
🎯 Sin spam, solo contenido de calidad

Suscripción completada: ${new Date().toLocaleDateString('es-ES')}
Fuente: ${source === 'google' ? 'Google Sign-In' : 'Suscripción manual'}

Visita nuestro sitio: https://iquitostech.com

Recibirás nuestro primer newsletter muy pronto. Si tienes alguna pregunta, contáctanos en: https://iquitostech.com/contact

Para darte de baja: https://iquitostech.com/newsletter?unsubscribe=${encodeURIComponent(email)}
          `.trim()
        });

        if (error) {
          console.error('❌ Resend welcome email error:', error);
        } else {
          console.log('✅ Welcome email sent successfully via Resend:', data);
        }

        // Send notification to admin
        await resend.emails.send({
          from: 'Iquitos Tech <noreply@iquitostech.com>',
          to: ['admin@iquitostech.com'],
          subject: `📧 Nueva suscripción al newsletter: ${email}`,
          html: `
            <h2>🎉 Nueva suscripción al newsletter</h2>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Nombre:</strong> ${firstName || 'No proporcionado'} ${lastName || ''}</p>
            <p><strong>Fuente:</strong> ${source === 'google' ? 'Google Sign-In' : 'Manual'}</p>
            <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-ES', { timeZone: 'America/Lima' })}</p>
            <p><strong>IP:</strong> ${ipAddress}</p>
            <p><strong>User Agent:</strong> ${userAgent}</p>
            <hr>
            <p><em>Suscripción almacenada en Supabase con protección anti-spam.</em></p>
          `,
        });
        
      } catch (emailError) {
        console.error('❌ Newsletter email error:', emailError);
        // Don't fail the entire request if email fails, just log it
      }
    } else {
      console.warn('⚠️ Resend API key not configured, emails not sent');
    }

    // Return success response with rate limit headers
    const successResponse = new Response(JSON.stringify({
      success: true,
      message: 'Te has suscrito correctamente al newsletter.',
      email: email,
      subscriber: dbResult.data
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

    // Add rate limit headers if available
    if (rateLimit.remaining !== undefined && rateLimit.resetTime) {
      return addRateLimitHeaders(successResponse, rateLimit.remaining, rateLimit.resetTime);
    }

    return successResponse;

  } catch (error) {
    console.error('Newsletter subscription error:', error);
    
    // Log error attempt
    try {
      await NewsletterDB.logAttempt({
        email: 'unknown',
        ipAddress,
        success: false,
        source: 'manual',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        userAgent
      });
    } catch (logError) {
      console.error('Error logging failed attempt:', logError);
    }
    
    return new Response(JSON.stringify({
      success: false,
      message: 'Error interno del servidor. Inténtalo de nuevo más tarde.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
