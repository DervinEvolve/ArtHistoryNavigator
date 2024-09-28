from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class LearningPath(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(120))
    description = db.Column(db.Text)
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
    resources = db.relationship('Resource', secondary='collection_resources', back_populates='collections')

collection_resources = db.Table('collection_resources',
    db.Column('collection_id', db.Integer, db.ForeignKey('collection.id'), primary_key=True),
    db.Column('resource_id', db.Integer, db.ForeignKey('resource.id'), primary_key=True)
)
