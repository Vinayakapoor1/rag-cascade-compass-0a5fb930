DELETE FROM indicator_feature_links
WHERE indicator_id IN (
  SELECT id FROM indicators
  WHERE name IN (
    'Platform Availability %',
    'Resilience & Capacity Compliance %',
    'Preventive Security Control Coverage %'
  )
);