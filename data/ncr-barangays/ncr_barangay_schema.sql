-- Optional import schema for the NCR barangay dataset. NOT applied to any application database.
-- Load the CSVs in this folder with COPY / your platform's CSV import. alternative_names is a ' | '-delimited text field in the CSV.
create table ncr_cities_municipalities (
  city_municipality_code text primary key,
  official_name text not null, standardized_name text not null, geographic_level text not null,
  city_class text, income_classification text, region_code text not null, region_name text not null, province_name text,
  psgc_barangay_count int not null, source_records_matched int, source_title text, source_url text,
  verification_date date, verification_status text, notes text);
create table bir_rdos (
  rdo_code text primary key, rdo_name text not null, revenue_region text, office_address_per_source text,
  official_contact_information text, jurisdiction_description text, source_title text, source_url text,
  verification_date date, verification_status text check (verification_status in ('verified','partially verified','conflicting sources','needs manual review')), notes text);
create table ncr_barangays (
  barangay_code text primary key check (barangay_code ~ '^[0-9]{10}$'),
  barangay_name text not null, alternative_names text,
  city_municipality_code text not null references ncr_cities_municipalities(city_municipality_code),
  city_municipality_name text not null, province_code text, province_name text,
  region_code text not null, region_name text not null, district text, zone text, original_source_text text,
  geographic_source_name text, geographic_source_url text,
  rdo_code text references bir_rdos(rdo_code), rdo_name text, rdo_assignment_level text,
  rdo_assignment_method text, rdo_verification_status text check (rdo_verification_status in ('verified','partially verified','conflicting sources','needs manual review')),
  rdo_source_url text, verification_date date, data_quality_notes text);
create index idx_ncr_barangays_city on ncr_barangays(city_municipality_code);
create index idx_ncr_barangays_rdo on ncr_barangays(rdo_code);
create index idx_ncr_barangays_name on ncr_barangays(lower(barangay_name));
