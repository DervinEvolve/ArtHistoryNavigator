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
    collections = db.relationship('Collection', backref='user', lazy='dynamic')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class LearningPath(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(120))
    description = db.Column(db.Text)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    resources = db.relationship('Resource', backref='learning_path', lazy='dynamic')

class Resource(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(120))
    url = db.Column(db.String(250))
    learning_path_id = db.Column(db.Integer, db.ForeignKey('learning_path.id'))
    collections = db.relationship('Collection', secondary='collection_resources', back_populates='resources')

class Collection(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(120))
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    resources = db.relationship('Resource', secondary='collection_resources', back_populates='collections')

collection_resources = db.Table('collection_resources',
    db.Column('collection_id', db.Integer, db.ForeignKey('collection.id'), primary_key=True),
    db.Column('resource_id', db.Integer, db.ForeignKey('resource.id'), primary_key=True)
)
