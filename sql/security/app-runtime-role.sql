-- Run as the migration owner. Creates no login/password and does not switch the app.
-- Existing role collisions fail rather than modifying an unknown principal.
begin;
create role crm_runtime nologin nosuperuser nocreatedb nocreaterole
  noinherit noreplication nobypassrls;
grant usage on schema public to crm_runtime;
grant select, insert, update on
  public.appeals, public.campaigns, public.donor_addresses,
  public.donor_organization_contacts, public.donor_organization_relationships,
  public.donor_sms_preferences, public.donors, public.field_options,
  public.funds, public.gifts, public.notes, public.patient_cases,
  public.pledge_installments, public.service_records, public.service_types,
  public.sms_messages, public.soft_credits, public.user_invitations, public.users
to crm_runtime;
grant select, insert on public.audit_log, public.rate_limit_events to crm_runtime;
grant delete on public.donor_organization_contacts,
  public.donor_organization_relationships, public.pledge_installments,
  public.soft_credits, public.user_invitations to crm_runtime;
grant select on public.donor_current_year_giving_levels, public.donor_giving_totals,
  public.prj_total_pledged_by_calendar_year, public.prj_total_pledged_to_date,
  public.prj_total_received_by_calendar_year, public.prj_total_received_to_date
to crm_runtime;
-- USAGE permits nextval, but not setval. Do not grant sequence UPDATE.
grant usage on sequence public.appeals_id_seq, public.audit_log_id_seq,
  public.campaigns_id_seq, public.donor_addresses_id_seq,
  public.donor_organization_contacts_id_seq, public.donor_organization_relationships_id_seq,
  public.donor_number_seq, public.donors_id_seq, public.field_options_id_seq,
  public.funds_id_seq, public.gift_number_seq, public.gifts_id_seq, public.notes_id_seq,
  public.patient_case_number_seq, public.patient_cases_id_seq,
  public.pledge_installments_id_seq, public.rate_limit_events_id_seq,
  public.service_records_id_seq, public.service_types_id_seq, public.sms_messages_id_seq,
  public.soft_credits_id_seq, public.user_invitations_id_seq, public.users_id_seq
to crm_runtime;
-- Future tables deliberately require reviewed grants, not blanket default privileges.
commit;
