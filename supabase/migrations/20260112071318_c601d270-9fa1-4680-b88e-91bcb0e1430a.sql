-- Créer les sessions manquantes pour les 3 conducteurs de Limoge Revillon
-- basées sur leurs activity_logs existants du 9 janvier 2026

INSERT INTO user_sessions (
  user_id, 
  entreprise_id, 
  started_at, 
  ended_at, 
  duration_seconds, 
  pages_visited, 
  device_type, 
  browser, 
  is_active
)
SELECT 
  user_id,
  entreprise_id,
  MIN(created_at) as started_at,
  MAX(created_at) + interval '5 minutes' as ended_at,
  EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at)))::int + 300 as duration_seconds,
  COUNT(*) FILTER (WHERE event_type = 'page_view') as pages_visited,
  'mobile' as device_type,
  'Chrome' as browser,
  false as is_active
FROM user_activity_logs
WHERE user_id IN (
  '4453521d-cd43-4ec5-8697-762ef5e7528c',  -- Chloé CATHERIN
  'f9147a19-bf80-4ebb-bd4b-d06a18aed875',  -- Julien DA COSTA
  'ba1b4aab-1182-40cb-9894-6b3ac6a17e74'   -- Sébastien FROMONT
)
AND entreprise_id = 'edd12053-55dc-4f4b-b2ad-5048cb5aa798'  -- Limoge Revillon
GROUP BY user_id, entreprise_id;