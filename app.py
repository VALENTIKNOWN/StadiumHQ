from flask import Flask, render_template
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
    return render_template("map.html")

@app.route("/profiles/<username>")
def profiles(username):
    profile = {
        "name": username.title(),
        "username": username,
        "joined": "2021",
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
    results = [get_wiki_summary(name) for name in STADIUMS]
    return render_template("search.html", results=results)

if __name__ == "__main__":
    app.run(debug=True)
