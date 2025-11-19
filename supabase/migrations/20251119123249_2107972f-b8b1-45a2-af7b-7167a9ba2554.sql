-- Ajout des colonnes pour les overrides et données administratives du pré-export Excel RH
ALTER TABLE fiches
  ADD COLUMN absences_export_override jsonb DEFAULT NULL,
  ADD COLUMN trajets_export_override jsonb DEFAULT NULL,
  ADD COLUMN acomptes text DEFAULT NULL,
  ADD COLUMN prets text DEFAULT NULL,
  ADD COLUMN commentaire_rh text DEFAULT NULL,
  ADD COLUMN notes_paie text DEFAULT NULL;

COMMENT ON COLUMN fiches.absences_export_override IS 'Override manuel des absences pour export Excel RH (format: {"CP": 21, "RTT": 7, ...})';
COMMENT ON COLUMN fiches.trajets_export_override IS 'Override manuel des trajets pour export Excel RH (format: {"T1": 5, "T2": 3, ...})';
COMMENT ON COLUMN fiches.acomptes IS 'Acomptes versés (texte libre pour paye)';
COMMENT ON COLUMN fiches.prets IS 'Prêts en cours (texte libre pour paye)';
COMMENT ON COLUMN fiches.commentaire_rh IS 'Commentaires RH du mois pour export paye';
COMMENT ON COLUMN fiches.notes_paie IS 'Notes administratives pour le service paye';