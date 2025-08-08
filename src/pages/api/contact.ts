import type { APIRoute } from 'astro';

// reCAPTCHA configuration - using environment variables for security
const RECAPTCHA_SECRET_KEY = import.meta.env.RECAPTCHA_SECRET_KEY || process.env.RECAPTCHA_SECRET_KEY;
const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

export const POST: APIRoute = async ({ request }) => {
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
      return new Response(JSON.stringify({
        success: false,
        message: 'El formato del email no es válido.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify reCAPTCHA
    if (!recaptchaResponse) {
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
      body: `secret=${RECAPTCHA_SECRET_KEY}&response=${recaptchaResponse}`
    });

    const recaptchaResult = await recaptchaVerification.json();

    if (!recaptchaResult.success) {
      console.log('reCAPTCHA verification failed:', recaptchaResult);
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

    // Log the contact form submission (you can replace this with email sending, database storage, etc.)
    console.log('📧 New contact form submission:', {
      name,
      email,
      subject,
      message,
      timestamp: new Date().toISOString(),
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    });

    // Here you can add your email sending logic
    // For example, using a service like SendGrid, Nodemailer, etc.
    
    // Example with a webhook service (replace with your preferred method):
    /*
    try {
      await fetch('YOUR_WEBHOOK_URL', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          subject,
          message,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Error sending webhook:', error);
    }
    */

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
    
    return new Response(JSON.stringify({
      success: false,
      message: 'Error interno del servidor. Inténtalo de nuevo más tarde.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
