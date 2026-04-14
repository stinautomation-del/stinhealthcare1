import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ReminderRow = {
  id: string;
  patientPhone: string;
  messageBody: string;
  channel: 'whatsapp' | 'sms' | 'both';
  internalNote?: string | null;
  retryCount?: number | null;
  nextAttemptAt?: string | null;
  lastError?: string | null;
};

type RetryConfigRow = {
  value: unknown;
};

const normalizeCountryCode = (countryCode: string): string => {
  const cleaned = countryCode.replace(/[^\d+]/g, '');
  if (!cleaned) return '+91';
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
};

const toE164 = (phone: string, defaultCountryCode = '+91'): string => {
  const normalizedDefault = normalizeCountryCode(defaultCountryCode);
  const cleaned = phone.replace(/[^\d+]/g, '');

  if (!cleaned) return normalizedDefault;
  if (cleaned.startsWith('+')) {
    const plusDigits = cleaned.slice(1).replace(/\D/g, '');

    // If the value is "+" + 10 digits, it is usually a local number saved with a bad plus prefix.
    // Convert to default country code to avoid invalid Twilio destination errors.
    if (plusDigits.length === 10) {
      return `${normalizedDefault}${plusDigits}`;
    }

    return `+${plusDigits}`;
  }
  if (cleaned.startsWith('00')) return `+${cleaned.slice(2)}`;

  const digitsOnly = cleaned.replace(/\D/g, '');
  if (digitsOnly.length === 10) {
    return `${normalizedDefault}${digitsOnly}`;
  }

  return `+${digitsOnly}`;
};

const toWhatsappAddress = (phone: string, defaultCountryCode = '+91'): string => `whatsapp:${toE164(phone, defaultCountryCode)}`;

const twilioSend = async (
  accountSid: string,
  authUsername: string,
  authPassword: string,
  to: string,
  body: string,
  from?: string,
  messagingServiceSid?: string,
): Promise<{ sid?: string; status?: string }> => {
  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const basicAuth = btoa(`${authUsername}:${authPassword}`);

  const payload = new URLSearchParams({
    To: to,
    Body: body,
  });

  if (messagingServiceSid) {
    payload.set('MessagingServiceSid', messagingServiceSid);
  } else if (from) {
    payload.set('From', from);
  } else {
    throw new Error('Twilio sender is missing. Set TWILIO_SMS_FROM or TWILIO_MESSAGING_SERVICE_SID.');
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: payload,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Twilio API error (${response.status}): ${errorBody}`);
  }

  return (await response.json().catch(() => ({}))) as { sid?: string; status?: string };
};

const computeRetryDelayMinutes = (attemptNumber: number): number => {
  const baseDelay = 5;
  return Math.min(60, baseDelay * (2 ** Math.max(0, attemptNumber - 1)));
};

const parseMaxRetryAttempts = (value: unknown): number => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 3;
  return Math.min(10, parsed);
};


Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { reminderId } = await req.json();
    if (!reminderId || typeof reminderId !== 'string') {
      return new Response(JSON.stringify({ success: false, error: 'Missing reminderId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY');
    const smsProvider = (Deno.env.get('SMS_PROVIDER') || 'twilio').toLowerCase();
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioApiKeySid = Deno.env.get('TWILIO_API_KEY_SID');
    const twilioApiKeySecret = Deno.env.get('TWILIO_API_KEY_SECRET');
    const twilioSmsFrom = Deno.env.get('TWILIO_SMS_FROM');
    const twilioMessagingServiceSid = Deno.env.get('TWILIO_MESSAGING_SERVICE_SID');
    const twilioWhatsappFrom = Deno.env.get('TWILIO_WHATSAPP_FROM');
    const twilioDefaultCountryCode = Deno.env.get('TWILIO_DEFAULT_COUNTRY_CODE') || '+91';

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Supabase function secrets are missing (SUPABASE_URL / SERVICE_ROLE_KEY)');
    }

    if (smsProvider !== 'twilio') {
      throw new Error("Only Twilio is supported. Set SMS_PROVIDER='twilio'.");
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const enableRetryPolicy = (Deno.env.get('ENABLE_RETRY_POLICY') || 'false').toLowerCase() === 'true';

    if (enableRetryPolicy) {

    const { data: retryConfig } = await admin
      .from('system_config')
      .select('value')
      .eq('key', 'notification_retries')
      .maybeSingle<RetryConfigRow>();

    const maxRetryAttempts = parseMaxRetryAttempts(retryConfig?.value);
    const nowIso = new Date().toISOString();
    const claimToken = crypto.randomUUID();

    const { data: reminder, error: readError } = await admin
      .from('nurse_reminders')
      .update({
        deliveryStatus: 'processing',
        lastAttemptAt: nowIso,
        sendAttemptKey: claimToken,
        lastError: null,
      })
      .eq('id', reminderId)
      .in('deliveryStatus', ['pending', 'failed'])
      .or(`nextAttemptAt.is.null,nextAttemptAt.lte.${nowIso}`)
      .select('id, patientPhone, messageBody, channel, internalNote, retryCount, nextAttemptAt, lastError')
      .maybeSingle<ReminderRow>();

    if (readError) {
      throw new Error(readError.message);
    }

    if (!reminder) {
      return new Response(JSON.stringify({ success: true, skipped: true, reminder: null }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const providerMessageSids: string[] = [];
    const smsTargets = reminder.channel === 'sms' || reminder.channel === 'both';
    const whatsappTargets = reminder.channel === 'whatsapp' || reminder.channel === 'both';

    if (smsTargets || whatsappTargets) {
      if (!twilioAccountSid) {
        throw new Error('TWILIO_ACCOUNT_SID is missing');
      }

      if (!twilioAccountSid.startsWith('AC')) {
        throw new Error('TWILIO_ACCOUNT_SID must start with AC. Do not use an SK API key SID here.');
      }

      const hasApiKeyAuth = Boolean(twilioApiKeySid || twilioApiKeySecret);
      let twilioAuthUsername: string;
      let twilioAuthPassword: string;

      if (hasApiKeyAuth) {
        if (!twilioApiKeySid || !twilioApiKeySecret) {
          throw new Error('For API Key auth, set both TWILIO_API_KEY_SID and TWILIO_API_KEY_SECRET');
        }

        if (!twilioApiKeySid.startsWith('SK')) {
          throw new Error('TWILIO_API_KEY_SID must start with SK');
        }

        twilioAuthUsername = twilioApiKeySid;
        twilioAuthPassword = twilioApiKeySecret;
      } else {
        if (!twilioAuthToken) {
          throw new Error('Twilio credentials are missing. Set TWILIO_AUTH_TOKEN, or use TWILIO_API_KEY_SID and TWILIO_API_KEY_SECRET');
        }

        twilioAuthUsername = twilioAccountSid;
        twilioAuthPassword = twilioAuthToken;
      }

      let smsSent = false;
      let whatsappSent = false;
      const channelErrors: string[] = [];

      if (smsTargets) {
        try {
          if (!twilioSmsFrom && !twilioMessagingServiceSid) {
            throw new Error('TWILIO_SMS_FROM or TWILIO_MESSAGING_SERVICE_SID is required for SMS');
          }

          const smsResult = await twilioSend(
            twilioAccountSid,
            twilioAuthUsername,
            twilioAuthPassword,
            toE164(reminder.patientPhone, twilioDefaultCountryCode),
            reminder.messageBody,
            twilioSmsFrom || undefined,
            twilioMessagingServiceSid || undefined,
          );
          if (smsResult.sid) providerMessageSids.push(`sms:${smsResult.sid}`);
          smsSent = true;
        } catch (smsError) {
          const smsMessage = smsError instanceof Error ? smsError.message : 'Unknown SMS send failure';
          channelErrors.push(`sms: ${smsMessage}`);
        }
      }

      if (whatsappTargets) {
        try {
          if (!twilioWhatsappFrom) {
            throw new Error('TWILIO_WHATSAPP_FROM is missing');
          }

          if (!twilioWhatsappFrom.startsWith('whatsapp:')) {
            throw new Error('TWILIO_WHATSAPP_FROM must start with whatsapp:');
          }

          const whatsappResult = await twilioSend(
            twilioAccountSid,
            twilioAuthUsername,
            twilioAuthPassword,
            toWhatsappAddress(reminder.patientPhone, twilioDefaultCountryCode),
            reminder.messageBody,
            twilioWhatsappFrom,
          );
          if (whatsappResult.sid) providerMessageSids.push(`whatsapp:${whatsappResult.sid}`);
          whatsappSent = true;
        } catch (waError) {
          const waMessage = waError instanceof Error ? waError.message : 'Unknown WhatsApp send failure';
          channelErrors.push(`whatsapp: ${waMessage}`);
        }
      }

      const existingNote = reminder.internalNote?.trim();
      const notePrefix = existingNote ? `${existingNote} | ` : '';

      if (channelErrors.length > 0 && (smsSent || whatsappSent)) {
        // Partial success: avoid duplicate retries by marking as sent, keep error note for audit/debug.
        const { data: updatedReminder, error: partialUpdateError } = await admin
          .from('nurse_reminders')
          .update({
            sentAt: nowIso,
            deliveryStatus: 'sent',
            retryCount: 0,
            nextAttemptAt: null,
            lastError: null,
            providerMessageSid: providerMessageSids.join(', ') || null,
            internalNote: `${notePrefix}Partial delivery: ${channelErrors.join('; ')}`,
          })
          .eq('id', reminder.id)
          .select('*')
          .single();

        if (partialUpdateError) {
          throw new Error(partialUpdateError.message);
        }

        return new Response(JSON.stringify({ success: true, reminder: updatedReminder, warning: 'Partial delivery' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (channelErrors.length > 0) {
        const attemptNumber = (reminder.retryCount ?? 0) + 1;
        const shouldRetry = attemptNumber < maxRetryAttempts;
        const nextAttemptAt = shouldRetry
          ? new Date(Date.now() + computeRetryDelayMinutes(attemptNumber) * 60_000).toISOString()
          : null;

        await admin
          .from('nurse_reminders')
          .update({
            deliveryStatus: 'failed',
            retryCount: attemptNumber,
            nextAttemptAt,
            lastError: channelErrors.join('; '),
            internalNote: `${notePrefix}Delivery failed: ${channelErrors.join('; ')}`,
          })
          .eq('id', reminder.id);

        throw new Error(channelErrors.join('; '));
      }
    }

    const { data: updatedReminder, error: updateError } = await admin
      .from('nurse_reminders')
      .update({
        sentAt: nowIso,
        deliveryStatus: 'sent',
        retryCount: 0,
        providerMessageSid: providerMessageSids.join(', ') || null,
        lastError: null,
        nextAttemptAt: null,
      })
      .eq('id', reminder.id)
      .select('*')
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    return new Response(JSON.stringify({ success: true, reminder: updatedReminder }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    }

    const { data: legacyReminder, error: legacyReadError } = await admin
      .from('nurse_reminders')
      .select('id, patientPhone, messageBody, channel')
      .eq('id', reminderId)
      .single<ReminderRow>();

    if (legacyReadError || !legacyReminder) {
      throw new Error(legacyReadError?.message || 'Reminder not found');
    }

    const legacySmsTargets = legacyReminder.channel === 'sms' || legacyReminder.channel === 'both';
    const legacyWhatsappTargets = legacyReminder.channel === 'whatsapp' || legacyReminder.channel === 'both';

    if (legacySmsTargets || legacyWhatsappTargets) {
      if (!twilioAccountSid) {
        throw new Error('TWILIO_ACCOUNT_SID is missing');
      }

      if (!twilioAccountSid.startsWith('AC')) {
        throw new Error('TWILIO_ACCOUNT_SID must start with AC. Do not use an SK API key SID here.');
      }

      const hasApiKeyAuth = Boolean(twilioApiKeySid || twilioApiKeySecret);
      let twilioAuthUsername: string;
      let twilioAuthPassword: string;

      if (hasApiKeyAuth) {
        if (!twilioApiKeySid || !twilioApiKeySecret) {
          throw new Error('For API Key auth, set both TWILIO_API_KEY_SID and TWILIO_API_KEY_SECRET');
        }

        if (!twilioApiKeySid.startsWith('SK')) {
          throw new Error('TWILIO_API_KEY_SID must start with SK');
        }

        twilioAuthUsername = twilioApiKeySid;
        twilioAuthPassword = twilioApiKeySecret;
      } else {
        if (!twilioAuthToken) {
          throw new Error('Twilio credentials are missing. Set TWILIO_AUTH_TOKEN, or use TWILIO_API_KEY_SID and TWILIO_API_KEY_SECRET');
        }

        twilioAuthUsername = twilioAccountSid;
        twilioAuthPassword = twilioAuthToken;
      }

      const legacyErrors: string[] = [];

      if (legacySmsTargets) {
        try {
          if (!twilioSmsFrom && !twilioMessagingServiceSid) {
            throw new Error('TWILIO_SMS_FROM or TWILIO_MESSAGING_SERVICE_SID is required for SMS');
          }

          await twilioSend(
            twilioAccountSid,
            twilioAuthUsername,
            twilioAuthPassword,
            toE164(legacyReminder.patientPhone, twilioDefaultCountryCode),
            legacyReminder.messageBody,
            twilioSmsFrom || undefined,
            twilioMessagingServiceSid || undefined,
          );
        } catch (legacySmsError) {
          const smsMessage = legacySmsError instanceof Error ? legacySmsError.message : 'Unknown SMS send failure';
          legacyErrors.push(`sms: ${smsMessage}`);
        }
      }

      if (legacyWhatsappTargets) {
        try {
          if (!twilioWhatsappFrom) {
            throw new Error('TWILIO_WHATSAPP_FROM is missing');
          }

          if (!twilioWhatsappFrom.startsWith('whatsapp:')) {
            throw new Error('TWILIO_WHATSAPP_FROM must start with whatsapp:');
          }

          await twilioSend(
            twilioAccountSid,
            twilioAuthUsername,
            twilioAuthPassword,
            toWhatsappAddress(legacyReminder.patientPhone, twilioDefaultCountryCode),
            legacyReminder.messageBody,
            twilioWhatsappFrom,
          );
        } catch (legacyWaError) {
          const waMessage = legacyWaError instanceof Error ? legacyWaError.message : 'Unknown WhatsApp send failure';
          legacyErrors.push(`whatsapp: ${waMessage}`);
        }
      }

      if (legacyErrors.length > 0) {
        await admin
          .from('nurse_reminders')
          .update({
            deliveryStatus: 'failed',
            lastError: legacyErrors.join('; '),
            internalNote: `Delivery failed: ${legacyErrors.join('; ')}`,
          })
          .eq('id', legacyReminder.id);

        throw new Error(legacyErrors.join('; '));
      }
    }

    const { data: legacyUpdatedReminder, error: legacyUpdateError } = await admin
      .from('nurse_reminders')
      .update({
        sentAt: new Date().toISOString(),
        deliveryStatus: 'sent',
      })
      .eq('id', legacyReminder.id)
      .select('*')
      .single();

    if (legacyUpdateError) {
      throw new Error(legacyUpdateError.message);
    }

    return new Response(JSON.stringify({ success: true, reminder: legacyUpdatedReminder }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error while sending reminder';

    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
