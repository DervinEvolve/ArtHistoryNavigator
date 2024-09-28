from flask import Flask, render_template, request, jsonify, redirect, url_for
from flask_migrate import Migrate
from utils.api_helpers import perform_search
from models import db, LearningPath, Resource, Collection
import asyncio
import logging
import math
import os
import json
import click

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY') or 'you-will-never-guess'
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL') or 'sqlite:///app.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)
migrate = Migrate(app, db)

logging.basicConfig(level=logging.INFO)

@app.cli.command("init-db")
def init_db():
    db.create_all()
    click.echo("Database initialized.")

@app.cli.command("hello")
def hello():
    click.echo("Hello from Flask!")

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

        total_results = sum(len(results) for results in all_results['results'].values())
        total_pages = math.ceil(total_results / results_per_page)

        start_index = (page - 1) * results_per_page
        end_index = start_index + results_per_page

        paginated_results = {
            source: results[start_index:end_index]
            for source, results in all_results['results'].items()
        }

        logging.info(f"Returning paginated results: {paginated_results}")

        return jsonify({
            "results": paginated_results,
            "current_page": page,
            "total_pages": total_pages,
            "total_results": total_results,
            "errors": all_results['errors']
        })
    except Exception as e:
        logging.error(f"Error in api_search: {str(e)}")
        return jsonify({"error": "An error occurred while fetching search results. Please try again later."}), 500

@app.route("/details/<source>/<id>")
def details(source, id):
    return render_template("details.html", source=source, id=id)

@app.route('/create_learning_path', methods=['GET', 'POST'])
def create_learning_path():
    if request.method == 'POST':
        title = request.form['title']
        description = request.form['description']
        learning_path = LearningPath(title=title, description=description)
        db.session.add(learning_path)
        db.session.commit()
        return redirect(url_for('view_learning_path', path_id=learning_path.id))
    return render_template('create_learning_path.html', title='Create Learning Path')

@app.route('/learning_path/<int:path_id>')
def view_learning_path(path_id):
    learning_path = LearningPath.query.get_or_404(path_id)
    return render_template('view_learning_path.html', title='View Learning Path', learning_path=learning_path)

@app.route('/create_collection', methods=['GET', 'POST'])
def create_collection():
    if request.method == 'POST':
        title = request.form['title']
        description = request.form['description']
        collection = Collection(title=title, description=description)
        db.session.add(collection)
        db.session.commit()
        return redirect(url_for('view_collection', collection_id=collection.id))
    return render_template('create_collection.html', title='Create Collection')

@app.route('/collection/<int:collection_id>')
def view_collection(collection_id):
    collection = Collection.query.get_or_404(collection_id)
    return render_template('view_collection.html', title='View Collection', collection=collection)

@app.route('/add_to_collection/<int:collection_id>', methods=['POST'])
def add_to_collection(collection_id):
    collection = Collection.query.get_or_404(collection_id)
    
    data = request.json
    content = data.get('content')
    
    try:
        content_data = json.loads(content)
        title = content_data.get('title', 'Untitled')
        url = content_data.get('url', '#')
    except json.JSONDecodeError:
        return jsonify({'error': 'Invalid content data.'}), 400

    resource = Resource(title=title, url=url)
    db.session.add(resource)
    collection.resources.append(resource)
    db.session.commit()
    
    return jsonify({'message': 'Item added to collection successfully.'}), 200

@app.route('/collections')
def view_collections():
    collections = Collection.query.all()
    return render_template('collections.html', title='Collections', collections=collections)

@app.route('/api/collections')
def api_collections():
    try:
        collections = Collection.query.all()
        collections_data = [
            {
                'id': collection.id,
                'title': collection.title,
                'description': collection.description,
                'resource_count': len(collection.resources)
            }
            for collection in collections
        ]
        return jsonify(collections_data), 200
    except Exception as e:
        logging.error(f"Error in api_collections: {str(e)}")
        return jsonify({"error": "An error occurred while fetching collections. Please try again later."}), 500

@app.route('/visualize')
def visualize():
    timeline_data = [
        {'start_date': {'year': 1914}, 'end_date': {'year': 1918}, 'text': {'headline': 'World War I', 'text': 'The First World War'}},
        {'start_date': {'year': 1939}, 'end_date': {'year': 1945}, 'text': {'headline': 'World War II', 'text': 'The Second World War'}},
        {'start_date': {'year': 1969}, 'text': {'headline': 'Moon Landing', 'text': 'Apollo 11 lands on the moon'}},
        {'start_date': {'year': 1776}, 'text': {'headline': 'American Revolution', 'text': 'Declaration of Independence signed'}},
        {'start_date': {'year': 1789}, 'end_date': {'year': 1799}, 'text': {'headline': 'French Revolution', 'text': 'Period of radical social and political upheaval in France'}},
        {'start_date': {'year': 1989}, 'text': {'headline': 'Fall of the Berlin Wall', 'text': 'The fall of the Berlin Wall marks the end of the Cold War'}},
        {'start_date': {'year': 2001, 'month': 9, 'day': 11}, 'text': {'headline': '9/11 Attacks', 'text': 'Terrorist attacks in the United States'}},
        {'start_date': {'year': 2008}, 'text': {'headline': 'Global Financial Crisis', 'text': 'Worldwide economic downturn'}},
        {'start_date': {'year': 2020}, 'text': {'headline': 'COVID-19 Pandemic', 'text': 'Global pandemic caused by the SARS-CoV-2 virus'}}
    ]
    
    map_data = {
        "storymap": {
            "slides": [
                {
                    "type": "overview",
                    "text": {
                        "headline": "Historical Places",
                        "text": "An overview of important historical locations"
                    }
                },
                {
                    "location": {
                        "lat": 48.8566,
                        "lon": 2.3522
                    },
                    "text": {
                        "headline": "Paris",
                        "text": "Capital of France"
                    }
                },
                {
                    "location": {
                        "lat": 51.5074,
                        "lon": -0.1278
                    },
                    "text": {
                        "headline": "London",
                        "text": "Capital of the United Kingdom"
                    }
                },
                {
                    "location": {
                        "lat": 40.7128,
                        "lon": -74.0060
                    },
                    "text": {
                        "headline": "New York",
                        "text": "Largest city in the United States"
                    }
                },
                {
                    "location": {
                        "lat": 35.6762,
                        "lon": 139.6503
                    },
                    "text": {
                        "headline": "Tokyo",
                        "text": "Capital of Japan"
                    }
                },
                {
                    "location": {
                        "lat": -33.8688,
                        "lon": 151.2093
                    },
                    "text": {
                        "headline": "Sydney",
                        "text": "Largest city in Australia"
                    }
                },
                {
                    "location": {
                        "lat": 55.7558,
                        "lon": 37.6173
                    },
                    "text": {
                        "headline": "Moscow",
                        "text": "Capital of Russia"
                    }
                },
                {
                    "location": {
                        "lat": -22.9068,
                        "lon": -43.1729
                    },
                    "text": {
                        "headline": "Rio de Janeiro",
                        "text": "Second-largest city in Brazil"
                    }
                },
                {
                    "location": {
                        "lat": 30.0444,
                        "lon": 31.2357
                    },
                    "text": {
                        "headline": "Cairo",
                        "text": "Capital of Egypt"
                    }
                },
                {
                    "location": {
                        "lat": 28.6139,
                        "lon": 77.2090
                    },
                    "text": {
                        "headline": "New Delhi",
                        "text": "Capital of India"
                    }
                }
            ]
        }
    }
    
    return render_template('visualize.html', title='Visualize', timeline_data=timeline_data, map_data=map_data)

@app.errorhandler(404)
def page_not_found(e):
    return render_template("404.html"), 404

@app.errorhandler(500)
def internal_server_error(e):
    logging.error(f"Internal server error: {str(e)}")
    return render_template("500.html"), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
