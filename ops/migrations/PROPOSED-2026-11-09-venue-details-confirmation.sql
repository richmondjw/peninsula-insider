-- PROPOSED, NOT APPLIED. Optional hardening for the "I confirm my business
-- details are correct" path on /partners/update/.
--
-- The form works today without this: confirmations insert into
-- pi.venue_change_requests with operator_role = 'details-confirmation',
-- change_type 'other' (or 'correction' when corrections are supplied), and a
-- proposed_change body that starts "DETAILS CONFIRMED". created_at is the
-- confirmation timestamp.
--
-- Apply this only if editors want a first-class change_type and column.

alter table pi.venue_change_requests
  drop constraint if exists venue_change_requests_change_type_check;
alter table pi.venue_change_requests
  add constraint venue_change_requests_change_type_check
  check (change_type in ('hours','photo','closure','event','correction','other','confirmation'));

alter table pi.venue_change_requests
  add column if not exists details_confirmed_at timestamptz;

-- Backfill rows already filed through the form.
update pi.venue_change_requests
   set details_confirmed_at = created_at
 where operator_role = 'details-confirmation'
   and details_confirmed_at is null;

create index if not exists venue_change_requests_confirmations
  on pi.venue_change_requests (venue_slug, details_confirmed_at desc)
  where details_confirmed_at is not null;
