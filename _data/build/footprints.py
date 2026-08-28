"""The two county footprints, defined once.

VENDORED COPY. The canonical definition lives in the pic-geo package
(github.com/polymerindustrycluster/pic-geo). This copy exists so the fetch scripts run from a
clone with nothing else installed. Change it ONLY by changing pic-geo first; pic-geo's test
suite asserts the two are identical.

DECISION (John, 2026-08-14): pages built on FEDERAL data use PIC-12 so they reconcile
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
                         "vault’s NEO-14 includes."},
    "neo14": {"key": "neo14", "n": len(NEO14), "label": "NEO-14",
              "counties": sorted(NEO14.values()),
              "note": "The 14-county set the GAC-PIC vault tags companies against. Kept "
                      "for vault-sourced pages because company records carry this flag.",
              "differs": "Excludes Ashtabula and Trumbull, which PIC-12 includes."},
    "shared": sorted(PIC12[c] for c in SHARED),
}
