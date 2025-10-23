from flask import Flask, render_template, request
from wiki_utils import get_wiki_summary

app = Flask(__name__)

STADIUMS = [
    "Emirates Stadium",
    "Tottenham Hotspur Stadium",
    "Wembley Stadium",
    "Stamford Bridge",
]

@app.route("/")
def index():
    stadiums_data = [get_wiki_summary(name) for name in STADIUMS]
    page_title = "Stadiums in London"
    return render_template("index.html", stadiums=stadiums_data, page_title=page_title)

@app.route("/details/<stadium_name>")
def details(stadium_name):
    stadium = get_wiki_summary(stadium_name)
    return render_template("details.html", stadium=stadium)

@app.route("/map")
def map_page():
    stadiums = [get_wiki_summary(name) for name in STADIUMS]
    center = {"lat": 51.5074, "lon": -0.1278}  # London default
    coords = [s["coordinates"] for s in stadiums if s.get("coordinates")]
    # Build OpenStreetMap Static Map URL (no JS)
    # Multiple markers: repeat &markers=LAT,LON,red-pushpin
    markers = "&".join([f"markers={c['lat']},{c['lon']},red-pushpin" for c in coords])
    map_url = (
        f"https://staticmap.openstreetmap.de/staticmap.php?"
        f"center={center['lat']},{center['lon']}&zoom=11&size=800x480&{markers}"
        if markers else
        f"https://staticmap.openstreetmap.de/staticmap.php?"
        f"center={center['lat']},{center['lon']}&zoom=11&size=800x480"
    )
    return render_template("map.html", map_url=map_url, stadiums=stadiums, center=center)


@app.route("/profiles/<username>")
def profiles(username):
    profile = {
        "name": username.title(),
        "username": username,
        "joined": "2025",
        "reviews": [
            {"title": "Electric atmosphere!", "desc": "Amazing crowd energy."},
            {"title": "Great experience", "desc": "Seats comfy, parking chaotic."},
        ]
    }
    return render_template("profiles.html", profile=profile)

@app.route("/reviews")
def reviews():
    reviews_data = [
        {"user": "Lucas Bennett", "rating": 5, "text": "Loved my visit!", "likes": 25},
        {"user": "Olivia Carter", "rating": 4, "text": "Good but expensive snacks.", "likes": 18},
        {"user": "Noah Walker", "rating": 3, "text": "Seats weren’t comfy.", "likes": 12},
    ]
    return render_template("reviews.html", reviews=reviews_data)

@app.route("/search")
def search():
    q = (request.args.get("q") or "").strip()
    all_items = [get_wiki_summary(name) for name in STADIUMS]
    if not q:
        results = all_items
    else:
        q_low = q.lower()
        results = [
            s for s in all_items
            if (s.get("title") and q_low in s["title"].lower())
            or (s.get("extract") and q_low in s["extract"].lower())
            or (s.get("description") and q_low in s["description"].lower())
        ]
    return render_template("search.html", results=results, q=q)

if __name__ == "__main__":
    app.run(debug=True)
