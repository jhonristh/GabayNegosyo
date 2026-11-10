"""Import supplied video cells; retain original status metadata for provenance.
Usage: python3 scripts/import-video-workbook.py workbook.xlsx
"""
import json, re, sys, zipfile, xml.etree.ElementTree as ET
from pathlib import Path
from urllib.parse import urlparse, parse_qs, urlencode
root = Path(__file__).resolve().parents[1]
ns = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
with zipfile.ZipFile(sys.argv[1]) as z:
    strings = ["".join(s.itertext()) for s in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("m:si", ns)]
    rows = []
    for row in ET.fromstring(z.read("xl/worksheets/sheet3.xml")).findall(".//m:row", ns)[1:]:
        values = {}
        for c in row.findall("m:c", ns):
            v = c.find("m:v", ns)
            inline = c.find("m:is", ns)
            values[re.sub(r"\d", "", c.get("r"))] = strings[int(v.text)] if v is not None and c.get("t") == "s" else v.text if v is not None else "".join(inline.itertext()) if inline is not None else ""
        rows.append(values)
def read(name): return json.loads((root / "data" / name).read_text())
def write(name, data): (root / "data" / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
mapping = {
 "V-01": ("tut-dti-registration", "dti", "registration", "dti-registration"),
 "V-02": ("tut-lgu-permit-application", "lgu", "application", "barangay-clearance"),
 "V-04": ("tut-bmbe-registration", "dti", "registration", "bmbe"),
 "V-06": ("tut-lgu-renewal", "lgu", "renewal", "mayor-permit-renewal"),
 "V-07": ("tut-barangay-renewal", "lgu", "renewal", "barangay-renewal"),
 "V-08": ("tut-bir-1701", "bir", "filing", "bir-1701-self-employed"),
 "V-09": ("tut-bir-1701q", "bir", "filing", "bir-1701q-quarterly"),
 "V-10": ("tut-bir-1701a", "bir", "filing", "bir-1701a-8percent"),
 "V-11": ("tut-bir-1701ms", "bir", "filing", None),
 "V-12": ("tut-sss-contribution", "sss", "contribution", "sss-contribution"),
 "V-13": ("tut-philhealth-contribution", "philhealth", "contribution", "philhealth-contribution"),
 "V-14": ("tut-pagibig-contribution", "pagibig", "contribution", "pagibig-contribution"),
 "V-15": ("tut-bir-registration", "bir", "registration", "bir-registration"),
}
catalog = read("tutorials.json")
by_id = {t["id"]: t for t in catalog}
links = read("finalLinksDatabase.json")
link_by_id = {v["id"]: v for v in links["videos"]}
requirements = read("requirements.json")
for row in rows:
    if not row.get("A", "").startswith("V-"): continue
    rid, subject, raw = row["A"], row["B"], row.get("C", "").strip()
    entry = link_by_id[rid]
    entry["workbookUrl"] = raw
    entry["workbookSource"] = "FinalGabayNegosyo_Forms_Links_Database_v2(1).xlsx / Video Tutorials / " + rid
    u = urlparse(raw)
    vid = u.path.lstrip("/") if u.hostname == "youtu.be" else parse_qs(u.query).get("v", [""])[0]
    valid = bool(re.fullmatch(r"[\w-]{11}", vid))
    entry["url"] = raw
    entry["urlStatus"] = "Supplied in updated workbook; live playback unverified" if valid else "TRUNCATED - complete video ID required"
    if not valid or rid not in mapping: continue
    tid, agency, category, requirement = mapping[rid]
    params = {"v": vid}
    if "t" in parse_qs(u.query): params["t"] = parse_qs(u.query)["t"][0]
    normalized = "https://www.youtube.com/watch?" + urlencode(params)
    t = by_id.get(tid, {"id": tid})
    t.update(title=subject, description="Video walkthrough: " + subject + ".", videoUrl=normalized,
             agencyId=agency, category=category, isPlaceholder=False, archived=False)
    if requirement: t["relatedRequirementId"] = requirement
    if tid not in by_id: catalog.append(t); by_id[tid] = t
    if requirement:
        for r in requirements:
            if r["id"] == requirement: r["tutorialId"] = tid
# No registration video was supplied for these topics; contribution videos
# must not be mislabeled as employer-registration walkthroughs.
for tid in ["tut-sss-registration", "tut-philhealth-registration", "tut-pagibig-registration"]:
    by_id[tid]["archived"] = True
for r in requirements:
    if r["id"] == "mayor-permit": r["tutorialId"] = "tut-lgu-permit-application"
write("tutorials.json", catalog)
write("requirements.json", requirements)
write("finalLinksDatabase.json", links)
write("filingVideos.json", [{"id": t["id"], "title": t["title"], "category": t["category"], "videoUrl": t["videoUrl"]} for t in catalog if not t.get("archived") and not t["isPlaceholder"]])
print("Imported", len([t for t in catalog if not t.get("archived") and not t["isPlaceholder"]]), "unique videos; DTI renewal remains truncated.")
