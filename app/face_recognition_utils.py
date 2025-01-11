import os
import numpy as np
import tensorflow as tf
from tensorflow.keras.preprocessing.image import load_img, img_to_array
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
import cv2
import pickle

class FaceRecognitionSystem:
    def __init__(self, app):
        self.app = app
        self.model = None
        self.class_names = []
        self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        self.model_path = os.path.join(app.config['UPLOAD_FOLDER'], 'face_recognition_model')
        self.labels_path = os.path.join(app.config['UPLOAD_FOLDER'], 'class_names.pkl')
        self.load_model()

    def load_model(self):
        """Load the trained model and class names"""
        try:
            if os.path.exists(self.model_path):
                self.model = tf.keras.models.load_model(self.model_path)
            
            if os.path.exists(self.labels_path):
                with open(self.labels_path, 'rb') as f:
                    self.class_names = pickle.load(f)
        except Exception as e:
            print(f"Error loading model: {str(e)}")

    def preprocess_image(self, image_path):
        """Preprocess image for model input"""
        try:
            # Load and preprocess image
            img = load_img(image_path, target_size=(224, 224))
            img_array = img_to_array(img)
            img_array = np.expand_dims(img_array, axis=0)
            img_array = preprocess_input(img_array)
            return img_array
        except Exception as e:
            raise Exception(f"Error preprocessing image: {str(e)}")

    def detect_faces(self, image_path):
        """Detect faces in image"""
        try:
            img = cv2.imread(image_path)
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            faces = self.face_cascade.detectMultiScale(gray, 1.1, 4)
            return faces, img
        except Exception as e:
            raise Exception(f"Error detecting faces: {str(e)}")

    def recognize_face(self, image_path):
        """Recognize face in image"""
        try:
            if not self.model:
                raise Exception("Model not loaded. Please train the model first.")

            if not self.class_names:
                raise Exception("No classes found. Please train the model first.")

            # Detect faces
            faces, img = self.detect_faces(image_path)
            
            if len(faces) == 0:
                raise Exception("No faces detected in image")

            if len(faces) > 1:
                raise Exception("Multiple faces detected. Please use an image with a single face")

            # Process the detected face
            x, y, w, h = faces[0]
            face_img = img[y:y+h, x:x+w]
            face_img = cv2.resize(face_img, (224, 224))
            face_img = cv2.cvtColor(face_img, cv2.COLOR_BGR2RGB)
            
            # Preprocess for model
            face_array = img_to_array(face_img)
            face_array = np.expand_dims(face_array, axis=0)
            face_array = preprocess_input(face_array)

            # Get prediction
            predictions = self.model.predict(face_array)
            predicted_class = np.argmax(predictions[0])
            confidence = float(predictions[0][predicted_class])

            return {
                'name': self.class_names[predicted_class],
                'confidence': confidence * 100,
                'bbox': [int(x), int(y), int(w), int(h)]
            }

        except Exception as e:
            raise Exception(f"Recognition failed: {str(e)}")

    def save_model_and_labels(self, model, class_names):
        """Save the trained model and class names"""
        try:
            # Save model
            model.save(self.model_path)
            
            # Save class names
            with open(self.labels_path, 'wb') as f:
                pickle.dump(class_names, f)
            
            # Update current model and class names
            self.model = model
            self.class_names = class_names
            
        except Exception as e:
            raise Exception(f"Error saving model: {str(e)}") 