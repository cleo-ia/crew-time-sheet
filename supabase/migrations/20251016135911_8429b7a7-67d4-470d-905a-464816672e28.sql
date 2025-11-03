-- Étape 1 : Supprimer les signatures
DELETE FROM signatures 
WHERE fiche_id IN (
  '00974d2e-e42c-4069-82de-c1d80a629515',
  '582e5cd6-bf5b-4d8f-a8d2-b56bbc0eebdf',
  '1d4fed13-5b02-4d5d-bf75-46f0c7fbbe77',
  '1c56df29-1224-4536-959d-443d709ded45',
  '1f0fb1f3-9144-4eba-8a78-1aad1e617396',
  '7c041ffe-c55d-4dca-8962-8bd48780a40e',
  '28b576bf-aa3d-4167-a1f5-fe07e7e2904e',
  '8df09e32-0262-42ac-894c-1d1a83fdb53e',
  '8adacb56-db72-4a46-b85b-3566359dc93f'
);

-- Étape 2 : Supprimer les fiches_jours
DELETE FROM fiches_jours 
WHERE fiche_id IN (
  '00974d2e-e42c-4069-82de-c1d80a629515',
  '582e5cd6-bf5b-4d8f-a8d2-b56bbc0eebdf',
  '1d4fed13-5b02-4d5d-bf75-46f0c7fbbe77',
  '1c56df29-1224-4536-959d-443d709ded45',
  '1f0fb1f3-9144-4eba-8a78-1aad1e617396',
  '7c041ffe-c55d-4dca-8962-8bd48780a40e',
  '28b576bf-aa3d-4167-a1f5-fe07e7e2904e',
  '8df09e32-0262-42ac-894c-1d1a83fdb53e',
  '8adacb56-db72-4a46-b85b-3566359dc93f'
);

-- Étape 3 : Supprimer les fiches_transport_jours
DELETE FROM fiches_transport_jours 
WHERE fiche_transport_id IN (
  '11f8ffb5-125d-48a1-8224-4fc562355f68',
  '1c09fbeb-3bb0-4b1a-b031-03c964591878'
);

-- Étape 4 : Supprimer les fiches_transport
DELETE FROM fiches_transport 
WHERE id IN (
  '11f8ffb5-125d-48a1-8224-4fc562355f68',
  '1c09fbeb-3bb0-4b1a-b031-03c964591878'
);

-- Étape 5 : Supprimer les fiches
DELETE FROM fiches 
WHERE id IN (
  '00974d2e-e42c-4069-82de-c1d80a629515',
  '582e5cd6-bf5b-4d8f-a8d2-b56bbc0eebdf',
  '1d4fed13-5b02-4d5d-bf75-46f0c7fbbe77',
  '1c56df29-1224-4536-959d-443d709ded45',
  '1f0fb1f3-9144-4eba-8a78-1aad1e617396',
  '7c041ffe-c55d-4dca-8962-8bd48780a40e',
  '28b576bf-aa3d-4167-a1f5-fe07e7e2904e',
  '8df09e32-0262-42ac-894c-1d1a83fdb53e',
  '8adacb56-db72-4a46-b85b-3566359dc93f'
);