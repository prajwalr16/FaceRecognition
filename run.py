from app import app, db

if __name__ == '__main__':
    try:
        with app.app_context():
            db.create_all()
        app.run(debug=False)
    except Exception as e:
        print(f"Error starting the application: {e}")