import face_recognition
import os
from app.models import Person
from app import app

def train_model():
    known_faces = []
    known_names = []
    
    for person in Person.query.all():
        for image in person.images:
            full_path = os.path.join(app.config['UPLOAD_FOLDER'], image.image_path)
            image_data = face_recognition.load_image_file(full_path)
            encoding = face_recognition.face_encodings(image_data)[0]
            known_faces.append(encoding)
            known_names.append(person.name)
    
    return known_faces, known_names

def recognize_face(image_path):
    known_faces, known_names = train_model()
    
    unknown_image = face_recognition.load_image_file(image_path)
    face_locations = face_recognition.face_locations(unknown_image)
    
    if not face_locations:
        return "No face detected in the image"
    
    unknown_encoding = face_recognition.face_encodings(unknown_image, face_locations)[0]
    
    results = face_recognition.compare_faces(known_faces, unknown_encoding)
    
    if True in results:
        return known_names[results.index(True)]
    else:
        return "Unknown face detected"
