# Face Recognition System

A web-based face recognition system built with Flask and TensorFlow. This application allows users to manage a database of people and their faces, train a machine learning model, and perform face recognition on new images.

## Features

- 👤 Add people with multiple face images
- 📸 Support for multiple image uploads
- 🔄 Real-time image preview
- 🎯 Face recognition with confidence scores
- 🤖 Model training with progress tracking
- 📊 Database management interface
- 🎨 Modern, responsive UI

## Technologies Used

- Backend:
  - Python 3.8+
  - Flask
  - SQLAlchemy
  - TensorFlow
  - OpenCV

- Frontend:
  - HTML5
  - CSS3
  - JavaScript
  - Bootstrap 5
  - Font Awesome
  - jQuery

## Installation

1. Clone the repository: 

    git clone https://github.com/yourusername/face_recognition_project.git

2. Create and activate a virtual environment:

    python -m venv venv
    source venv/bin/activate # On Windows: venv\Scripts\activate

3. Install the required packages:

    pip install -r requirements.txt

4. Set up the database:

    flask db init
    flask db migrate
    flask db upgrade

5. Run the application:

    flask run

6. Access the application in your web browser at http://localhost:5000.


## Project Structure
face_recognition_project/
├── app/ # Application package
│ ├── static/ # Static files (CSS, JS, uploads)
│ ├── templates/ # HTML templates
│ ├── models.py # Database models
│ ├── routes.py # Route handlers
│ └── face_recognition_tf.py # Face recognition logic
├── migrations/ # Database migrations
├── instance/ # Instance-specific files
├── tests/ # Test suite
├── config.py # Configuration
└── requirements.txt # Python dependencies

## Usage

1. Add People:
   - Click on "Add Person" tab
   - Enter person's name
   - Upload multiple images of the person
   - Click "Add Person" to save

2. Train Model:
   - Go to "Settings" tab
   - Click "Train Model"
   - Wait for training to complete

3. Recognize Faces:
   - Go to "Recognize Face" tab
   - Upload an image
   - View recognition results

## Development

To contribute to this project:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Requirements

See `requirements.txt` for a full list of dependencies.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- TensorFlow team for the machine learning framework
- Flask team for the web framework
- Bootstrap team for the UI components
