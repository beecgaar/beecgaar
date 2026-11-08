-- ============================================================
-- AUTH FIX: U oggolow signup in shirkad iyo user la sameeyo
-- Ku orod: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- Marka qof cusub sign up gareeyo, wuxuu u baahan yahay in uu
-- sameeyo shirkad (tenant) iyo isticmaale (user record).
-- RLS policy-yadu waa inay u oggolaadaan.

-- 1. U oggolow authenticated users in ay shirkad cusub sameeyaan
create policy "allow_insert_shirkad"
  on shirkadaha for insert
  to authenticated
  with check (true);

-- 2. U oggolow authenticated users in ay isticmaale cusub sameeyaan
--    (kaliya markay auth_id-doodu ku haboon tahay)
create policy "allow_insert_own_user"
  on isticmaalayaal for insert
  to authenticated
  with check (auth_id = auth.uid());

-- 3. U oggolow user-ka in uu arko xogiisa (SELECT) si uu login ka dib u helo info-giisa
create policy "allow_select_own_user"
  on isticmaalayaal for select
  to authenticated
  using (auth_id = auth.uid() or waa_super_admin());

-- 4. U oggolow user-ka in uu arko shirkaddiisa
create policy "allow_select_own_shirkad"
  on shirkadaha for select
  to authenticated
  using (id in (select shirkad_id from isticmaalayaal where auth_id = auth.uid()) or waa_super_admin());
