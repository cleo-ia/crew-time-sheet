
-- Lier le conducteur theo.gouin au chef Tom Genin
INSERT INTO public.conducteurs_chefs (conducteur_id, chef_id)
VALUES ('a3e6608f-cf9a-466d-bbe9-86da4184a667', '763f030a-23ae-4355-9a0c-1fc715a9ea70')
ON CONFLICT DO NOTHING;
