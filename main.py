from flask import Flask, render_template, request, jsonify
from utils.api_helpers import search_wikipedia, search_internet_archive, search_met_museum
import requests

app = Flask(__name__)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/search")
def search():
    query = request.args.get("q", "")
    return render_template("search.html", query=query)

@app.route("/api/search")
def api_search():
    query = request.args.get("q", "")
    try:
        wikipedia_results = search_wikipedia(query)
        internet_archive_results = search_internet_archive(query)
        met_museum_results = search_met_museum(query)
        
        results = {
            "wikipedia": wikipedia_results,
            "internet_archive": internet_archive_results,
            "met_museum": met_museum_results
        }
        
        return jsonify(results)
    except requests.RequestException as e:
        return jsonify({"error": "An error occurred while fetching search results. Please try again later."}), 500

@app.route("/details/<source>/<id>")
def details(source, id):
    return render_template("details.html", source=source, id=id)

@app.errorhandler(404)
def page_not_found(e):
    return render_template("404.html"), 404

@app.errorhandler(500)
def internal_server_error(e):
    return render_template("500.html"), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
