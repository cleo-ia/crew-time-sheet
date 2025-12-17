-- Backfill user_activity_logs from signatures (proof of login + activity)
INSERT INTO user_activity_logs (user_id, entreprise_id, event_type, page_path, page_name, created_at, metadata)
SELECT 
  s.signed_by,
  u.entreprise_id,
  'signature',
  '/signature-macons',
  'Signature',
  s.signed_at,
  jsonb_build_object('fiche_id', s.fiche_id, 'backfilled', true)
FROM signatures s
JOIN utilisateurs u ON s.signed_by = u.id
WHERE u.entreprise_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_activity_logs ual
    WHERE ual.user_id = s.signed_by 
      AND ual.event_type = 'signature' 
      AND ual.created_at = s.signed_at
  );

-- Backfill user_activity_logs from fiches created (chefs creating timesheets)
INSERT INTO user_activity_logs (user_id, entreprise_id, event_type, page_path, page_name, created_at, metadata)
SELECT DISTINCT ON (f.salarie_id, f.created_at)
  f.salarie_id,
  u.entreprise_id,
  'fiche_created',
  '/',
  'Saisie hebdomadaire',
  f.created_at,
  jsonb_build_object('fiche_id', f.id, 'semaine', f.semaine, 'backfilled', true)
FROM fiches f
JOIN utilisateurs u ON f.salarie_id = u.id
WHERE f.salarie_id IS NOT NULL 
  AND u.entreprise_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_activity_logs ual
    WHERE ual.user_id = f.salarie_id 
      AND ual.event_type = 'fiche_created' 
      AND ual.created_at = f.created_at
  );

-- Backfill user_activity_logs from fiches updated
INSERT INTO user_activity_logs (user_id, entreprise_id, event_type, page_path, page_name, created_at, metadata)
SELECT DISTINCT ON (f.salarie_id, f.updated_at)
  f.salarie_id,
  u.entreprise_id,
  'fiche_updated',
  '/',
  'Saisie hebdomadaire',
  f.updated_at,
  jsonb_build_object('fiche_id', f.id, 'semaine', f.semaine, 'statut', f.statut, 'backfilled', true)
FROM fiches f
JOIN utilisateurs u ON f.salarie_id = u.id
WHERE f.salarie_id IS NOT NULL 
  AND u.entreprise_id IS NOT NULL
  AND f.updated_at != f.created_at
  AND NOT EXISTS (
    SELECT 1 FROM user_activity_logs ual
    WHERE ual.user_id = f.salarie_id 
      AND ual.event_type = 'fiche_updated' 
      AND ual.created_at = f.updated_at
  );

-- Backfill user_activity_logs from messages sent
INSERT INTO user_activity_logs (user_id, entreprise_id, event_type, page_path, page_name, created_at, metadata)
SELECT 
  m.author_id,
  c.entreprise_id,
  'message_sent',
  '/chat',
  'Chat',
  m.created_at,
  jsonb_build_object('conversation_id', m.conversation_id, 'backfilled', true)
FROM messages m
JOIN conversations c ON m.conversation_id = c.id
WHERE NOT EXISTS (
    SELECT 1 FROM user_activity_logs ual
    WHERE ual.user_id = m.author_id 
      AND ual.event_type = 'message_sent' 
      AND ual.created_at = m.created_at
  );

-- Backfill user_activity_logs from periodes_cloturees (RH activity)
INSERT INTO user_activity_logs (user_id, entreprise_id, event_type, page_path, page_name, created_at, metadata)
SELECT 
  pc.cloturee_par,
  pc.entreprise_id,
  'period_closed',
  '/consultation-rh',
  'Consultation RH',
  pc.date_cloture,
  jsonb_build_object('periode', pc.periode, 'nb_fiches', pc.nb_fiches, 'backfilled', true)
FROM periodes_cloturees pc
WHERE pc.cloturee_par IS NOT NULL
  AND pc.entreprise_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_activity_logs ual
    WHERE ual.user_id = pc.cloturee_par 
      AND ual.event_type = 'period_closed' 
      AND ual.created_at = pc.date_cloture
  );

-- Now reconstruct historical sessions from the backfilled activity logs
-- Group activities within 30-minute windows as single sessions
WITH activity_with_gaps AS (
  SELECT 
    user_id,
    entreprise_id,
    created_at,
    LAG(created_at) OVER (PARTITION BY user_id ORDER BY created_at) as prev_activity,
    CASE 
      WHEN LAG(created_at) OVER (PARTITION BY user_id ORDER BY created_at) IS NULL THEN 1
      WHEN created_at - LAG(created_at) OVER (PARTITION BY user_id ORDER BY created_at) > interval '30 minutes' THEN 1
      ELSE 0
    END as new_session
  FROM user_activity_logs
  WHERE (metadata->>'backfilled')::boolean = true
),
session_groups AS (
  SELECT 
    user_id,
    entreprise_id,
    created_at,
    SUM(new_session) OVER (PARTITION BY user_id ORDER BY created_at) as session_num
  FROM activity_with_gaps
),
session_bounds AS (
  SELECT 
    user_id,
    entreprise_id,
    session_num,
    MIN(created_at) as session_start,
    MAX(created_at) as session_end,
    COUNT(*) as activity_count
  FROM session_groups
  GROUP BY user_id, entreprise_id, session_num
)
INSERT INTO user_sessions (user_id, entreprise_id, started_at, ended_at, last_activity_at, duration_seconds, pages_visited, is_active, device_type, browser)
SELECT 
  sb.user_id,
  sb.entreprise_id,
  sb.session_start,
  sb.session_end + interval '5 minutes', -- Add 5 min buffer for session end
  sb.session_end,
  EXTRACT(EPOCH FROM (sb.session_end - sb.session_start))::integer + 300, -- Add 5 min buffer
  sb.activity_count,
  false, -- Historical sessions are not active
  'unknown',
  'unknown'
FROM session_bounds sb
WHERE NOT EXISTS (
  SELECT 1 FROM user_sessions us
  WHERE us.user_id = sb.user_id 
    AND us.started_at = sb.session_start
);