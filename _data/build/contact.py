"""The one contact address these fetch scripts identify themselves with.

WHY THIS EXISTS. Census, BLS, OpenAlex, USAspending and the rest run "polite pools": send a
real contact and you get the higher rate limit and a warning email instead of a silent ban.
So the address has to be real, and it has to be in every request.

It used to be typed into 45 files. That is fine until the day it has to change — and it
will, because this repository is public and the address in it is a person's inbox. One
constant makes that a one-line edit instead of a 45-file sweep done under time pressure by
whoever inherits this.

TO CHANGE IT: set PIC_CONTACT in the environment, or edit the default below. A role mailbox
is better than an individual's for published code, but ONLY if someone actually reads it —
an address that bounces is worse than a personal one, because the polite pools use it to
tell you that you are doing something wrong.
"""
import os

CONTACT = os.environ.get("PIC_CONTACT", "jswanson@greaterakronchamber.org")

# Most scripts want the header; a few APIs take the address as a query parameter instead.
UA = {"User-Agent": f"PIC-viz/1.0 ({CONTACT})"}
MAILTO = f"&mailto={CONTACT}"
