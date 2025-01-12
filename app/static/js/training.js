// Initialize charts
let accuracyChart = null;
let lossChart = null;

function initializeCharts() {
    const accuracyCtx = document.getElementById('accuracyChart').getContext('2d');
    const lossCtx = document.getElementById('lossChart').getContext('2d');

    accuracyChart = new Chart(accuracyCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Training Accuracy',
                borderColor: '#0d6efd',
                data: []
            }, {
                label: 'Validation Accuracy',
                borderColor: '#198754',
                data: []
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Model Accuracy'
                }
            }
        }
    });

    lossChart = new Chart(lossCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Training Loss',
                borderColor: '#dc3545',
                data: []
            }, {
                label: 'Validation Loss',
                borderColor: '#fd7e14',
                data: []
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Model Loss'
                }
            }
        }
    });
}

// Update charts with new data
function updateCharts(data) {
    if (accuracyChart && lossChart) {
        accuracyChart.data.labels.push(data.epoch);
        accuracyChart.data.datasets[0].data.push(data.train_accuracy);
        accuracyChart.data.datasets[1].data.push(data.val_accuracy);
        accuracyChart.update();

        lossChart.data.labels.push(data.epoch);
        lossChart.data.datasets[0].data.push(data.train_loss);
        lossChart.data.datasets[1].data.push(data.val_loss);
        lossChart.update();
    }
}

// Initialize training options
document.getElementById('epochsRange').addEventListener('input', function(e) {
    document.getElementById('epochsValue').textContent = e.target.value;
});

// Load training history and update charts
async function loadTrainingHistory() {
    try {
        const response = await fetch('/model-stats');
        const stats = await response.json();

        if (stats && accuracyChart && lossChart) {
            // Assuming historical data for accuracy and loss is stored in training_history.json
            const historyPath = 'uploads/training_history.json'; // Update as needed
            const historyResponse = await fetch(historyPath);
            const trainingHistory = await historyResponse.json();

            // Populate charts with historical data
            trainingHistory.epochs.forEach((epoch, index) => {
                accuracyChart.data.labels.push(epoch);
                accuracyChart.data.datasets[0].data.push(trainingHistory.training_accuracy[index]);
                accuracyChart.data.datasets[1].data.push(trainingHistory.validation_accuracy[index]);

                lossChart.data.labels.push(epoch);
                lossChart.data.datasets[0].data.push(trainingHistory.training_loss[index]);
                lossChart.data.datasets[1].data.push(trainingHistory.validation_loss[index]);
            });

            // Update the charts
            accuracyChart.update();
            lossChart.update();
        }
    } catch (error) {
        console.error('Error loading training history:', error);
    }
}

// Enhanced training progress visualization
function showTrainingProgress() {
    const overlay = document.createElement('div');
    overlay.className = 'training-overlay';
    overlay.innerHTML = `
        <div class="training-content">
            <h4 class="mb-4">Training Model</h4>
            <div class="training-steps mb-4">
                <div class="training-step">
                    <div class="step-number step-active">1</div>
                    <div class="step-text">Preparing Data</div>
                </div>
                <div class="training-step">
                    <div class="step-number">2</div>
                    <div class="step-text">Training Model</div>
                </div>
                <div class="training-step">
                    <div class="step-number">3</div>
                    <div class="step-text">Evaluating Results</div>
                </div>
            </div>
            <div class="progress mb-3">
                <div class="progress-bar progress-bar-striped progress-bar-animated" 
                     role="progressbar" style="width: 0%"></div>
            </div>
            <p class="text-center mb-0" id="trainingStatus">Initializing training...</p>
        </div>
    `;
    document.body.appendChild(overlay);
}

// Initialize everything
document.addEventListener('DOMContentLoaded', function() {
    initializeCharts();
    loadTrainingHistory();
    
    // Initialize tooltips
    const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltips.forEach(tooltip => new bootstrap.Tooltip(tooltip));
}); 