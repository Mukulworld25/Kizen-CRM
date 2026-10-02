-- Migration 033: Add routing fields to notifications and update deletion request notification trigger

-- 1. Add record_id and record_type columns to notifications table
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS record_id text;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS record_type text;

-- 2. Update request_deletion RPC to notify owners and store exact routing fields
CREATE OR REPLACE FUNCTION public.request_deletion(
  p_table_name text,
  p_record_id uuid,
  p_requested_by uuid,
  p_record_label text DEFAULT NULL::text,
  p_reason text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
declare
  v_id uuid;
  v_owner record;
begin
  insert into public.deletion_requests (table_name, record_id, record_label, requested_by, reason)
  values (p_table_name, p_record_id, p_record_label, p_requested_by, p_reason)
  returning id into v_id;

  -- Notify all owners of the new deletion request
  for v_owner in
    select id from public.users where role = 'owner' or is_owner = true
  loop
    insert into public.notifications (
      user_id,
      title,
      message,
      type,
      link,
      record_id,
      record_type,
      is_read
    ) values (
      v_owner.id,
      'Deletion Request Pending',
      'Deletion requested for ' || coalesce(p_record_label, p_table_name) || coalesce(': ' || p_reason, ''),
      'deletion_request',
      '/settings?tab=deletions&highlight=' || v_id::text,
      v_id::text,
      'deletion_request',
      false
    );
  end loop;

  return v_id;
end;
$function$;

-- 3. Backfill existing notifications with exact record_id, record_type, and deep link
-- Backfill fee_overdue notifications:
UPDATE public.notifications n
SET 
  record_id = s.id::text,
  record_type = 'student_fee',
  link = '/students/' || s.id || '?tab=fees'
FROM (
  SELECT DISTINCT ON (n2.id) n2.id as notif_id, st.id as id
  FROM public.notifications n2
  JOIN public.students st ON n2.title LIKE 'Fee Overdue: ' || st.full_name || '%'
  WHERE n2.type = 'fee_overdue'
  ORDER BY n2.id, st.created_at DESC
) s
WHERE n.id = s.notif_id;

-- Backfill followup notifications:
UPDATE public.notifications n
SET 
  record_id = l.id::text,
  record_type = 'lead',
  link = '/leads/' || l.id
FROM (
  SELECT DISTINCT ON (n2.id) n2.id as notif_id, ld.id as id
  FROM public.notifications n2
  JOIN public.leads ld ON n2.title LIKE 'Follow-up Due: ' || ld.full_name || '%'
  WHERE n2.type = 'followup'
  ORDER BY n2.id, ld.created_at DESC
) l
WHERE n.id = l.notif_id;
