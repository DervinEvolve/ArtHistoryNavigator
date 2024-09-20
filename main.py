from flask import Flask, render_template, request, jsonify
from utils.api_helpers import search_wikipedia, search_internet_archive, search_met_museum

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
    wikipedia_results = search_wikipedia(query)
    internet_archive_results = search_internet_archive(query)
    met_museum_results = search_met_museum(query)
    
    results = {
        "wikipedia": wikipedia_results,
        "internet_archive": internet_archive_results,
        "met_museum": met_museum_results
    }
    
    return jsonify(results)

@app.route("/details/<source>/<id>")
def details(source, id):
    return render_template("details.html", source=source, id=id)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
