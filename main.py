from flask import Flask, render_template, request, jsonify, session
from utils.api_helpers import perform_search
import asyncio
import logging
import math
import os
from collections import Counter

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY') or 'you-will-never-guess'

logging.basicConfig(level=logging.INFO)

# Simple in-memory storage for search history (in a real application, this should be a database)
search_history = Counter()

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
    api = request.args.get("api", "openai")
    results_per_page = 20

    logging.info(f"Received search request for query: {query}, page: {page}, api: {api}")

    try:
        all_results = await perform_search(query, api)
        logging.info(f"Search results: {all_results}")

        # Update search history
        search_history[query.lower()] += 1

        total_results = sum(len(results) for results in all_results['results'].values())
        total_pages = math.ceil(total_results / results_per_page)

        start_index = (page - 1) * results_per_page
        end_index = start_index + results_per_page

        paginated_results = {
            source: results[start_index:end_index]
            for source, results in all_results['results'].items()
        }

        # Get recommendations based on search history
        recommendations = get_recommendations(query)

        logging.info(f"Returning paginated results: {paginated_results}")

        return jsonify({
            "results": paginated_results,
            "current_page": page,
            "total_pages": total_pages,
            "total_results": total_results,
            "errors": all_results['errors'],
            "recommendations": recommendations
        })
    except Exception as e:
        logging.error(f"Error in api_search: {str(e)}")
        return jsonify({"error": "An error occurred while fetching search results. Please try again later."}), 500

def get_recommendations(query, limit=5):
    # Simple recommendation system based on search history
    related_terms = {
        "painting": ["canvas", "oil", "acrylic", "watercolor"],
        "sculpture": ["marble", "bronze", "clay", "wood"],
        "artist": ["painter", "sculptor", "photographer", "printmaker"],
        "museum": ["gallery", "exhibition", "collection", "curator"],
        "renaissance": ["baroque", "medieval", "classical", "modern"],
    }

    recommendations = []
    query_terms = query.lower().split()

    # Add related terms
    for term in query_terms:
        if term in related_terms:
            recommendations.extend(related_terms[term])

    # Add popular searches
    popular_searches = search_history.most_common(10)
    recommendations.extend([search for search, _ in popular_searches if search not in query_terms])

    # Remove duplicates and limit the number of recommendations
    return list(dict.fromkeys(recommendations))[:limit]

@app.route('/visualize')
def visualize():
    return render_template('visualize.html')

@app.errorhandler(404)
def page_not_found(e):
    return render_template("404.html"), 404

@app.errorhandler(500)
def internal_server_error(e):
    logging.error(f"Internal server error: {str(e)}")
    return render_template("500.html"), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
