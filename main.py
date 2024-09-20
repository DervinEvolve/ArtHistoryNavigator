from flask import Flask, render_template, request, jsonify
from utils.api_helpers import perform_search
import asyncio
import logging
import math

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/search")
def search():
    query = request.args.get("q", "")
    return render_template("search.html", query=query)

@app.route("/api/search")
async def api_search():
    query = request.args.get("q", "")
    page = int(request.args.get("page", 1))
    results_per_page = 20

    logging.info(f"Received search request for query: {query}, page: {page}")

    try:
        all_results = await perform_search(query)
        logging.info(f"Search results: {all_results}")

        total_results = sum(len(results) for results in all_results.values())
        total_pages = math.ceil(total_results / results_per_page)

        start_index = (page - 1) * results_per_page
        end_index = start_index + results_per_page

        paginated_results = {
            "wikipedia": all_results["wikipedia"][start_index:end_index],
            "internet_archive": all_results["internet_archive"][start_index:end_index],
            "met_museum": all_results["met_museum"][start_index:end_index]
        }

        logging.info(f"Returning paginated results: {paginated_results}")

        return jsonify({
            "results": paginated_results,
            "current_page": page,
            "total_pages": total_pages
        })
    except Exception as e:
        logging.error(f"Error in api_search: {str(e)}")
        return jsonify({"error": "An error occurred while fetching search results. Please try again later."}), 500

@app.route("/details/<source>/<id>")
def details(source, id):
    return render_template("details.html", source=source, id=id)

@app.errorhandler(404)
def page_not_found(e):
    return render_template("404.html"), 404

@app.errorhandler(500)
def internal_server_error(e):
    logging.error(f"Internal server error: {str(e)}")
    return render_template("500.html"), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
