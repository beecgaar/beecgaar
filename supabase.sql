-- ============================================================
-- BEECGAAR - SaaS System Database
-- Dukaamo/Bakhaarro Management System
-- ============================================================
-- Ku orod: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- 1. RUKUNNO (Subscription Plans)
-- Qorshooyinka lacag-bixinta bisha
create table if not exists rukunno (
  id          bigint generated always as identity primary key,
  magac       text    not null,                    -- "Bilaash", "Aasaasi", "Ganacsi"
  magac_en    text    not null,                    -- "Free", "Basic", "Business"
  qiime_bishi numeric not null default 0,          -- $0, $10, $25
  max_users   int     not null default 1,           -- tirada isticmaalayaasha ugu badan
  max_alaab   int     not null default 50,          -- tirada alaabta ugu badan
  sharaxaad   text,                                 -- faahfaahin
  firfircoon  boolean not null default true,
  la_sameeyay timestamptz not null default now()
);

-- Ku dar rukunno bilowga
insert into rukunno (magac, magac_en, qiime_bishi, max_users, max_alaab, sharaxaad) values
  ('Tijaabo',  'Trial',    0,   2,   50,  '14 maalmood oo bilaash ah'),
  ('Aasaasi',  'Basic',   10,   3,  200,  'Dukaan yar'),
  ('Ganacsi',  'Business', 25,  10, 1000,  'Dukaan dhexe'),
  ('Premium',  'Premium',  50,  99, 9999,  'Bakhaar weyn, xad la''aan');

-- 2. SHIRKADAHA (Tenants / Companies)
-- Dukaan kasta oo is-diiwaangeliya
create table if not exists shirkadaha (
  id              bigint generated always as identity primary key,
  magac           text        not null,              -- "Dukaan Barwaaqo"
  taleefon        text,
  email           text,
  cinwaan         text,                              -- address
  rukun_id        bigint      not null references rukunno(id) default 1,
  trial_dhammaad  date,                              -- marka trial-ku dhammaaday
  xaalad          text        not null default 'firfircoon'
                  check (xaalad in ('firfircoon', 'xanniban', 'trial')),
  lacag_unit      text        not null default '$',   -- $, Sh.So
  luqad           text        not null default 'so',  -- 'so' ama 'en'
  la_sameeyay     timestamptz not null default now(),
  la_cusbooneysiiyay timestamptz not null default now()
);

-- 3. ISTICMAALAYAAL (Users)
-- Qof kasta oo system-ka isticmaala
create table if not exists isticmaalayaal (
  id          bigint generated always as identity primary key,
  auth_id     uuid        unique references auth.users on delete cascade,
  shirkad_id  bigint      not null references shirkadaha(id) on delete cascade,
  magac       text        not null,
  taleefon    text,
  email       text,
  doorka      text        not null default 'cashier'
              check (doorka in ('super_admin', 'admin', 'manager', 'cashier', 'viewer')),
  firfircoon  boolean     not null default true,
  la_sameeyay timestamptz not null default now()
);

-- 4. QAYBAHA ALAABTA (Product Categories)
create table if not exists qaybaha (
  id          bigint generated always as identity primary key,
  shirkad_id  bigint      not null references shirkadaha(id) on delete cascade,
  magac       text        not null,              -- "Saliid", "Bariis", "Sonkor"
  la_sameeyay timestamptz not null default now()
);

-- 5. ALAABTA (Products / Inventory)
create table if not exists alaabta (
  id             bigint generated always as identity primary key,
  shirkad_id     bigint      not null references shirkadaha(id) on delete cascade,
  qayb_id        bigint      references qaybaha(id),
  magac          text        not null,           -- "Bariis Basmati 25kg"
  code           text,                           -- barcode ama code gaarka ah
  qiime_iibsi    numeric     not null default 0, -- buying price
  qiime_iib      numeric     not null default 0, -- selling price
  tirada_jirta   numeric     not null default 0, -- stock balance
  tirada_ugu_yar numeric     not null default 0, -- reorder level (digniin)
  halbeeg        text        not null default 'dhan', -- unit: dhan, kg, litir, xabo
  sawir_url      text,
  firfircoon     boolean     not null default true,
  la_sameeyay    timestamptz not null default now(),
  la_cusbooneysiiyay timestamptz not null default now()
);

-- 6. MACAAMIISHA (Customers)
create table if not exists macaamiisha (
  id          bigint generated always as identity primary key,
  shirkad_id  bigint      not null references shirkadaha(id) on delete cascade,
  magac       text        not null,
  taleefon    text,
  cinwaan     text,
  deyn        numeric     not null default 0,    -- waxa uu ku leeyahay (balance)
  la_sameeyay timestamptz not null default now()
);

-- 7. ALAAB-QEYBIYEYAASHA (Suppliers / Vendors)
create table if not exists vendors (
  id          bigint generated always as identity primary key,
  shirkad_id  bigint      not null references shirkadaha(id) on delete cascade,
  magac       text        not null,
  taleefon    text,
  cinwaan     text,
  deyn        numeric     not null default 0,    -- waxa aad u leedahay
  la_sameeyay timestamptz not null default now()
);

-- 8. IIBKA (Sales)
create table if not exists iibka (
  id          bigint generated always as identity primary key,
  shirkad_id  bigint      not null references shirkadaha(id) on delete cascade,
  macmiil_id  bigint      references macaamiisha(id),
  user_id     bigint      references isticmaalayaal(id),
  lambarka    text,                               -- invoice number: INV-001
  wadarta     numeric     not null default 0,     -- total amount
  la_bixiyay  numeric     not null default 0,     -- amount paid
  deyn        numeric     not null default 0,     -- remaining
  hab_lacag   text        not null default 'lacag_caddaan'
              check (hab_lacag in ('lacag_caddaan', 'evc', 'zaad', 'deyn', 'isku_dhaf')),
  qoraal      text,                               -- notes
  taariikh    timestamptz not null default now()
);

-- 9. TAFAASIL IIBKA (Sale Items / Line Items)
create table if not exists tafaasiil_iibka (
  id          bigint generated always as identity primary key,
  iib_id      bigint      not null references iibka(id) on delete cascade,
  shirkad_id  bigint      not null references shirkadaha(id) on delete cascade,
  alaab_id    bigint      not null references alaabta(id),
  tirada      numeric     not null,
  qiimaha     numeric     not null,               -- unit price at time of sale
  wadarta     numeric     not null                 -- tirada × qiimaha
);

-- 10. IIBSIGA (Purchases)
create table if not exists iibsiga (
  id          bigint generated always as identity primary key,
  shirkad_id  bigint      not null references shirkadaha(id) on delete cascade,
  vendor_id   bigint      references vendors(id),
  user_id     bigint      references isticmaalayaal(id),
  lambarka    text,                                -- PO number
  wadarta     numeric     not null default 0,
  la_bixiyay  numeric     not null default 0,
  deyn        numeric     not null default 0,
  qoraal      text,
  taariikh    timestamptz not null default now()
);

-- 11. TAFAASIL IIBSIGA (Purchase Items)
create table if not exists tafaasiil_iibsiga (
  id          bigint generated always as identity primary key,
  iibsi_id    bigint      not null references iibsiga(id) on delete cascade,
  shirkad_id  bigint      not null references shirkadaha(id) on delete cascade,
  alaab_id    bigint      not null references alaabta(id),
  tirada      numeric     not null,
  qiimaha     numeric     not null,
  wadarta     numeric     not null
);

-- 12. LACAG BIXINTA MACAAMIISHA (Customer Payments)
create table if not exists lacag_macaamiil (
  id          bigint generated always as identity primary key,
  shirkad_id  bigint      not null references shirkadaha(id) on delete cascade,
  macmiil_id  bigint      not null references macaamiisha(id),
  lacag       numeric     not null,
  hab_lacag   text        not null default 'lacag_caddaan',
  qoraal      text,
  taariikh    timestamptz not null default now()
);

-- 13. LACAG BIXINTA VENDOR-YADA (Vendor Payments)
create table if not exists lacag_vendor (
  id          bigint generated always as identity primary key,
  shirkad_id  bigint      not null references shirkadaha(id) on delete cascade,
  vendor_id   bigint      not null references vendors(id),
  lacag       numeric     not null,
  hab_lacag   text        not null default 'lacag_caddaan',
  qoraal      text,
  taariikh    timestamptz not null default now()
);

-- 14. LACAG BIXINTA RUKUNADA (Subscription Payments)
create table if not exists lacag_rukun (
  id          bigint generated always as identity primary key,
  shirkad_id  bigint      not null references shirkadaha(id) on delete cascade,
  bisha       text        not null,               -- "2026-11"
  lacag       numeric     not null,
  hab_lacag   text        not null default 'evc',
  xaalad      text        not null default 'sugaya'
              check (xaalad in ('sugaya', 'la_xaqiijiyay', 'dhacay')),
  taariikh    timestamptz not null default now()
);

-- 15. AUDIT LOG (Taariikhda wax beddel kasta)
create table if not exists audit_log (
  id          bigint generated always as identity primary key,
  shirkad_id  bigint      references shirkadaha(id),
  user_id     bigint      references isticmaalayaal(id),
  ficil       text        not null,               -- 'iib_cusub', 'alaab_beddel', 'login'
  shax        text,                                -- table name
  record_id   bigint,
  faahfaahin  jsonb,                               -- old/new values
  taariikh    timestamptz not null default now()
);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Function: soo celi shirkadda user-ka hadda soo galay
create or replace function shirkadayda()
returns bigint language sql stable security definer as $$
  select shirkad_id from isticmaalayaal
  where auth_id = auth.uid()
  limit 1
$$;

-- Function: soo celi doorka user-ka
create or replace function doorkayga()
returns text language sql stable security definer as $$
  select doorka from isticmaalayaal
  where auth_id = auth.uid()
  limit 1
$$;

-- Function: ma super admin baa?
create or replace function waa_super_admin()
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from isticmaalayaal
    where auth_id = auth.uid() and doorka = 'super_admin'
  )
$$;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Shirkad kasta xogteeda oo keliya
-- ============================================================

-- Macro: enable RLS on all tables
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'shirkadaha','isticmaalayaal','qaybaha','alaabta','macaamiisha',
    'vendors','iibka','tafaasiil_iibka','iibsiga','tafaasiil_iibsiga',
    'lacag_macaamiil','lacag_vendor','lacag_rukun','audit_log'
  ]) loop
    execute format('alter table %I enable row level security', t);
  end loop;
end$$;

-- SHIRKADAHA: arki shirkaddaada, super_admin dhammaan
create policy "shirkadayda" on shirkadaha for select
  using (id = shirkadayda() or waa_super_admin());
create policy "shirkad_update" on shirkadaha for update
  using (id = shirkadayda() or waa_super_admin());

-- ISTICMAALAYAAL
create policy "users_select" on isticmaalayaal for select
  using (shirkad_id = shirkadayda() or waa_super_admin());
create policy "users_insert" on isticmaalayaal for insert
  with check (shirkad_id = shirkadayda() or waa_super_admin());
create policy "users_update" on isticmaalayaal for update
  using (shirkad_id = shirkadayda() or waa_super_admin());
create policy "users_delete" on isticmaalayaal for delete
  using (shirkad_id = shirkadayda() or waa_super_admin());

-- Shaxda kasta oo kale: shirkaddaada oo keliya
-- (Pattern isku mid ah: shirkad_id = shirkadayda() or waa_super_admin())
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'qaybaha','alaabta','macaamiisha','vendors',
    'iibka','tafaasiil_iibka','iibsiga','tafaasiil_iibsiga',
    'lacag_macaamiil','lacag_vendor','lacag_rukun','audit_log'
  ]) loop
    execute format('
      create policy "%1$s_select" on %1$I for select using (shirkad_id = shirkadayda() or waa_super_admin());
      create policy "%1$s_insert" on %1$I for insert with check (shirkad_id = shirkadayda() or waa_super_admin());
      create policy "%1$s_update" on %1$I for update using (shirkad_id = shirkadayda() or waa_super_admin());
      create policy "%1$s_delete" on %1$I for delete using (shirkad_id = shirkadayda() or waa_super_admin());
    ', t);
  end loop;
end$$;

-- RUKUNNO: qof kasta ha akhriyo (ma aha xog sir ah)
alter table rukunno enable row level security;
create policy "rukunno_read" on rukunno for select using (true);

-- ============================================================
-- INDEXES (si xogtu ugu degdegto)
-- ============================================================
create index if not exists idx_users_shirkad on isticmaalayaal(shirkad_id);
create index if not exists idx_users_auth on isticmaalayaal(auth_id);
create index if not exists idx_alaab_shirkad on alaabta(shirkad_id);
create index if not exists idx_iibka_shirkad on iibka(shirkad_id);
create index if not exists idx_iibka_taariikh on iibka(taariikh);
create index if not exists idx_iibsiga_shirkad on iibsiga(shirkad_id);
create index if not exists idx_macaamiil_shirkad on macaamiisha(shirkad_id);
create index if not exists idx_vendors_shirkad on vendors(shirkad_id);
create index if not exists idx_audit_shirkad on audit_log(shirkad_id);
