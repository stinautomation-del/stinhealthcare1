-- Find reminders that will not send on time or have incomplete timing data.
-- Run this in Supabase SQL Editor.

select
  id,
  "patientName",
  "nurseName",
  "scheduledAt",
  "deliveryStatus",
  "sentAt",
  "retryCount",
  "nextAttemptAt",
  "lastError",
  "internalNote",
  "createdAt"
from nurse_reminders
where
  "scheduledAt" is null
  or "scheduledAt" < now() - interval '1 day'
  or (
    "deliveryStatus" = 'pending'
    and "scheduledAt" < now() - interval '10 minutes'
  )
  or (
    "deliveryStatus" = 'failed'
    and ("nextAttemptAt" is null or "nextAttemptAt" > now())
  )
order by coalesce("scheduledAt", "createdAt") desc;
