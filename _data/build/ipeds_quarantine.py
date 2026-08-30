"""IPEDS year quarantine. One list, imported by every fetch and derive that touches IPEDS.

WHY THIS EXISTS. On 2026-08-26 an audit found that every annual series derived from the
Urban Institute's IPEDS mirror carried 2020 as an exact copy of 2019 - not close, byte
identical, across every institution, award level, race and sex cell.

    completions-cip-6, CIP 140501, Ohio      2019: 660 rows, 485 awards
                                             2020: 660 rows, 485 awards   IDENTICAL
    the same CIP in Michigan (fips 26)       2019 = 2020, 1,528 awards
    the same CIP in Pennsylvania (fips 42)   2019 = 2020, 3,364 awards

It is not ours and it is not regional: the endpoint serves the 2019 table under
year=2020 for every state tested. The sibling `completions-cip-2` endpoint returns a
distinct row count for 2020, so the underlying warehouse HAS the year - only the
6-digit CIP table is wrong, which is the only one that can see polymer codes.

WHY A DUPLICATE IS WORSE THAN A GAP. A missing year announces itself. A duplicated year
is a plausible flat spot: it reads as "the pandemic year held steady", it survives every
consistency check, and it silently supplies one of the seven observations behind a
sentence like "declined in five of the seven years since the peak". Nothing in this
repository's gate stack could see it, because every gate asks whether the prose matches
the data and none asks whether the data matches the world. `verify_series.py` is the
answer to that and it is why it now runs in `npm run gates`.

HOW TO LIFT IT. Re-run any fetch and check whether 2020 still equals 2019 (verify_series
does this automatically and will fail the build if a quarantined year turns out to be
real). If Urban fixes the endpoint, delete 2020 from QUARANTINED, re-fetch, re-derive,
and add a CORRECTIONS.md entry - the numbers on three pages will move. The other route is
NCES directly, whose bulk completions files are not affected; that is a bigger job than
this note, and it is the reason the year is quarantined rather than declared lost.

NEVER silently interpolate a quarantined year. The rule everywhere downstream is: drop
the observation, break the line, and say so on the page.
"""

# Year -> why. Keep the reason short enough to print in a caption.
QUARANTINED = {
    2020: "the Urban Institute IPEDS mirror serves 2019 data under year=2020",
}

# What a page says when it has to name the gap in one clause.
CAPTION = "2020 is not drawn: the federal mirror republished 2019 under that year"


def drop(rows, key="year"):
    """Every row whose year is not quarantined. Works on dicts and on sqlite Rows."""
    return [r for r in rows if r[key] not in QUARANTINED]


def drop_keys(mapping):
    """Same, for {year: value} maps. Accepts int or str keys."""
    return {y: v for y, v in mapping.items() if int(y) not in QUARANTINED}


def comparable_pairs(years):
    """Consecutive (prev, year) pairs where BOTH ends are real.

    A quarantined year removes TWO comparisons, not one: you lose the step into it and
    the step out of it. Any "fell in N of the last M years" figure must be counted over
    this, and must publish M, or it quietly reports a gap as a flat year.
    """
    ys = sorted(y for y in years if y not in QUARANTINED)
    return [(a, b) for a, b in zip(ys, ys[1:]) if b - a == 1]


def note(prefix="Note"):
    """One sentence for a methodology block."""
    return "; ".join(f"{prefix}: {y} is omitted because {why}" for y, why in sorted(QUARANTINED.items()))
