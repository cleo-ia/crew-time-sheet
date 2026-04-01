DELETE FROM public.inventory_items 
WHERE report_id IN (
  '814c2cab-e1ce-46a2-ad76-29402fffe3c8',
  '5f2cacc0-502f-4abb-acea-c5645bbadeba'
);

DELETE FROM public.inventory_reports 
WHERE id IN (
  '814c2cab-e1ce-46a2-ad76-29402fffe3c8',
  '5f2cacc0-502f-4abb-acea-c5645bbadeba'
);