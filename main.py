from flask import Flask, render_template, request, jsonify, redirect, url_for, flash
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from flask_migrate import Migrate
from urllib.parse import urlparse
from utils.api_helpers import perform_search
from models import db, User, LearningPath
import asyncio
import logging
import math
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY') or 'you-will-never-guess'
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL') or 'sqlite:///app.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)
migrate = Migrate(app, db)

login_manager = LoginManager(app)
login_manager.login_view = 'login'

logging.basicConfig(level=logging.INFO)

@login_manager.user_loader
def load_user(id):
    return User.query.get(int(id))

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

@app.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    if request.method == 'POST':
        username = request.form['username']
        email = request.form['email']
        password = request.form['password']
        user = User.query.filter_by(username=username).first()
        if user is not None:
            flash('Please use a different username.')
            return redirect(url_for('register'))
        user = User.query.filter_by(email=email).first()
        if user is not None:
            flash('Please use a different email address.')
            return redirect(url_for('register'))
        user = User(username=username, email=email)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        flash('Congratulations, you are now a registered user!')
        return redirect(url_for('login'))
    return render_template('register.html', title='Register')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    if request.method == 'POST':
        user = User.query.filter_by(username=request.form['username']).first()
        if user is None or not user.check_password(request.form['password']):
            flash('Invalid username or password')
            return redirect(url_for('login'))
        login_user(user, remember=request.form.get('remember_me'))
        next_page = request.args.get('next')
        if not next_page or urlparse(next_page).netloc != '':
            next_page = url_for('index')
        return redirect(next_page)
    return render_template('login.html', title='Sign In')

@app.route('/logout')
def logout():
    logout_user()
    return redirect(url_for('index'))

@app.route('/profile')
@login_required
def profile():
    return render_template('profile.html', title='Profile')

@app.route('/create_learning_path', methods=['GET', 'POST'])
@login_required
def create_learning_path():
    if request.method == 'POST':
        title = request.form['title']
        description = request.form['description']
        learning_path = LearningPath(title=title, description=description, user=current_user)
        db.session.add(learning_path)
        db.session.commit()
        flash('Your learning path has been created!')
        return redirect(url_for('profile'))
    return render_template('create_learning_path.html', title='Create Learning Path')

@app.route('/learning_path/<int:path_id>')
@login_required
def view_learning_path(path_id):
    learning_path = LearningPath.query.get_or_404(path_id)
    if learning_path.user != current_user:
        flash('You do not have permission to view this learning path.')
        return redirect(url_for('profile'))
    return render_template('view_learning_path.html', title='View Learning Path', learning_path=learning_path)

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
        'type': 'FeatureCollection',
        'features': [
            {
                'type': 'Feature',
                'properties': {
                    'title': 'Paris',
                    'description': 'Capital of France',
                    'century': 21
                },
                'geometry': {
                    'type': 'Point',
                    'coordinates': [2.3522, 48.8566]
                }
            },
            {
                'type': 'Feature',
                'properties': {
                    'title': 'London',
                    'description': 'Capital of the United Kingdom',
                    'century': 21
                },
                'geometry': {
                    'type': 'Point',
                    'coordinates': [-0.1278, 51.5074]
                }
            },
            {
                'type': 'Feature',
                'properties': {
                    'title': 'New York',
                    'description': 'Largest city in the United States',
                    'century': 21
                },
                'geometry': {
                    'type': 'Point',
                    'coordinates': [-74.0060, 40.7128]
                }
            },
            {
                'type': 'Feature',
                'properties': {
                    'title': 'Tokyo',
                    'description': 'Capital of Japan',
                    'century': 21
                },
                'geometry': {
                    'type': 'Point',
                    'coordinates': [139.6503, 35.6762]
                }
            },
            {
                'type': 'Feature',
                'properties': {
                    'title': 'Sydney',
                    'description': 'Largest city in Australia',
                    'century': 21
                },
                'geometry': {
                    'type': 'Point',
                    'coordinates': [151.2093, -33.8688]
                }
            },
            {
                'type': 'Feature',
                'properties': {
                    'title': 'Moscow',
                    'description': 'Capital of Russia',
                    'century': 21
                },
                'geometry': {
                    'type': 'Point',
                    'coordinates': [37.6173, 55.7558]
                }
            },
            {
                'type': 'Feature',
                'properties': {
                    'title': 'Rio de Janeiro',
                    'description': 'Second-largest city in Brazil',
                    'century': 21
                },
                'geometry': {
                    'type': 'Point',
                    'coordinates': [-43.1729, -22.9068]
                }
            },
            {
                'type': 'Feature',
                'properties': {
                    'title': 'Cairo',
                    'description': 'Capital of Egypt',
                    'century': 21
                },
                'geometry': {
                    'type': 'Point',
                    'coordinates': [31.2357, 30.0444]
                }
            },
            {
                'type': 'Feature',
                'properties': {
                    'title': 'New Delhi',
                    'description': 'Capital of India',
                    'century': 21
                },
                'geometry': {
                    'type': 'Point',
                    'coordinates': [77.2090, 28.6139]
                }
            }
        ]
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