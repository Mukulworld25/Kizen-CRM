-- Drop and widen status check constraint on leads table
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_status_check CHECK (
  status IN (
    'new', 'contacted', 'pending', 'unpicked', 'follow_up_required',
    'demo_scheduled', 'demo_attended', 'interested', 'negotiation',
    'application_started', 'admitted', 'lost', 'not_interested',
    'future_prospect', 'closed', 'enrolled'
  )
);
