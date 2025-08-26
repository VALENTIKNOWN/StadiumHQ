from flask import Flask
import requests


api_key = "922fac827c174d7eb7a220980df348fd"

app = Flask("Flask")

@app.route('/')
def random_receipt():

    # BASE API URL
    random_receipt_endpoint = "https://api.spoonacular.com/recipes/random"

    params = {
        "limitLicense": "true",
        "apiKey": api_key,
        "number": 1,
        "tags": "vegetarian,italian"
    }

    result = requests.get(random_receipt_endpoint, params=params)
    results = result.json()

    return results["recipes"][0]["title"]