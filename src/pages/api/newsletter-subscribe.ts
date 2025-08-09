import type { APIRoute } from 'astro';
import { Resend } from 'resend';

// Configuration from environment variables
const RESEND_API_KEY = import.meta.env.RESEND_API_KEY || process.env.RESEND_API_KEY;

// Initialize Resend
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

interface NewsletterSubscriber {
  email: string;
  firstName?: string;
  lastName?: string;
  source: 'manual' | 'google';
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { email, firstName, lastName, source = 'manual' }: NewsletterSubscriber = body;

    // Validate required fields
    if (!email) {
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
      return new Response(JSON.stringify({
        success: false,
        message: 'El formato del email no es válido.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Log the newsletter subscription
    console.log('📧 New newsletter subscription:', {
      email,
      firstName,
      lastName,
      source,
      timestamp: new Date().toISOString(),
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    });

    if (resend) {
      try {
        // Add subscriber to Resend audience
        // Note: You'll need to create an audience in Resend dashboard first
        // For now, we'll just send a welcome email and log the subscription
        
        // Send welcome email
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
                    <a href="https://iquitostech.com/newsletter?unsubscribe=true">darte de baja aquí</a>
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

Visita nuestro sitio: https://iquitostech.com

Recibirás nuestro primer newsletter muy pronto. Si tienes alguna pregunta, contáctanos en: https://iquitostech.com/contact

---
Para darte de baja: https://iquitostech.com/newsletter?unsubscribe=true
          `.trim()
        });

        if (error) {
          console.error('❌ Resend welcome email error:', error);
        } else {
          console.log('✅ Welcome email sent successfully via Resend:', data);
        }

        // Also send notification to admin
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
            <p><strong>IP:</strong> ${request.headers.get('x-forwarded-for') || 'No disponible'}</p>
          `,
        });
        
      } catch (emailError) {
        console.error('❌ Newsletter email error:', emailError);
        // Don't fail the entire request if email fails
      }
    } else {
      console.warn('⚠️ Resend API key not configured, emails not sent');
    }

    // Return success response
    return new Response(JSON.stringify({
      success: true,
      message: 'Te has suscrito correctamente al newsletter.',
      email: email
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Newsletter subscription error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      message: 'Error interno del servidor. Inténtalo de nuevo más tarde.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
