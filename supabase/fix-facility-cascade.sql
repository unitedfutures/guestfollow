-- guest_records.facility_id と access_codes.facility_id の FK を ON DELETE CASCADE に変更

ALTER TABLE public.guest_records
  DROP CONSTRAINT IF EXISTS guest_records_facility_id_fkey,
  ADD CONSTRAINT guest_records_facility_id_fkey
    FOREIGN KEY (facility_id) REFERENCES public.facilities(id) ON DELETE CASCADE;

ALTER TABLE public.access_codes
  DROP CONSTRAINT IF EXISTS access_codes_facility_id_fkey,
  ADD CONSTRAINT access_codes_facility_id_fkey
    FOREIGN KEY (facility_id) REFERENCES public.facilities(id) ON DELETE CASCADE;
