from datetime import datetime
from app import db

class Person(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    images = db.relationship('PersonImage', backref='person', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'images': [image.to_dict() for image in self.images]
        }
    def __repr__(self):
        return f"<Person {self.name}>"

class PersonImage(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    image_path = db.Column(db.String(255), nullable=False)
    person_id = db.Column(db.Integer, db.ForeignKey('person.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'path': f'/uploads/{self.image_path}',
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S')
        }

class ModelStats(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    last_trained = db.Column(db.DateTime, default=datetime.utcnow)
    accuracy = db.Column(db.Float)
    total_images = db.Column(db.Integer)
    training_time = db.Column(db.Float)
