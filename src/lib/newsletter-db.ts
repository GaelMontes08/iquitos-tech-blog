import { supabase } from './supabase.js';

export interface NewsletterSubscriber {
  id?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  source: 'manual' | 'google';
  confirmed?: boolean;
  confirmationToken?: string;
  subscribedAt?: string;
  confirmedAt?: string;
  ipAddress?: string;
  userAgent?: string;
  googleId?: string;
  unsubscribed?: boolean;
  unsubscribedAt?: string;
}

export interface SubscriptionAttempt {
  id?: string;
  email: string;
  ipAddress: string;
  attemptedAt?: string;
  success: boolean;
  source: 'manual' | 'google';
  errorMessage?: string;
  userAgent?: string;
}

export interface NewsletterStats {
  totalSubscribers: number;
  confirmedSubscribers: number;
  manualSubscribers: number;
  googleSubscribers: number;
  subscribersLastWeek: number;
  subscribersLastMonth: number;
}

export class NewsletterDB {

  static async isEmailSubscribed(email: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('email_already_subscribed', {
        email_addr: email.toLowerCase().trim()
      });

      if (error) {
        console.error('Error checking email subscription:', error);
        return false;
      }

      return data || false;
    } catch (error) {
      console.error('Error in isEmailSubscribed:', error);
      return false;
    }
  }

  static async getRecentAttemptsByIP(ipAddress: string, hoursBack: number = 1): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('get_recent_attempts_by_ip', {
        ip_addr: ipAddress,
        hours_back: hoursBack
      });

      if (error) {
        console.error('Error getting recent attempts:', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      console.error('Error in getRecentAttemptsByIP:', error);
      return 0;
    }
  }

  static async addSubscriber(subscriber: NewsletterSubscriber): Promise<{ success: boolean; data?: NewsletterSubscriber; error?: string }> {
    try {
      const cleanEmail = subscriber.email.toLowerCase().trim();
      
      const alreadySubscribed = await this.isEmailSubscribed(cleanEmail);
      if (alreadySubscribed) {
        return {
          success: false,
          error: 'Este email ya está suscrito al newsletter.'
        };
      }

      const { data, error } = await supabase
        .from('newsletter_subscribers')
        .insert({
          email: cleanEmail,
          first_name: subscriber.firstName?.trim(),
          last_name: subscriber.lastName?.trim(),
          source: subscriber.source,
          ip_address: subscriber.ipAddress,
          user_agent: subscriber.userAgent,
          google_id: subscriber.googleId,
          confirmation_token: subscriber.confirmationToken
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding subscriber:', error);
        return {
          success: false,
          error: 'Error al suscribirse al newsletter.'
        };
      }

      return {
        success: true,
        data: {
          id: data.id,
          email: data.email,
          firstName: data.first_name,
          lastName: data.last_name,
          source: data.source,
          confirmed: data.confirmed,
          subscribedAt: data.subscribed_at
        }
      };

    } catch (error) {
      console.error('Error in addSubscriber:', error);
      return {
        success: false,
        error: 'Error interno del servidor.'
      };
    }
  }

  static async logAttempt(attempt: SubscriptionAttempt): Promise<void> {
    try {
      await supabase
        .from('subscription_attempts')
        .insert({
          email: attempt.email.toLowerCase().trim(),
          ip_address: attempt.ipAddress,
          success: attempt.success,
          source: attempt.source,
          error_message: attempt.errorMessage,
          user_agent: attempt.userAgent
        });
    } catch (error) {
      console.error('Error logging subscription attempt:', error);
    }
  }

  static async getStats(): Promise<NewsletterStats | null> {
    try {
      const { data, error } = await supabase
        .from('newsletter_stats')
        .select('*')
        .single();

      if (error) {
        console.error('Error getting newsletter stats:', error);
        return null;
      }

      return {
        totalSubscribers: data.total_subscribers || 0,
        confirmedSubscribers: data.confirmed_subscribers || 0,
        manualSubscribers: data.manual_subscribers || 0,
        googleSubscribers: data.google_subscribers || 0,
        subscribersLastWeek: data.subscribers_last_week || 0,
        subscribersLastMonth: data.subscribers_last_month || 0
      };

    } catch (error) {
      console.error('Error in getStats:', error);
      return null;
    }
  }

  static async confirmSubscription(token: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('newsletter_subscribers')
        .update({
          confirmed: true,
          confirmed_at: new Date().toISOString(),
          confirmation_token: null
        })
        .eq('confirmation_token', token)
        .eq('confirmed', false)
        .select()
        .single();

      if (error || !data) {
        return {
          success: false,
          error: 'Token de confirmación inválido o expirado.'
        };
      }

      return { success: true };

    } catch (error) {
      console.error('Error confirming subscription:', error);
      return {
        success: false,
        error: 'Error al confirmar la suscripción.'
      };
    }
  }

  static async unsubscribe(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('newsletter_subscribers')
        .update({
          unsubscribed: true,
          unsubscribed_at: new Date().toISOString()
        })
        .eq('email', email.toLowerCase().trim())
        .eq('unsubscribed', false)
        .select()
        .single();

      if (error || !data) {
        return {
          success: false,
          error: 'Email no encontrado o ya dado de baja.'
        };
      }

      return { success: true };

    } catch (error) {
      console.error('Error unsubscribing:', error);
      return {
        success: false,
        error: 'Error al darse de baja del newsletter.'
      };
    }
  }
}
