import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { supabase } from '../../lib/supabase.js';

// Configuration from environment variables
const RECAPTCHA_SECRET_KEY = import.meta.env.RECAPTCHA_SECRET_KEY || process.env.RECAPTCHA_SECRET_KEY;
const RESEND_API_KEY = import.meta.env.RESEND_API_KEY || process.env.RESEND_API_KEY;
const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

// Initialize Resend
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

// Rate limiting configuration - 1 contact per day
const RATE_LIMIT_ATTEMPTS = 1;
const RATE_LIMIT_HOURS = 24;

interface ContactAttempt {
  email: string;
  ipAddress: string;
  name?: string;
  messagePreview?: string;
  success: boolean;
  errorMessage?: string;
  userAgent?: string;
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

async function checkContactRateLimit(ipAddress: string): Promise<number> {
  try {
    console.log(`🔍 Checking rate limit for IP: ${ipAddress}, time window: ${RATE_LIMIT_HOURS} hours`);

    // Try RPC function first (preferred method)
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_recent_contact_attempts_by_ip', {
      ip_addr: ipAddress,
      hours_back: RATE_LIMIT_HOURS
    });

    if (!rpcError) {
      const attemptCount = rpcData || 0;
      console.log(`📊 Found ${attemptCount} recent attempts for IP ${ipAddress} (via RPC)`);
      return attemptCount;
    }

    console.warn('⚠️ RPC function failed, trying direct query:', rpcError.message);

    // Fallback to direct query
    const hoursAgo = new Date();
    hoursAgo.setHours(hoursAgo.getHours() - RATE_LIMIT_HOURS);

    const { data: directData, error: directError } = await supabase
      .from('contact_attempts')
      .select('id')
      .eq('ip_address', ipAddress)
      .gte('attempted_at', hoursAgo.toISOString());

    if (directError) {
      console.error('❌ Both RPC and direct query failed:', directError);
      console.error('Please run the SQL script: supabase-contact-table.sql');
      // Return 999 to indicate error - this will trigger rate limiting as a safety measure
      return 999;
    }

    const attemptCount = directData?.length || 0;
    console.log(`📊 Found ${attemptCount} recent attempts for IP ${ipAddress} (via direct query)`);
    return attemptCount;
  } catch (error) {
    console.error('❌ Rate limit check exception:', error);
    // Return 999 to indicate error - this will trigger rate limiting as a safety measure
    return 999;
  }
}

async function logContactAttempt(attempt: ContactAttempt): Promise<boolean> {
  try {
    console.log(`📝 Logging contact attempt: ${attempt.email}, success: ${attempt.success}, IP: ${attempt.ipAddress}`);
    
    // Use RPC function like newsletter system (bypasses RLS)
    const { data, error } = await supabase.rpc('log_contact_attempt', {
      user_name: attempt.name || '',
      user_email: attempt.email.toLowerCase().trim(),
      user_message: attempt.messagePreview || '',
      ip_addr: attempt.ipAddress,
      user_agent_param: attempt.userAgent || null,
      attempt_success: attempt.success,
      error_msg: attempt.errorMessage || null
    });

    if (error) {
      console.error('❌ Error logging contact attempt via RPC:', error);
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return false;
    } else {
      console.log(`✅ Contact attempt logged successfully via RPC. Result: ${data}`);
      return true;
    }
  } catch (error) {
    console.error('❌ Exception logging contact attempt:', error);
    return false;
  }
}

export const POST: APIRoute = async ({ request }) => {
  const ipAddress = getClientIP(request);
  const userAgent = getUserAgent(request);
  
  console.log(`📞 New contact form submission from IP: ${ipAddress}`);
  
  // Check if Supabase is configured
  if (!supabase) {
    console.error('❌ Supabase client not configured');
    return new Response(JSON.stringify({
      success: false,
      message: 'Error de configuración del servidor. Inténtalo de nuevo más tarde.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    // Parse form data
    const formData = await request.formData();
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const subject = formData.get('subject') as string;
    const message = formData.get('message') as string;
    const recaptchaResponse = formData.get('g-recaptcha-response') as string;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      await logContactAttempt({
        email: email || 'missing',
        ipAddress,
        name,
        messagePreview: message?.substring(0, 100),
        success: false,
        errorMessage: 'Campos obligatorios faltantes',
        userAgent
      });

      return new Response(JSON.stringify({
        success: false,
        message: 'Todos los campos son obligatorios.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      await logContactAttempt({
        email,
        ipAddress,
        name,
        messagePreview: message.substring(0, 100),
        success: false,
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

    // Check rate limiting - 1 contact per day
    const recentAttempts = await checkContactRateLimit(ipAddress);
    if (recentAttempts >= RATE_LIMIT_ATTEMPTS) {
      await logContactAttempt({
        email,
        ipAddress,
        name,
        messagePreview: message.substring(0, 100),
        success: false,
        errorMessage: 'Rate limit exceeded',
        userAgent
      });

      console.log(`🚫 Contact rate limit exceeded for IP ${ipAddress}: ${recentAttempts} attempts in last ${RATE_LIMIT_HOURS} hours`);
      
      return new Response(JSON.stringify({
        success: false,
        message: 'Solo puedes enviar un mensaje por día. Inténtalo mañana.'
      }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify reCAPTCHA
    if (!recaptchaResponse) {
      await logContactAttempt({
        email,
        ipAddress,
        name,
        messagePreview: message.substring(0, 100),
        success: false,
        errorMessage: 'reCAPTCHA token missing',
        userAgent
      });

      return new Response(JSON.stringify({
        success: false,
        message: 'Por favor, completa el reCAPTCHA.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify reCAPTCHA with Google
    const recaptchaVerification = await fetch(RECAPTCHA_VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `secret=${RECAPTCHA_SECRET_KEY}&response=${recaptchaResponse}&remoteip=${ipAddress}`
    });

    const recaptchaResult = await recaptchaVerification.json();

    if (!recaptchaResult.success) {
      console.log('reCAPTCHA verification failed:', recaptchaResult);
      
      await logContactAttempt({
        email,
        ipAddress,
        name,
        messagePreview: message.substring(0, 100),
        success: false,
        errorMessage: 'reCAPTCHA verification failed',
        userAgent
      });

      return new Response(JSON.stringify({
        success: false,
        message: 'Verificación reCAPTCHA fallida. Inténtalo de nuevo.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // For reCAPTCHA v3, check the score (0.0 to 1.0, higher is better)
    if (recaptchaResult.score !== undefined) {
      if (recaptchaResult.score < 0.5) {
        console.log('reCAPTCHA score too low:', recaptchaResult.score);
        
        await logContactAttempt({
          email,
          ipAddress,
          name,
          messagePreview: message.substring(0, 100),
          success: false,
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
      
      // Also check if the action matches
      if (recaptchaResult.action && recaptchaResult.action !== 'contact_form') {
        console.log('reCAPTCHA action mismatch:', recaptchaResult.action);
        
        await logContactAttempt({
          email,
          ipAddress,
          name,
          messagePreview: message.substring(0, 100),
          success: false,
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
      
      console.log('reCAPTCHA v3 verification successful. Score:', recaptchaResult.score);
    }

    // Log the contact form submission
    console.log('📧 New contact form submission:', {
      name,
      email,
      subject,
      message,
      timestamp: new Date().toISOString(),
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    });

    // Send email using Resend
    if (resend) {
      try {
        const { data, error } = await resend.emails.send({
          from: 'Iquitos Tech <noreply@iquitostech.com>',
          to: ['contact@iquitostech.com'],
          replyTo: email,
          subject: `[Iquitos Tech] Nuevo mensaje de contacto: ${subject}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <title>Nuevo mensaje de contacto</title>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #2847d7, #4c6ef5); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
                .content { background: #f8f9fa; padding: 20px; border: 1px solid #e9ecef; }
                .field { margin-bottom: 15px; }
                .label { font-weight: bold; color: #495057; display: block; margin-bottom: 5px; }
                .value { background: white; padding: 10px; border-radius: 4px; border: 1px solid #dee2e6; }
                .message-content { min-height: 100px; }
                .footer { background: #e9ecef; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; color: #6c757d; }
                .timestamp { color: #6c757d; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>🚀 Nuevo mensaje de contacto</h1>
                <p>Recibido desde el formulario de contacto de Iquitos Tech</p>
              </div>
              
              <div class="content">
                <div class="field">
                  <span class="label">👤 Nombre:</span>
                  <div class="value">${name}</div>
                </div>
                
                <div class="field">
                  <span class="label">📧 Email:</span>
                  <div class="value">${email}</div>
                </div>
                
                <div class="field">
                  <span class="label">📋 Asunto:</span>
                  <div class="value">${subject}</div>
                </div>
                
                <div class="field">
                  <span class="label">💬 Mensaje:</span>
                  <div class="value message-content">${message.replace(/\n/g, '<br>')}</div>
                </div>
                
                <div class="field">
                  <span class="label">⏰ Fecha y hora:</span>
                  <div class="value timestamp">${new Date().toLocaleString('es-ES', { 
                    timeZone: 'America/Lima',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</div>
                </div>
                
                <div class="field">
                  <span class="label">🌐 IP:</span>
                  <div class="value timestamp">${request.headers.get('x-forwarded-for') || 'No disponible'}</div>
                </div>
              </div>
              
              <div class="footer">
                <p><strong>Iquitos Tech</strong> - Sistema de contacto automático</p>
                <p>Para responder, simplemente haz reply a este email.</p>
              </div>
            </body>
            </html>
          `,
          text: `
Nuevo mensaje de contacto desde Iquitos Tech

Nombre: ${name}
Email: ${email}
Asunto: ${subject}

Mensaje:
${message}

Fecha: ${new Date().toLocaleString('es-ES', { timeZone: 'America/Lima' })}
IP: ${request.headers.get('x-forwarded-for') || 'No disponible'}

---
Para responder, simplemente responde a este email.
          `.trim()
        });

        if (error) {
          console.error('❌ Resend email error:', error);
        } else {
          console.log('✅ Email sent successfully via Resend:', data);
        }
        
      } catch (emailError) {
        console.error('❌ Resend email error:', emailError);
        // Don't fail the entire request if email fails, just log it
      }
    } else {
      console.warn('⚠️ Resend API key not configured, email not sent');
    }

    // Log successful contact attempt
    await logContactAttempt({
      email,
      ipAddress,
      name,
      messagePreview: message.substring(0, 100),
      success: true,
      userAgent
    });

    // Return success response
    return new Response(JSON.stringify({
      success: true,
      message: 'Mensaje enviado correctamente. Te responderemos pronto.'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Contact form error:', error);
    
    // Log error attempt
    try {
      await logContactAttempt({
        email: 'unknown',
        ipAddress,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        userAgent
      });
    } catch (logError) {
      console.error('Error logging failed contact attempt:', logError);
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
