-- Insérer les fiches_jours manquantes pour KASMI (fiche TEST chantier, S05)
INSERT INTO fiches_jours (fiche_id, date, heures, "HNORM", "HI", "T", "PA", pause_minutes, entreprise_id)
VALUES 
  ('cb2f170b-b04c-4730-80b6-ff24abe3a6b5', '2026-01-26', 8, 8, 0, 1, true, 0, '2874c40d-dae2-456b-9465-4abb91d7edbf'),
  ('cb2f170b-b04c-4730-80b6-ff24abe3a6b5', '2026-01-27', 8, 8, 0, 1, true, 0, '2874c40d-dae2-456b-9465-4abb91d7edbf')
ON CONFLICT (fiche_id, date) DO NOTHING;