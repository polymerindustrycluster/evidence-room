"""The county footprints, defined once.

VENDORED COPY. The canonical definition lives in the pic-geo package
(github.com/polymerindustrycluster/pic-geo). This copy exists so the fetch scripts run from a
clone with nothing else installed. Change it ONLY by changing pic-geo first; pic-geo's test
suite asserts the two are identical.

DECISION (owner ruling, 2026-11-03): PIC-18, the NEO-SMART 18-county region (JobsOhio Team NEO 14
+ Lake to River 4), replaces PIC-12 for pages built on FEDERAL data. Pages are re-derived one at a
time; until a page is, its data says PIC-12 and the page shows a "footprint update in progress"
notice (picviz.js footprintPending). PIC-12 stays defined so published figures stay reproducible.
Vendored from pic-geo v1.1.0.

DECISION (John, 2026-08-14, superseded for new work on 2026-11-03): pages built on FEDERAL data use PIC-12 so they reconcile
with the cluster-health dashboard. Pages built on the VAULT stay NEO-14, because that is
how company records are tagged. Every page prints which one it used.

They share only 10 counties. Numbers across the two do not reconcile and must never be
presented as if they do.
"""
PIC12 = {
    "39007": "Ashtabula", "39035": "Cuyahoga", "39055": "Geauga", "39085": "Lake",
    "39093": "Lorain", "39099": "Mahoning", "39103": "Medina", "39133": "Portage",
    "39151": "Stark", "39153": "Summit", "39155": "Trumbull", "39169": "Wayne",
}
# PIC-18, by ascending FIPS. Team NEO (14) and Lake to River (4); see JOBSOHIO_REGION.
PIC18 = {
    "39005": "Ashland", "39007": "Ashtabula", "39029": "Columbiana", "39035": "Cuyahoga",
    "39043": "Erie", "39055": "Geauga", "39077": "Huron", "39085": "Lake",
    "39093": "Lorain", "39099": "Mahoning", "39103": "Medina", "39133": "Portage",
    "39139": "Richland", "39151": "Stark", "39153": "Summit", "39155": "Trumbull",
    "39157": "Tuscarawas", "39169": "Wayne",
}
#: Which JobsOhio network region each PIC-18 county belongs to (the public source of PIC-18).
JOBSOHIO_REGION = {f: ("Lake to River" if n in ("Ashtabula", "Columbiana", "Mahoning", "Trumbull")
                       else "Team NEO") for f, n in PIC18.items()}
NEO14 = {
    "39153": "Summit", "39035": "Cuyahoga", "39133": "Portage", "39151": "Stark",
    "39055": "Geauga", "39085": "Lake", "39093": "Lorain", "39103": "Medina",
    "39077": "Huron", "39099": "Mahoning", "39169": "Wayne", "39157": "Tuscarawas",
    "39139": "Richland", "39033": "Crawford",
}
SHARED = set(PIC12) & set(NEO14)

META = {
    "pic12": {"key": "pic12", "n": len(PIC12), "label": "PIC-12",
              "counties": sorted(PIC12.values()),
              "note": "PIC’s official 12-county footprint, matching the cluster-health "
                      "dashboard. Chosen for federal-data pages so figures reconcile.",
              "differs": "Excludes Crawford, Huron, Richland and Tuscarawas, which the "
                         "vault’s NEO-14 includes; NEO-14 in turn leaves out Ashtabula and "
                         "Trumbull. The two share ten counties."},
    "neo14": {"key": "neo14", "n": len(NEO14), "label": "NEO-14",
              "counties": sorted(NEO14.values()),
              "note": "The 14-county set the GAC-PIC vault tags companies against. Kept "
                      "for vault-sourced pages because company records carry this flag.",
              "differs": "Excludes Ashtabula and Trumbull, which PIC-12 includes, and adds "
                         "Crawford, Huron, Richland and Tuscarawas. The two share ten counties."},
    "pic18": {"key": "pic18", "n": len(PIC18), "label": "PIC-18",
              "counties": sorted(PIC18.values()),
              "note": "PIC’s 18-county footprint from 2026-11-03: the NEO-SMART region, equal to "
                      "the JobsOhio Team NEO (14) and Lake to River (4) regions. Used for "
                      "federal-data pages from that date.",
              "differs": "Adds Ashland, Columbiana, Erie, Huron, Richland and Tuscarawas to "
                         "PIC-12, which it contains. Against the vault’s NEO-14 it adds "
                         "Ashland, Ashtabula, Columbiana, Erie and Trumbull and leaves out "
                         "Crawford; the two share thirteen counties."},
    "shared": sorted(PIC12[c] for c in SHARED),
}
