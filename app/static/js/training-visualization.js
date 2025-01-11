class TrainingVisualizer {
    constructor() {
        this.progressBar = document.querySelector('.progress');
        this.progressBarInner = document.getElementById('trainingProgress');
        this.statusMessage = document.getElementById('trainingStatus');
        this.trainButton = document.getElementById('trainButton');
        this.checkInterval = null;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        if (this.trainButton) {
            this.trainButton.addEventListener('click', () => this.startTraining());
        } else {
            console.error('Train button not found in the DOM');
        }
    }

    async startTraining() {
        try {
            this.trainButton.disabled = true;
            this.progressBar.style.display = 'block';
            this.progressBarInner.style.width = '0%';
            this.statusMessage.textContent = 'Starting training...';
            
            const response = await fetch('/retrain', {
                method: 'POST'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            if (result.success) {
                this.startProgressCheck();
            } else {
                throw new Error(result.error || 'Training failed to start');
            }
        } catch (error) {
            console.error('Error starting training:', error);
            this.statusMessage.textContent = `Error: ${error.message}`;
            this.trainButton.disabled = false;
            this.progressBar.style.display = 'none';
        }
    }

    async updateTrainingProgress() {
        try {
            const response = await fetch('/training-progress');
            const data = await response.json();

            if (data.is_training) {
                this.progressBarInner.style.width = `${data.progress}%`;
                this.progressBarInner.setAttribute('aria-valuenow', data.progress);
                this.statusMessage.textContent = data.message;
            } else {
                if (data.error) {
                    this.statusMessage.textContent = `Error: ${data.error}`;
                    this.stopProgressCheck();
                } else if (data.progress === 100) {
                    this.progressBarInner.style.width = '100%';
                    this.statusMessage.textContent = 'Training completed successfully!';
                    this.stopProgressCheck();
                    await this.updateModelStats();
                }
            }
        } catch (error) {
            console.error('Error checking training progress:', error);
            this.statusMessage.textContent = 'Error checking training progress';
        }
    }

    startProgressCheck() {
        this.checkInterval = setInterval(() => this.updateTrainingProgress(), 1000);
    }

    stopProgressCheck() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        this.trainButton.disabled = false;
    }

    async updateModelStats() {
        try {
            const response = await fetch('/model-stats');
            const stats = await response.json();
            
            const elements = {
                lastTrained: document.getElementById('lastTrained'),
                accuracy: document.getElementById('accuracy'),
                totalImages: document.getElementById('totalImages'),
                totalPersons: document.getElementById('totalPersons')
            };

            if (elements.lastTrained) {
                elements.lastTrained.textContent = new Date(stats.last_trained).toLocaleString();
            }
            if (elements.accuracy) {
                elements.accuracy.textContent = `${(stats.accuracy * 100).toFixed(1)}%`;
            }
            if (elements.totalImages) {
                elements.totalImages.textContent = stats.total_images;
            }
            if (elements.totalPersons) {
                elements.totalPersons.textContent = stats.total_persons;
            }
        } catch (error) {
            console.error('Error updating model stats:', error);
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const visualizer = new TrainingVisualizer();
});