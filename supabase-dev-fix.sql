-- ============================================================
-- DEV FIX: Dami RLS dhamaan tables-ka (development only)
-- Production marka la gaaro, dib ayaa loo shidi doonaa
-- ============================================================

alter table shirkadaha disable row level security;
alter table isticmaalayaal disable row level security;
alter table qaybaha disable row level security;
alter table alaabta disable row level security;
alter table macaamiisha disable row level security;
alter table vendors disable row level security;
alter table iibka disable row level security;
alter table tafaasiil_iibka disable row level security;
alter table iibsiga disable row level security;
alter table tafaasiil_iibsiga disable row level security;
alter table lacag_macaamiil disable row level security;
alter table lacag_vendor disable row level security;
alter table lacag_rukun disable row level security;
alter table audit_log disable row level security;
alter table rukunno disable row level security;
