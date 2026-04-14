import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type DueReminder = {
  id: string;
};

const extractInvokeError = async (error: unknown): Promise<string> => {
  if (!error || typeof error !== 'object') {
    return 'Unknown send failure';
  }

  const maybeError = error as {
    message?: string;
    context?: {
      status?: number;
      statusText?: string;
      clone?: () => { text: () => Promise<string> };
      text?: () => Promise<string>;
    };
  };

  const base = maybeError.message || 'Unknown send failure';
  const context = maybeError.context;

  if (!context) return base;

  try {
    const responseText = context.clone
      ? await context.clone().text()
      : context.text
        ? await context.text()
        : '';

    const statusPart = context.status ? `HTTP ${context.status}` : 'HTTP error';
    const statusTextPart = context.statusText ? ` ${context.statusText}` : '';
    const payloadPart = responseText ? ` | ${responseText}` : '';
    return `${statusPart}${statusTextPart}${payloadPart}`;
  } catch {
    return base;
  }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const requestedLimit = Number(body?.limit ?? 50);
    const limit = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(200, requestedLimit))
      : 50;

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY');
    const invokeJwt =
      Deno.env.get('FUNCTIONS_INVOKE_JWT') ||
      Deno.env.get('VITE_SUPABASE_ANON_KEY') ||
      Deno.env.get('VITE_SUPABASE_PUBLISHABLE_KEY');
    const enableRetryPolicy = (Deno.env.get('ENABLE_RETRY_POLICY') || 'false').toLowerCase() === 'true';

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Supabase function secrets are missing (SUPABASE_URL / SERVICE_ROLE_KEY)');
    }

    if (!invokeJwt) {
      throw new Error('FUNCTIONS_INVOKE_JWT is missing for internal function invocation');
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const invokeClient = createClient(supabaseUrl, invokeJwt);

    const nowIso = new Date().toISOString();
    const dueReminders = enableRetryPolicy
      ? await Promise.all([
          admin
            .from('nurse_reminders')
            .select('id')
            .eq('deliveryStatus', 'pending')
            .lte('scheduledAt', nowIso)
            .order('scheduledAt', { ascending: true })
            .limit(limit)
            .returns<DueReminder[]>(),
          admin
            .from('nurse_reminders')
            .select('id')
            .eq('deliveryStatus', 'failed')
            .lte('scheduledAt', nowIso)
            .not('nextAttemptAt', 'is', null)
            .lte('nextAttemptAt', nowIso)
            .order('scheduledAt', { ascending: true })
            .limit(limit)
            .returns<DueReminder[]>(),
        ]).then(([pendingResult, retryResult]) => {
          if (pendingResult.error) {
            throw new Error(pendingResult.error.message);
          }

          if (retryResult.error) {
            throw new Error(retryResult.error.message);
          }

          return [...(pendingResult.data ?? []), ...(retryResult.data ?? [])]
            .filter((reminder, index, all) => all.findIndex((item) => item.id === reminder.id) === index)
            .slice(0, limit);
        })
      : await admin
          .from('nurse_reminders')
          .select('id')
          .eq('deliveryStatus', 'pending')
          .lte('scheduledAt', nowIso)
          .order('scheduledAt', { ascending: true })
          .limit(limit)
          .returns<DueReminder[]>()
          .then((pendingResult) => {
            if (pendingResult.error) {
              throw new Error(pendingResult.error.message);
            }

            return pendingResult.data ?? [];
          });

    const failures: Array<{ id: string; error: string }> = [];
    let sent = 0;

    for (const reminder of dueReminders ?? []) {
      const { data, error } = await invokeClient.functions.invoke('send-patient-reminder', {
        body: { reminderId: reminder.id },
      });

      if (error || !data?.success) {
        const invokeErrorMessage = error ? await extractInvokeError(error) : undefined;
        failures.push({
          id: reminder.id,
          error: invokeErrorMessage || data?.error || 'Unknown send failure',
        });
        continue;
      }

      sent += 1;
    }

    return new Response(
      JSON.stringify({
        success: true,
        scanned: dueReminders?.length ?? 0,
        sent,
        failed: failures.length,
        failures,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown cron processing error';

    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
