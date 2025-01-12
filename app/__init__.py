from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from config import Config
import os
from PIL import Image
import tensorflow as tf
import logging

# Disable GPU
os.environ['CUDA_VISIBLE_DEVICES'] = '-1'

# Disable TensorFlow logging
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'  # 0=all, 1=no INFO, 2=no INFO/WARN, 3=no INFO/WARN/ERROR
tf.get_logger().setLevel(logging.ERROR)
tf.config.set_visible_devices([], 'GPU')

app = Flask(__name__)
app.config.from_object(Config)
Config.init_app(app)  # Create necessary directories

db = SQLAlchemy(app)
migrate = Migrate(app, db)

from app import routes, models

# Create necessary directories
static_img_dir = os.path.join(app.static_folder, 'img')
os.makedirs(static_img_dir, exist_ok=True)

# Create a simple placeholder image if it doesn't exist
placeholder_path = os.path.join(static_img_dir, 'placeholder.jpg')
if not os.path.exists(placeholder_path):
    import shutil
    default_placeholder = os.path.join(os.path.dirname(__file__), 'static/default_placeholder.jpg')
    shutil.copy(default_placeholder, placeholder_path)

app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads')

# Ensure upload directories exist
upload_dir = app.config['UPLOAD_FOLDER']
temp_dir = os.path.join(upload_dir, 'temp')

os.makedirs(upload_dir, exist_ok=True)
os.makedirs(temp_dir, exist_ok=True)

@app.errorhandler(Exception)
def handle_error(error):
    response = {
        'error': str(error),
        'status': getattr(error, 'code', 500)
    }
    return jsonify(response), response['status']