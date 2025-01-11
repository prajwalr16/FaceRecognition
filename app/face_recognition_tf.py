import tensorflow as tf
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout
from tensorflow.keras.models import Model
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.preprocessing.image import ImageDataGenerator
import numpy as np
import cv2
from PIL import Image
import os
from sklearn.preprocessing import LabelEncoder
from app import app, db
from app.models import Person, PersonImage
import joblib

# Define the image size we'll use for our model
IMG_SIZE = (224, 224)  # MobileNetV2 input size

def create_model(num_classes):
    base_model = MobileNetV2(weights='imagenet', include_top=False, input_shape=(IMG_SIZE[0], IMG_SIZE[1], 3))
    
    # Freeze most of the layers
    for layer in base_model.layers[:-20]:  # Only fine-tune the last few layers
        layer.trainable = False
    
    x = GlobalAveragePooling2D()(base_model.output)
    x = Dense(512, activation='relu')(x)
    x = Dropout(0.5)(x)
    x = Dense(256, activation='relu')(x)
    x = Dropout(0.3)(x)
    output = Dense(num_classes, activation='softmax')(x)
    
    model = Model(inputs=base_model.input, outputs=output)
    
    model.compile(optimizer=Adam(learning_rate=0.0001),
                 loss='categorical_crossentropy',
                 metrics=['accuracy'])
    
    return model

def augment_image(img_array):
    """Generate multiple augmented versions of a single image"""
    datagen = ImageDataGenerator(
        rotation_range=30,
        width_shift_range=0.2,
        height_shift_range=0.2,
        brightness_range=[0.7, 1.3],
        zoom_range=0.2,
        horizontal_flip=True,
        fill_mode='nearest'
    )
    
    # Expand dimensions to match expected input
    img_array = np.expand_dims(img_array, 0)
    
    # Generate 10 augmented versions of the image
    augmented_images = []
    for _ in range(10):  # Generate 10 variations of each image
        augmented = next(datagen.flow(img_array, batch_size=1))[0]
        augmented_images.append(augmented)
    
    return augmented_images

def preprocess_image(image_path):
    img = Image.open(image_path).convert('RGB')
    img = img.resize(IMG_SIZE)
    img_array = np.array(img) / 255.0  # Normalize pixel values
    return img_array

def detect_and_align_face(image_path):
    import cv2
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    
    img = cv2.imread(image_path)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, 1.3, 5)
    
    if len(faces) == 0:
        return None
    
    x, y, w, h = faces[0]
    face = img[y:y+h, x:x+w]
    face = cv2.resize(face, IMG_SIZE)
    return face

def train_model():
    persons = Person.query.all()
    num_classes = len(persons)
    
    if num_classes < 2:
        print("Need at least 2 persons in the database to train the model.")
        return None, 0.0

    X = []
    y = []
    
    # Collect data
    for person in persons:
        print(f"Processing images for {person.name}")
        for image in person.images:
            img_path = os.path.join(app.config['UPLOAD_FOLDER'], image.image_path)
            try:
                img_array = preprocess_image(img_path)
                if img_array is not None:
                    X.append(img_array)
                    y.append(person.name)
            except Exception as e:
                print(f"Error processing image {img_path}: {str(e)}")
                continue

    if len(X) == 0:
        print("No valid images found for training.")
        return None, 0.0

    X = np.array(X)
    
    # Convert labels
    le = LabelEncoder()
    y = le.fit_transform(y)
    y = tf.keras.utils.to_categorical(y, num_classes=num_classes)

    # Create and compile model
    model = create_model(num_classes)
    
    # Train model
    print("Training model...")
    history = model.fit(
        X, y,
        epochs=20,
        batch_size=32,
        validation_split=0.2,
        verbose=1
    )

    # Save model and label encoder
    model_path = os.path.join(app.config['UPLOAD_FOLDER'], 'face_recognition_model')
    le_path = os.path.join(app.config['UPLOAD_FOLDER'], 'label_encoder.joblib')
    
    model.save(model_path)
    joblib.dump(le, le_path)
    
    # Get final accuracy
    final_accuracy = history.history['accuracy'][-1]
    
    print(f"Model trained with accuracy: {final_accuracy:.4f}")
    return model, final_accuracy

def recognize_face(image_path):
    model_path = os.path.join(app.config['UPLOAD_FOLDER'], 'face_recognition_model')
    le_path = os.path.join(app.config['UPLOAD_FOLDER'], 'label_encoder.joblib')
    
    # Check if model exists
    if not os.path.exists(model_path) or not os.path.exists(le_path):
        print("Model files not found. Please train the model first.")
        return "Model not trained yet", 0.0

    try:
        # Load model and label encoder
        model = tf.keras.models.load_model(model_path)
        le = joblib.load(le_path)

        # Preprocess image
        img_array = preprocess_image(image_path)
        if img_array is None:
            return "Error processing image", 0.0

        # Make prediction
        prediction = model.predict(np.expand_dims(img_array, axis=0), verbose=0)
        
        # Get highest confidence prediction
        max_confidence = np.max(prediction[0])
        predicted_label = le.inverse_transform([np.argmax(prediction[0])])[0]

        # Add confidence threshold
        if max_confidence < 0.6:
            return "Unknown person", float(max_confidence)

        return predicted_label, float(max_confidence)

    except Exception as e:
        print(f"Error during recognition: {str(e)}")
        return "Error during recognition", 0.0

# Initialize the model when the app starts
@app.before_first_request
def initialize_model():
    model_path = os.path.join(app.config['UPLOAD_FOLDER'], 'face_recognition_model')
    if not os.path.exists(model_path):
        print("Training initial model...")
        train_model()
    else:
        print("Model already exists. Skipping initial training.")

def create_dataset(image_paths, labels, batch_size=32):
    dataset = tf.data.Dataset.from_tensor_slices((image_paths, labels))
    dataset = dataset.map(preprocess_image).batch(batch_size).prefetch(tf.data.AUTOTUNE)
    return dataset