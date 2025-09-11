from flask import Flask, request, jsonify
import requests

# 
# api_key = "922fac827c174d7eb7a220980df348fd"

app = Flask("Flask")

@app.route("/")
def health_check():
    return "Welcome!"

@app.route('/search')
def random_receipt():
    stadium_name = request.args.get('stadium')

    # BASE API URL
    endpoint = "https://en.wikipedia.org/w/rest.php/v1/search/page"

    params = {
        "q": stadium_name,
        "limit": 1,
    }

    headers = {
        'User-Agent': 'MyStadiumApp/1.0 (your_email@example.com)'
    }

    try:
        result = requests.get(endpoint, params=params, headers=headers)
        result.raise_for_status()

        search_results = result.json()
        print(f"Searched: {search_results}")

        if not search_results.get("pages"):
            return jsonify({"error": f"No stadium found for '{stadium_name}'."}), 404

        first_result = search_results["pages"][0]
        stadium_data = {
            "title": first_result.get("title", "N/A"),
            "description": first_result.get("description", "No description available."),
            "wikipedia_url": f"https://en.wikipedia.org/wiki/{first_result.get('key')}"
        }

        return jsonify(stadium_data), 200

    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"API request failed: {str(e)}"}), 500
    except KeyError:
        return jsonify({"error": "Unexpected API response format."}), 500
    
if __name__ == "__main__":
    app.run()