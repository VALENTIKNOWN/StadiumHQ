import requests

SUMMARY_URL = "https://en.wikipedia.org/api/rest_v1/page/summary/{title}"
QUERY_URL = "https://en.wikipedia.org/w/api.php"

HEADERS = {
    "User-Agent": "StadiumHQ/1.1 (contact: example@example.com)",
    "Accept": "application/json",
}

def _summary(title):
    url = SUMMARY_URL.format(title=title.replace(" ", "_"))
    r = requests.get(url, headers=HEADERS, timeout=10)
    if r.status_code == 200:
        return r.json()
    return None

def _query_details(title):
    params = {
        "action": "query",
        "format": "json",
        "formatversion": "2",
        "prop": "coordinates|pageimages|info|extracts",
        "inprop": "url",
        "exintro": "1",
        "explaintext": "1",
        "piprop": "thumbnail|original",
        "pithumbsize": "1200",
        "titles": title,
    }
    r = requests.get(QUERY_URL, params=params, headers=HEADERS, timeout=10)
    if r.status_code != 200:
        return None
    data = r.json()
    pages = (data.get("query") or {}).get("pages") or []
    if not pages:
        return None
    return pages[0]

def get_wiki_summary(title):
    data_sum = _summary(title)
    if not data_sum:
        return {
            "title": title,
            "description": None,
            "extract": "No information found on Wikipedia.",
            "image": "",
            "original_image": "",
            "url": "",
            "coordinates": None,
            "lang": None,
        }

    page_title = data_sum.get("title") or title

    details = _query_details(page_title) or {}

    coords = (details.get("coordinates") or [{}])[0] if details.get("coordinates") else None

    image = (data_sum.get("thumbnail") or {}).get("source", "")
    original_image = ""
    if details.get("original"):
        original_image = details["original"].get("source") or ""

    return {
        "title": page_title,
        "description": data_sum.get("description"),
        "extract": data_sum.get("extract") or details.get("extract"),
        "image": image or (details.get("thumbnail") or {}).get("source", ""),
        "original_image": original_image,
        "url": ((data_sum.get("content_urls") or {}).get("desktop") or {}).get("page", ""),
        "coordinates": coords,
        "lang": details.get("pagelanguage"),
    }
