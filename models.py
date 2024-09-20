from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

db = SQLAlchemy()

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), index=True, unique=True)
    email = db.Column(db.String(120), index=True, unique=True)
    password_hash = db.Column(db.String(128))
    learning_paths = db.relationship('LearningPath', backref='user', lazy='dynamic')
    interests = db.Column(db.String(500))  # Store interests as a comma-separated string
    browsing_history = db.relationship('BrowsingHistory', backref='user', lazy='dynamic')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def add_interest(self, interest):
        if self.interests:
            interests = set(self.interests.split(','))
            interests.add(interest)
            self.interests = ','.join(interests)
        else:
            self.interests = interest

    def get_interests(self):
        return self.interests.split(',') if self.interests else []

class LearningPath(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(120))
    description = db.Column(db.Text)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    resources = db.relationship('Resource', backref='learning_path', lazy='dynamic')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Resource(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(120))
    url = db.Column(db.String(250))
    learning_path_id = db.Column(db.Integer, db.ForeignKey('learning_path.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class BrowsingHistory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    resource_id = db.Column(db.Integer, db.ForeignKey('resource.id'))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    resource = db.relationship('Resource')
