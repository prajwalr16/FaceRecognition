import os
from flask import render_template, request, redirect, url_for, flash, jsonify, send_from_directory
from werkzeug.utils import secure_filename
from app import app, db
from app.models import Person, PersonImage, ModelStats
from app.face_recognition_tf import train_model, recognize_face
import os
from datetime import datetime
import time
from threading import Thread
from app.training_utils import ModelTrainer
import json
from app.face_recognition_utils import FaceRecognitionSystem
import cv2
import numpy as np
import tensorflow as tf

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Global variable to store training status
training_status = {
    'is_training': False,
    'progress': 0,
    'message': '',
    'error': None
}

# Initialize face recognition system and model trainer
face_recognition = FaceRecognitionSystem(app)
model_trainer = ModelTrainer(app)

def cleanup_temp_files():
    """Remove old temporary files"""
    temp_dir = os.path.join(app.config['UPLOAD_FOLDER'], 'temp')
    if os.path.exists(temp_dir):
        for file in os.listdir(temp_dir):
            file_path = os.path.join(temp_dir, file)
            # Remove files older than 1 hour
            if os.path.isfile(file_path) and time.time() - os.path.getmtime(file_path) > 3600:
                try:
                    os.remove(file_path)
                except Exception as e:
                    print(f"Error removing temporary file {file}: {str(e)}")

# Add this to your routes
@app.before_request
def before_request():
    cleanup_temp_files()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/persons')
def get_persons():
    persons = Person.query.all()
    return jsonify([person.to_dict() for person in persons])

@app.route('/person', methods=['POST'])
def add_person():
    if 'files[]' not in request.files:
        flash('No files selected', 'error')
        return redirect(url_for('index'))
    
    files = request.files.getlist('files[]')
    name = request.form.get('name')
    
    if not name:
        flash('No name provided', 'error')
        return redirect(url_for('index'))
    
    if not files or files[0].filename == '':
        flash('No selected files', 'error')
        return redirect(url_for('index'))
    
    try:
        # Create new person
        new_person = Person(name=name)
        db.session.add(new_person)
        db.session.flush()

        # Ensure the directory exists
        upload_folder = os.path.join(app.config['UPLOAD_FOLDER'], 'faceimages')
        os.makedirs(upload_folder, exist_ok=True)
        
        # Process each uploaded file
        for file in files:
            if file and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                file_path = os.path.join(upload_folder, filename)
                file.save(file_path)
                
                new_image = PersonImage(image_path=f'faceimages/{filename}', person_id=new_person.id)
                db.session.add(new_image)
        
        db.session.commit()
        flash(f'Person {name} added successfully with {len(files)} images', 'success')
        
    except Exception as e:
        db.session.rollback()
        flash(f'Error adding person: {str(e)}', 'error')
    
    return redirect(url_for('index'))

@app.route('/person/<int:person_id>', methods=['PUT'])
def update_person(person_id):
    person = Person.query.get_or_404(person_id)
    data = request.get_json()
    
    if 'name' in data:
        person.name = data['name']
        db.session.commit()
    
    return jsonify({'success': True})

@app.route('/person/<int:person_id>/image', methods=['POST'])
def add_person_image(person_id):
    person = Person.query.get_or_404(person_id)
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)

        # Ensure the directory exists
        upload_folder = os.path.join(app.config['UPLOAD_FOLDER'], 'faceimages')
        os.makedirs(upload_folder, exist_ok=True)

        file_path = os.path.join(upload_folder, filename)
        file.save(file_path)
        
        new_image = PersonImage(image_path=f'faceimages/{filename}', person_id=person.id)
        db.session.add(new_image)
        db.session.commit()
        
        return jsonify({'success': True}), 200
    
    return jsonify({'error': 'Invalid file'}), 400

@app.route('/person/<int:person_id>', methods=['DELETE'])
def delete_person(person_id):
    try:
        person = Person.query.get_or_404(person_id)
        
        # Delete associated image files
        for image in person.images:
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], 'faceimages', image.image_path)
            if os.path.exists(file_path):
                os.remove(file_path)
        
        db.session.delete(person)
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return str(e), 400

@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    try:
        # Normalize path separators
        filename = filename.replace('\\', '/')
        
        # Get the base upload directory
        upload_dir = os.path.abspath(app.config['UPLOAD_FOLDER'])
        
        # Check if file is in temp directory
        if 'temp/' in filename:
            return send_from_directory(upload_dir, filename)
        
        # For regular uploads
        return send_from_directory(upload_dir, filename)
        
    except Exception as e:
        print(f"Error serving file: {str(e)}")
        return jsonify({'error': str(e)}), 404

@app.route('/recognize', methods=['POST'])
def recognize():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        # Create temp directory if it doesn't exist
        temp_dir = os.path.join(app.config['UPLOAD_FOLDER'], 'temp')
        os.makedirs(temp_dir, exist_ok=True)

        # Save uploaded file with timestamp
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"{timestamp}_{secure_filename(file.filename)}"
        filepath = os.path.join(temp_dir, filename)
        file.save(filepath)

        try:
            # Process image and get prediction
            img = cv2.imread(filepath)
            if img is None:
                return jsonify({'error': 'Could not read image'}), 400

            # Preprocess image
            img = cv2.resize(img, (224, 224))
            img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            img_array = tf.keras.preprocessing.image.img_to_array(img)
            img_array = np.expand_dims(img_array, axis=0)
            img_array = tf.keras.applications.mobilenet_v2.preprocess_input(img_array)

            # Get prediction
            predictions = model_trainer.model.predict(img_array)
            predicted_class = np.argmax(predictions[0])
            confidence = float(predictions[0][predicted_class])

            # Get person name
            person_id = model_trainer.class_names[predicted_class]
            person = Person.query.get(int(person_id))
            
            # Generate URL with forward slashes
            image_url = url_for('uploaded_file', 
                              filename=os.path.join('temp', filename).replace('\\', '/'))
            
            result = {
                'name': person.name if person else 'Unknown',
                'confidence': float(confidence * 100),
                'image_url': image_url
            }
            
            print("Recognition result:", result)
            return jsonify(result)
            
        except Exception as e:
            print(f"Recognition error: {str(e)}")
            return jsonify({'error': f'Recognition failed: {str(e)}'}), 400
            
    except Exception as e:
        print(f"Server error: {str(e)}")
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/retrain', methods=['POST'])
def retrain():
    try:
        # Check if training_status is properly initialized
        if not hasattr(model_trainer, 'training_status') or not isinstance(model_trainer.training_status, dict):
            return jsonify({'error': 'Training status is unavailable'}), 500
        # Prevent starting multiple training sessions simultaneously
        if model_trainer.training_status.get('is_training', False):
            return jsonify({'error': 'Training is already in progress'}), 400

        print("Starting model training...")

        # Start training in a background thread
        thread = Thread(target=lambda: model_trainer.train_model(epochs=20))
        thread.daemon = True
        thread.start()

        return jsonify({'success': True, 'status': 'started'}), 200

    except Exception as e:
        print(f"Error starting training: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/training-progress')
def get_training_progress():
    try:
        training_status = model_trainer.training_status
        return jsonify({
            'is_training': training_status.get('is_training', False),
            'progress': training_status.get('progress', 0),
            'message': training_status.get('message', 'No message available'),
            'current_epoch': training_status.get('current_epoch', 0),
            'total_epochs': training_status.get('total_epochs', 0),
            'current_accuracy': training_status.get('current_accuracy', 0.0),
            'best_accuracy': training_status.get('best_accuracy', 0.0),
            'timestamp': datetime.utcnow().isoformat()
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/model-stats')
def get_model_stats():
    try:
        history_path = os.path.join(app.config['UPLOAD_FOLDER'], 'training_history.json')
        stats = {
            'last_trained': 'Never',
            'accuracy': 0,
            'total_images': PersonImage.query.count(),
            'total_persons': Person.query.count()
        }
        
        if os.path.exists(history_path):
            try:
                with open(history_path, 'r') as f:
                    history = json.load(f)
                    stats.update({
                        'last_trained': history.get('timestamp', 'Never'),
                        'accuracy': history.get('accuracy', 0)
                    })
            except Exception as e:
                print(f"Error reading training history: {str(e)}")
        
        return jsonify(stats)
    except Exception as e:
        print(f"Error getting model stats: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/static/<path:filename>')
def static_files(filename):
    return send_from_directory('static', filename)

@app.route('/person/<int:person_id>/name', methods=['PUT'])
def update_person_name(person_id):
    try:
        data = request.get_json()
        person = Person.query.get_or_404(person_id)
        person.name = data['name']
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return str(e), 400

@app.route('/person/<int:person_id>/images', methods=['POST'])
def add_person_images(person_id):
    if 'files[]' not in request.files:
        return 'No files uploaded', 400

    try:
        person = Person.query.get_or_404(person_id)
        files = request.files.getlist('files[]')
        
        for file in files:
            if file and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(file_path)
                
                new_image = PersonImage(image_path=filename, person_id=person.id)
                db.session.add(new_image)
        
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return str(e), 400

@app.route('/image/<int:image_id>', methods=['DELETE'])
def delete_image(image_id):
    try:
        image = PersonImage.query.get_or_404(image_id)
        
        # Delete the file
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], image.image_path)
        if os.path.exists(file_path):
            os.remove(file_path)
        
        db.session.delete(image)
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return str(e), 400

@app.route('/training-progress')
def training_progress():
    return jsonify(model_trainer.training_status)

@app.route('/training-history')
def training_history():
    history = model_trainer.load_training_history()
    return jsonify(history if history else {})

@app.route('/cleanup-temp', methods=['POST'])
def cleanup_temp():
    try:
        temp_dir = os.path.join(app.config['UPLOAD_FOLDER'], 'temp')
        if os.path.exists(temp_dir):
            # Remove files older than 1 hour
            current_time = time.time()
            for filename in os.listdir(temp_dir):
                filepath = os.path.join(temp_dir, filename)
                if os.path.isfile(filepath):
                    file_time = os.path.getmtime(filepath)
                    if current_time - file_time > 3600:  # 1 hour
                        try:
                            os.remove(filepath)
                        except Exception as e:
                            print(f"Error removing {filepath}: {e}")
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
