-- Fake donor and gift data for local/dev testing only.
-- Safe to run multiple times after a clean schema reset.

insert into public.funds (name, code)
values
  ('General Fund', 'GEN'),
  ('Mammogram Fund', 'MAM'),
  ('Patient Support Fund', 'PSF')
on conflict (name) do nothing;

insert into public.campaigns (name, code, starts_on, ends_on)
values
  ('Spring Ribbon Drive', 'SPRING26', '2026-03-01', '2026-05-31'),
  ('Pink Gala', 'GALA26', '2026-09-01', '2026-10-15'),
  ('Year End Hope', 'YE26', '2026-11-01', '2026-12-31')
on conflict (name) do nothing;

with donor_seed (email, donor_type, first_name, last_name, organization_name, primary_phone, notes) as (
  values
    ('amelia.hart@example.org', 'INDIVIDUAL', 'Amelia', 'Hart', null, '904-555-0101', 'Recurring mid-level donor.'),
    ('benjamin.reed@example.org', 'INDIVIDUAL', 'Benjamin', 'Reed', null, '904-555-0102', 'Attended Pink Gala in prior year.'),
    ('carla.mendez@example.org', 'INDIVIDUAL', 'Carla', 'Mendez', null, '904-555-0103', 'Interested in tribute gifts.'),
    ('daniel.foster@example.org', 'INDIVIDUAL', 'Daniel', 'Foster', null, '904-555-0104', 'Strong year-end donor.'),
    ('elise.nguyen@example.org', 'INDIVIDUAL', 'Elise', 'Nguyen', null, '904-555-0105', 'First-time donor this year.'),
    ('faith.collins@example.org', 'INDIVIDUAL', 'Faith', 'Collins', null, '904-555-0106', 'Prospect converted after event outreach.'),
    ('grant.wilson@example.org', 'INDIVIDUAL', 'Grant', 'Wilson', null, '904-555-0107', 'Corporate matching eligible.'),
    ('harbor.care@example.org', 'ORGANIZATION', null, null, 'Harbor Care Partners', '904-555-0108', 'Community health partner.'),
    ('sunrise.logistics@example.org', 'ORGANIZATION', null, null, 'Sunrise Logistics', '904-555-0109', 'Sponsorship relationship.'),
    ('violet.family.office@example.org', 'ORGANIZATION', null, null, 'Violet Family Office', '904-555-0110', 'Major gift prospect.')
)
insert into public.donors (
  donor_type,
  first_name,
  last_name,
  organization_name,
  primary_email,
  primary_phone,
  notes
)
select donor_type, first_name, last_name, organization_name, email, primary_phone, notes
from donor_seed
on conflict (primary_email) do nothing;

with address_seed (email, street1, city, state_region, postal_code) as (
  values
    ('amelia.hart@example.org', '101 River Birch Ln', 'Jacksonville', 'FL', '32207'),
    ('benjamin.reed@example.org', '24 Magnolia Ave', 'Atlantic Beach', 'FL', '32233'),
    ('carla.mendez@example.org', '8 Palm Court', 'Jacksonville', 'FL', '32216'),
    ('daniel.foster@example.org', '77 San Marco Blvd', 'Jacksonville', 'FL', '32207'),
    ('elise.nguyen@example.org', '15 Harbor View Dr', 'Neptune Beach', 'FL', '32266'),
    ('faith.collins@example.org', '92 Cedar Run', 'Jacksonville', 'FL', '32224'),
    ('grant.wilson@example.org', '310 Oak Terrace', 'Jacksonville', 'FL', '32217'),
    ('harbor.care@example.org', '500 Wellness Way', 'Jacksonville', 'FL', '32256'),
    ('sunrise.logistics@example.org', '820 Distribution Pkwy', 'Jacksonville', 'FL', '32218'),
    ('violet.family.office@example.org', '1 Riverside Plaza', 'Jacksonville', 'FL', '32204')
)
insert into public.donor_addresses (
  donor_id,
  address_type,
  street1,
  city,
  state_region,
  postal_code,
  is_primary
)
select d.id, 'primary', a.street1, a.city, a.state_region, a.postal_code, true
from address_seed a
inner join public.donors d on d.primary_email = a.email
where not exists (
  select 1
  from public.donor_addresses da
  where da.donor_id = d.id
    and da.is_primary = true
);

with fund_lookup as (
  select id, code from public.funds
),
campaign_lookup as (
  select id, code from public.campaigns
),
gift_seed (email, gift_type, amount_cents, gift_date, fund_code, campaign_code, payment_method, reference_number, notes) as (
  values
    ('amelia.hart@example.org', 'CASH', 2500, '2025-02-14', 'GEN', 'SPRING26', 'CARD', 'AH-001', 'Valentine appeal gift'),
    ('amelia.hart@example.org', 'CASH', 5000, '2025-11-30', 'MAM', 'YE26', 'ACH', 'AH-002', 'Year-end support'),
    ('amelia.hart@example.org', 'CASH', 7500, '2026-03-10', 'GEN', 'SPRING26', 'CARD', 'AH-003', 'Spring follow-up'),
    ('benjamin.reed@example.org', 'CASH', 10000, '2024-10-05', 'PSF', 'GALA26', 'CHECK', 'BR-001', 'Event sponsorship gift'),
    ('benjamin.reed@example.org', 'CASH', 15000, '2025-10-02', 'PSF', 'GALA26', 'WIRE', 'BR-002', 'Renewed gala support'),
    ('carla.mendez@example.org', 'GIFT_IN_KIND', 2500, '2026-01-12', 'MAM', 'YE26', null, 'CM-001', 'Memorial tribute'),
    ('daniel.foster@example.org', 'PLEDGE', 20000, '2025-12-28', 'GEN', 'YE26', null, 'DF-001', 'Major year-end commitment'),
    ('daniel.foster@example.org', 'PLEDGE_PAYMENT', 5000, '2026-02-18', 'GEN', 'SPRING26', 'ACH', 'DF-002', 'Follow-up gift'),
    ('elise.nguyen@example.org', 'CASH', 1000, '2026-01-20', 'MAM', 'SPRING26', 'CARD', 'EN-001', 'First gift'),
    ('faith.collins@example.org', 'CASH', 3000, '2026-03-03', 'PSF', 'SPRING26', 'CARD', 'FC-001', 'New donor online appeal'),
    ('grant.wilson@example.org', 'MATCHING_GIFT_PLEDGE', 12000, '2025-06-15', 'GEN', null, null, 'GW-001', 'Employer match pending'),
    ('grant.wilson@example.org', 'MATCHING_GIFT_PAYMENT', 12000, '2025-07-12', 'GEN', null, 'ACH', 'GW-002', 'Matching gift received'),
    ('harbor.care@example.org', 'CASH', 50000, '2025-09-20', 'PSF', 'GALA26', 'WIRE', 'HC-001', 'Corporate sponsorship'),
    ('sunrise.logistics@example.org', 'STOCK_PROPERTY', 25000, '2026-03-01', 'GEN', 'SPRING26', null, 'SL-001', 'Community partnership gift'),
    ('violet.family.office@example.org', 'CASH', 100000, '2025-12-15', 'MAM', 'YE26', 'WIRE', 'VF-001', 'Leadership contribution'),
    ('violet.family.office@example.org', 'PLEDGE', 25000, '2026-03-05', 'PSF', 'SPRING26', null, 'VF-002', 'Challenge match commitment')
)
insert into public.gifts (
  donor_id,
  fund_id,
  campaign_id,
  gift_type,
  amount_cents,
  gift_date,
  payment_method,
  reference_number,
  notes
)
select
  d.id,
  f.id,
  c.id,
  gs.gift_type,
  gs.amount_cents,
  gs.gift_date::date,
  gs.payment_method,
  gs.reference_number,
  gs.notes
from gift_seed gs
inner join public.donors d on d.primary_email = gs.email
inner join fund_lookup f on f.code = gs.fund_code
left join campaign_lookup c on c.code = gs.campaign_code
where not exists (
  select 1
  from public.gifts g
  where g.reference_number = gs.reference_number
);
