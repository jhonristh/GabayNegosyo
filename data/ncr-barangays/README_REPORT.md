# NCR (Metro Manila) Barangay Master Dataset with BIR RDO Mapping
Generated 2026-10-24. Primary workbook: `ncr_barangay_dataset.xlsx` (all tables as sheets).

## Bottom line
- **Geography is solid:** 1,715 barangays, 16 cities, 1 municipality, taken from the PSA PSGC 2Q 2026 release (30 June 2026).
- **RDO mapping is only partly verified.** No barangay is marked `verified`. 1,531 are `partially verified` and 184 are blank / `needs manual review`.
- I did not find a retrievable, official, barangay-level BIR jurisdiction list covering all NCR RDOs, so I did not fill the gaps by guessing.

## Sources actually used
| Purpose | Source | Caveat |
|---|---|---|
| Barangay/city codes and names | PSA PSGC 2Q 2026 datafile (publication date 30 Jun 2026). Official page: https://psa.gov.ph/classification/psgc | Read from a GitHub copy (`mrkiyn/psgc-api`, SHA-256 `31892bc2...bca5d`), because psa.gov.ph was unreachable from my environment. The file names PSA as originator. Please confirm against psa.gov.ph if you need a direct download. The workbook's own "Prov Sum" sheet is stale (as of 2020, 1,710 NCR barangays) and was not used for checking. |
| RDO names, regions, addresses | BIR RMC No. 10-2025, Annex 2 (official BIR PDF) | It is a Freedom of Information receiving-office directory, not a jurisdiction document. Addresses are "Location of FOI Receiving Office". The PDF text scrambled contact details for some offices, so contacts are given only where unambiguous. |
| RDO 28 barangay list | RAO No. 004-19 (BIR), read via digest.ph (commercial reproduction; paywalled after RDO 38's first barangays) | Not the BIR's own copy; later amendments unchecked. |

## RDO assignment results
| Method | Barangays | Basis |
|---|---|---|
| Direct official mapping (RDO 28) | 26 | Barangay-level list in RAO 004-19, all 26 names matched PSGC Quezon City |
| Supported inherited mapping | 1,505 | RDO office designation in RMC 10-2025 Annex 2 (e.g., "RDO 27 - Caloocan City"); Manila by PSGC district (e.g., "Tondo-San Nicolas" -> RDO 29) |
| Unresolved | 184 | 116 Quezon City (RDOs 38/39/40 lists not obtained), 23 Makati (RDOs 47-50), 30 Pasig (RDO 43 is "East Pasig City", suggesting a split), 10 EMBO barangays now in Taguig, 5 Manila Port Area |

"Inherited" means the RDO's official name designates the city/district, not that I saw a jurisdiction order. Treat these as likely-correct defaults and verify before relying on them for filing.

## What happened to the source file (513 records, 17 sections)
- 507 records matched to PSGC: 347 exact names, 71 single barangay numbers, 34 spelling/format standardizations, 55 grouped records expanded into multiple barangays (e.g., "Barangays 111...125, Zones 10 and 11").
- 3 excluded as non-barangays: two Commons-style gallery entries ("Seals of barangays in Quezon City / Taguig") and the area label "Bagong Barrio West".
- 3 held for manual review, not auto-matched: "Bagong Silang" (Caloocan; PSGC has Barangay 176-A to 176-F), "Ayala Alabang" (probably New Alabang Village), "Philam Homes" (probably Phil-Am).
- 672 PSGC barangays have a confirmed source record; **1,043 had none in your file** and were added from PSGC (coverage in the source: Manila 64 of 897, Pasay 82 of 201, Caloocan 119 of 193, Quezon City 134 of 142; most other cities are complete or nearly so). The source was never a complete list.
- 20 barangays were referenced by more than one source record (e.g., Barangay 179 Caloocan, Barangay 303 Manila); merged and logged in `duplicate_review_log.csv`.
- 4 source records name a Manila district that disagrees with PSGC (Barangays 260, 303, 761, 498). PSGC was kept and the conflict is noted in the row.
- Spelling choices follow PSGC: e.g., Santulan -> Santolan, Polo -> Pulo, Veinte Reales -> Viente Reales, Sienna, Immaculate Concepcion. The Valenzuela ones in particular are worth a human look because PSGC spellings differ from common usage. Source spellings are kept in `alternative_names`.
- The "(N C, M F)" notes appear to be Wikimedia Commons category counts. That is my inference, not confirmed. They are not barangay data and are stored only in the inventory and change log.

## Things worth knowing
- Taguig's ten EMBO barangays are in Taguig per PSGC 2026, but I could not confirm which RDO now covers them.
- RDO 45 (Marikina) lists an office address in Antipolo, as printed by BIR.
- `province_*` is blank because PSGC places NCR cities directly under the region. `zone` is blank (PSGC has no zones); `district` is filled only for Manila (PSGC sub-municipalities). Source-stated zones/districts are kept as unverified text in `data_quality_notes`.
- RDO can also depend on taxpayer type and registration (large taxpayers, branches), which this dataset does not model.
- I did not touch the GabayNegosyo zip or any app database. `ncr_barangay_schema.sql` is optional and unapplied.

## Files
`ncr_barangays_master.csv/.json` (main), `ncr_cities_municipalities.csv`, `bir_rdo_reference.csv`, `barangay_rdo_mapping.csv`, `change_log.csv`, `duplicate_review_log.csv`, `unresolved_records.csv`, `source_record_inventory.csv`, `ncr_barangay_schema.sql`, `ncr_barangay_dataset.xlsx`.

## Validation run (all passed)
1,715 unique 10-digit codes matching the PSA workbook set and names; 17 LGUs, counts sum to 1,715; no duplicate (city, name); every RDO code exists in the RDO table; every assigned RDO has a source URL; all 513 source records resolved or flagged and present in the change log; JSON equals CSV.
