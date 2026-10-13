# Decisions and information still needed

| Item | Why needed | Proposed default | Your answer |
|---|---|---|---|
| Verified source for each LGU's business-permit requirements (17 NCR localities) | Local permit steps differ per LGU; none are verified yet, so all are labelled generic | Keep "generic, not verified" labels; add per-LGU entries only with an official URL | |
| Barangay → RDO data for localities other than Quezon City | Auto-RDO exists for QC only | Users outside QC confirm RDO with the BIR | |
| Locality required in the wizard, or only for LGU permits? | Affects drop-off | Required (current behavior) | |
| Approved wording about geographic coverage | Avoid over-claiming | "Metro Manila (NCR). Local permit guidance is general." | |
| Names and contribution labels for 9 researchers and 1 web developer | Credits must not invent names | Placeholders in `data/credits.json` | |
| Brand logo files | Navbar/favicon consistency | Keep existing `public/icons/*` | |
| Real support/contact email | Footer and legal pages | Set `NEXT_PUBLIC_CONTACT_EMAIL` | |
| Account deletion and data-retention policy | Deletion is permanent and cascades | Delete auth user + all linked rows immediately; no backup restore promise | |
| Whether `upgrade_to_premium_demo()` stays | Any real user can self-upgrade to Premium (no payments yet) | Keep for the prototype; remove before real billing | |
