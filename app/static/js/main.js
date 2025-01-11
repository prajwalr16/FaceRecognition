// Loading overlay functions
function showLoading(title, message) {
    const overlay = `
        <div class="loading-overlay">
            <div class="loading-content">
                <h4>${title}</h4>
                <p>${message}</p>
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', overlay);
}

function hideLoading() {
    const overlay = document.querySelector('.loading-overlay');
    if (overlay) {
        overlay.remove();
    }
}

// Person management functions
function loadPersons() {
    $.get('/persons', function(data) {
        const container = $('#persons-container');
        container.empty();
        
        if (data.length === 0) {
            container.html(`
                <div class="col-12">
                    <div class="card">
                        <div class="card-body text-center">
                            <i class="fas fa-users fa-3x text-muted mb-3"></i>
                            <h5 class="text-muted">No persons in database</h5>
                            <p class="text-muted mb-0">Add some people to get started</p>
                        </div>
                    </div>
                </div>
            `);
            return;
        }

        data.forEach(function(person) {
            const card = createPersonCard(person);
            container.append(card);
        });
    });
}

function createPersonCard(person) {
    return `
        <div class="col-md-6 person-card" data-person-id="${person.id}">
            <div class="card">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <div class="person-name-container">
                            <h5 class="person-name">${person.name}</h5>
                            <input type="text" class="form-control person-name-edit" value="${person.name}">
                        </div>
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-outline-primary edit-name-btn">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-success add-images-btn">
                                <i class="fas fa-images"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger delete-person-btn">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="person-images">
                        ${person.images.map(img => createImageElement(img, person.name)).join('')}
                    </div>
                    <input type="file" class="d-none add-images-input" multiple accept="image/*">
                    <div class="mt-2">
                        <small class="text-muted">Added: ${person.created_at}</small>
                        <small class="text-muted ms-2">${person.images.length} images</small>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function createImageElement(image, personName) {
    return `
        <div class="person-image-container">
            <img src="${image.path}" 
                 class="person-image" 
                 alt="${personName}"
                 onerror="this.src='/static/img/placeholder.jpg'">
            <button class="delete-image-btn" data-image-id="${image.id}">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
}

// Event handlers
$(document).ready(function() {
    // Initialize
    loadPersons();

    // Edit name
    $(document).on('click', '.edit-name-btn', function() {
        const card = $(this).closest('.person-card');
        const nameContainer = card.find('.person-name-container');
        const nameDisplay = nameContainer.find('.person-name');
        const nameInput = nameContainer.find('.person-name-edit');
        const editBtn = $(this);

        if (nameDisplay.is(':visible')) {
            nameDisplay.hide();
            nameInput.show().focus();
            editBtn.html('<i class="fas fa-save"></i>');
        } else {
            const newName = nameInput.val().trim();
            if (newName) {
                updatePersonName(card.data('person-id'), newName, function() {
                    nameDisplay.text(newName).show();
                    nameInput.hide();
                    editBtn.html('<i class="fas fa-edit"></i>');
                });
            }
        }
    });

    // Add images
    $(document).on('click', '.add-images-btn', function() {
        $(this).closest('.person-card').find('.add-images-input').click();
    });

    $(document).on('change', '.add-images-input', function() {
        const files = this.files;
        const personId = $(this).closest('.person-card').data('person-id');
        if (files.length > 0) {
            const formData = new FormData();
            Array.from(files).forEach(file => {
                formData.append('files[]', file);
            });
            uploadAdditionalImages(personId, formData);
        }
    });

    // Delete image
    $(document).on('click', '.delete-image-btn', function() {
        const imageId = $(this).data('image-id');
        const container = $(this).closest('.person-image-container');
        if (confirm('Are you sure you want to delete this image?')) {
            deleteImage(imageId, function() {
                container.remove();
            });
        }
    });
    
    // Delete person
    $(document).on('click', '.delete-person-btn', function() {
        const card = $(this).closest('.person-card');
        const personId = card.data('person-id');
        if (confirm('Are you sure you want to delete this person?')) {
            deletePerson(personId, function() {
                card.remove();
            });
        }
    });

    $('#trainButton').click(function() {
        startTraining();
    });

    $('#recognizeForm').on('submit', function(e) {
        e.preventDefault();
        handleRecognizeSubmission(this);
    });
});

// AJAX functions
function updatePersonName(personId, newName, callback) {
    showLoading('Updating...', 'Saving new name');
    $.ajax({
        url: `/person/${personId}/name`,
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify({ name: newName }),
        success: function(response) {
            hideLoading();
            if (callback) callback();
        },
        error: function(xhr) {
            hideLoading();
            alert('Error updating name: ' + xhr.responseText);
        }
    });
}

function uploadAdditionalImages(personId, formData) {
    showLoading('Uploading...', 'Adding new images');
    $.ajax({
        url: `/person/${personId}/images`,
        method: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        success: function(response) {
            hideLoading();
            loadPersons();
        },
        error: function(xhr) {
            hideLoading();
            alert('Error uploading images: ' + xhr.responseText);
        }
    });
}

function deleteImage(imageId, callback) {
    showLoading('Deleting...', 'Removing image');
    $.ajax({
        url: `/image/${imageId}`,
        method: 'DELETE',
        success: function(response) {
            hideLoading();
            if (callback) callback();
        },
        error: function(xhr) {
            hideLoading();
            alert('Error deleting image: ' + xhr.responseText);
        }
    });
}

function deletePerson(personId, callback) {
    showLoading('Deleting...', 'Removing person');
    $.ajax({
        url: `/person/${personId}`,
        method: 'DELETE',
        success: function(response) {
            hideLoading();
            if (callback) callback();
        },
        error: function(xhr) {
            hideLoading();
            alert('Error deleting person: ' + xhr.responseText);
        }
    });
}

// Drag and Drop functionality
function initializeDragAndDrop() {
    const dropZones = document.querySelectorAll('.upload-area');
    
    dropZones.forEach(zone => {
        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.classList.add('dragover');
        });

        zone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            zone.classList.remove('dragover');
        });

        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('dragover');
            const input = zone.querySelector('input[type="file"]');
            const files = e.dataTransfer.files;
            
            if (input.multiple) {
                handleMultipleFiles(files, input);
            } else {
                handleSingleFile(files[0], input);
            }
        });

        zone.addEventListener('click', () => {
            zone.querySelector('input[type="file"]').click();
        });
    });
}

// File handling functions
function handleSingleFile(file, input) {
    if (file && isValidImageFile(file)) {
        input.files = createFileList([file]);
        showImagePreview(file, input.id);
        enableSubmitButton(input.id);
    }
}

function handleMultipleFiles(files, input) {
    const validFiles = Array.from(files).filter(isValidImageFile);
    if (validFiles.length > 0) {
        input.files = createFileList(validFiles);
        showMultipleImagePreviews(validFiles, input.id);
        enableSubmitButton(input.id);
    }
}

function isValidImageFile(file) {
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
        showError('Please upload only image files (JPEG, PNG)');
        return false;
    }
    return true;
}

// Preview functions
function showImagePreview(file, inputId) {
    const previewContainer = document.getElementById(inputId.replace('File', 'Preview'));
    previewContainer.innerHTML = '';

    const reader = new FileReader();
    reader.onload = (e) => {
        const wrapper = createPreviewWrapper(e.target.result, file.name);
        previewContainer.appendChild(wrapper);
    };
    reader.readAsDataURL(file);
}

function showMultipleImagePreviews(files, inputId) {
    const previewContainer = document.getElementById(inputId.replace('Files', 'Preview'));
    previewContainer.innerHTML = '';

    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const wrapper = createPreviewWrapper(e.target.result, file.name);
            previewContainer.appendChild(wrapper);
        };
        reader.readAsDataURL(file);
    });
}

function createPreviewWrapper(src, filename) {
    const wrapper = document.createElement('div');
    wrapper.className = 'preview-image-wrapper';
    
    const img = document.createElement('img');
    img.src = src;
    img.className = 'preview-image';
    img.alt = filename;
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-preview';
    removeBtn.innerHTML = '×';
    removeBtn.onclick = function() {
        wrapper.remove();
        updateSubmitButton();
    };
    
    wrapper.appendChild(img);
    wrapper.appendChild(removeBtn);
    return wrapper;
}

// Model training functionality
function initializeModelTraining() {
    const retrainBtn = document.getElementById('retrainBtn');
    if (retrainBtn) {
        retrainBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await startModelTraining();
        });
    }
}

async function startModelTraining() {
    try {
        showTrainingOverlay();
        const response = await fetch('/retrain', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Training failed');

        // Start polling for training progress
        pollTrainingProgress();
    } catch (error) {
        hideTrainingOverlay();
        showError('Failed to start training: ' + error.message);
    }
}

function showTrainingOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
        <div class="loading-content">
            <h4>Training Model</h4>
            <div class="training-progress">
                <div class="progress">
                    <div class="progress-bar progress-bar-striped progress-bar-animated" 
                         role="progressbar" style="width: 0%"></div>
                </div>
                <p class="text-center mb-0">Initializing training...</p>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

async function pollTrainingProgress() {
    const progressBar = document.querySelector('.progress-bar');
    const progressText = document.querySelector('.training-progress p');
    let progress = 0;

    const interval = setInterval(async () => {
        try {
            const response = await fetch('/training-progress');
            const data = await response.json();
            
            if (data.status === 'completed') {
                clearInterval(interval);
                hideTrainingOverlay();
                showSuccess('Model training completed successfully!');
                updateModelStats();
            } else if (data.status === 'failed') {
                clearInterval(interval);
                hideTrainingOverlay();
                showError('Model training failed: ' + data.error);
            } else {
                progress = data.progress;
                progressBar.style.width = `${progress}%`;
                progressText.textContent = data.message;
            }
        } catch (error) {
            clearInterval(interval);
            hideTrainingOverlay();
            showError('Failed to get training progress');
        }
    }, 1000);
}

// Utility functions
function createFileList(files) {
    const dt = new DataTransfer();
    files.forEach(file => dt.items.add(file));
    return dt.files;
}

function enableSubmitButton(inputId) {
    const btnId = inputId.includes('recognize') ? 'recognizeBtn' : 'addPersonBtn';
    document.getElementById(btnId).disabled = false;
}

function updateSubmitButton() {
    const previewContainers = document.querySelectorAll('.preview-container');
    previewContainers.forEach(container => {
        const btnId = container.id.includes('recognize') ? 'recognizeBtn' : 'addPersonBtn';
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.disabled = container.children.length === 0;
        }
    });
}

function showSuccess(message) {
    showAlert(message, 'success');
}

function showError(message) {
    showAlert(message, 'danger');
}

function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.querySelector('.container').insertAdjacentElement('afterbegin', alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Initialize everything when the document is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all features
    initializeImageUploads();
    initializeFormSubmissions();
    initializeDragAndDrop();
    loadPersons();  // For database tab
});

function initializeImageUploads() {
    // Prevent double event binding
    const recognizeArea = document.querySelector('#recognize-tab .upload-area');
    const addPersonArea = document.querySelector('#add-person-tab .upload-area');
    
    // Remove old event listeners
    recognizeArea?.replaceWith(recognizeArea.cloneNode(true));
    addPersonArea?.replaceWith(addPersonArea.cloneNode(true));

    // Re-get elements after cloning
    const newRecognizeArea = document.querySelector('#recognize-tab .upload-area');
    const newAddPersonArea = document.querySelector('#add-person-tab .upload-area');

    // Add click handlers
    if (newRecognizeArea) {
        newRecognizeArea.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            document.getElementById('recognizeFile').click();
        }, { once: true });
    }

    if (newAddPersonArea) {
        newAddPersonArea.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            document.getElementById('addPersonFiles').click();
        }, { once: true });
    }

    // File input change handlers
    const recognizeFile = document.getElementById('recognizeFile');
    if (recognizeFile) {
        recognizeFile.addEventListener('change', function(e) {
            handleImageUpload(e, 'recognizePreview', 'recognizeBtn', false);
        });
    }

    const addPersonFiles = document.getElementById('addPersonFiles');
    if (addPersonFiles) {
        addPersonFiles.addEventListener('change', function(e) {
            handleImageUpload(e, 'addPersonPreview', 'addPersonBtn', true);
        });
    }
}

function handleImageUpload(event, previewContainerId, buttonId, multiple) {
    const files = event.target.files;
    const previewContainer = document.getElementById(previewContainerId);
    const submitButton = document.getElementById(buttonId);

    if (!files.length) {
        submitButton.disabled = true;
        return;
    }

    // Clear previous previews
    previewContainer.innerHTML = '';

    // Create preview for each file
    Array.from(files).forEach(file => {
        if (!file.type.startsWith('image/')) {
            const errorWrapper = document.createElement('div');
            errorWrapper.className = 'error-wrapper';
            errorWrapper.innerHTML = `<p class="text-danger">Invalid file type</p>`;
            previewWrapper.appendChild(errorWrapper);
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            const previewWrapper = document.createElement('div');
            previewWrapper.className = 'preview-image-wrapper';

            const img = document.createElement('img');
            img.src = e.target.result;
            img.className = 'preview-image';
            img.alt = file.name;

            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-preview';
            removeBtn.innerHTML = '×';
            removeBtn.onclick = function() {
                previewWrapper.remove();
                updateSubmitButton(previewContainer, submitButton);
            };

            previewWrapper.appendChild(img);
            previewWrapper.appendChild(removeBtn);
            previewContainer.appendChild(previewWrapper);
        };

        reader.readAsDataURL(file);
    });

    submitButton.disabled = false;
}

function initializeFormSubmissions() {
    // Recognize Face Form
    const recognizeForm = document.querySelector('#recognize-tab form');
    if (recognizeForm) {
        recognizeForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await handleRecognizeSubmission(this);
        });
    }

    // Add Person Form
    const addPersonForm = document.getElementById('addPersonForm');
    if (addPersonForm) {
        addPersonForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await handleAddPersonSubmission(this);
        });
    }
}

async function handleRecognizeSubmission(form) {
    try {
        showLoading('Recognizing...', 'Processing image');
        
        const formData = new FormData(form);
        const response = await fetch('/recognize', {  // Make sure this matches your route
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Recognition failed');
        }

        let result;
        try {
            result = await response.json();
        } catch (e) {
            throw new Error('Invalid response from server');
        }

        hideLoading();
        showRecognitionResult(result);
    } catch (error) {
        hideLoading();
        showError('Recognition failed: ' + error.message);
        console.error('Recognition error:', error);
    }
}

async function handleAddPersonSubmission(form) {
    try {
        const name = form.querySelector('#personName').value.trim();
        if (!name) {
            showError('Please enter a name');
            return;
        }

        const files = form.querySelector('#addPersonFiles').files;
        if (!files.length) {
            showError('Please select at least one image');
            return;
        }

        showLoading('Adding Person...', 'Uploading images');
        
        const formData = new FormData(form);
        const response = await fetch(form.action, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error('Failed to add person');

        hideLoading();
        showSuccess('Person added successfully!');
        form.reset();
        document.getElementById('addPersonPreview').innerHTML = '';
        document.getElementById('addPersonBtn').disabled = true;
        
        // Reload persons in database tab
        loadPersons();
    } catch (error) {
        hideLoading();
        showError('Failed to add person: ' + error.message);
    }
}

function showRecognitionResult(result) {
    const modalBody = document.getElementById('recognitionResult');
    if (modalBody) {
        modalBody.innerHTML = `
            <div class="text-center mb-3">
                <img src="${result.image_url}" class="img-fluid rounded" alt="Recognized face">
            </div>
            <h6>Recognized Person:</h6>
            <p class="h4 text-primary mb-3">${result.name}</p>
            <h6>Confidence:</h6>
            <div class="progress mb-3">
                <div class="progress-bar" role="progressbar"
                     style="width: ${result.confidence}%" aria-valuenow="${result.confidence}"
                     aria-valuemin="0" aria-valuemax="100">
                    ${result.confidence.toFixed(1)}%
                </div>
            </div>`;
        const modal = new bootstrap.Modal(document.getElementById('recognitionModal'));
        modal.show();
    } else {
        console.error("Modal body element not found.");
    }
}

function updateSubmitButton(previewContainer, submitButton) {
    submitButton.disabled = previewContainer.children.length === 0;
}

// Utility functions for showing messages
function showSuccess(message) {
    showAlert(message, 'success');
}

function showError(message) {
    showAlert(message, 'danger');
}

function showAlert(message, type) {
    const alertHtml = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    const container = document.querySelector('.container');
    container.insertAdjacentHTML('afterbegin', alertHtml);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        const alert = document.querySelector('.alert');
        if (alert) {
            alert.remove();
        }
    }, 5000);
}

// Loading overlay functions
function showLoading(title, message) {
    const overlay = `
        <div class="loading-overlay">
            <div class="loading-content">
                <h4>${title}</h4>
                <p>${message}</p>
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', overlay);
}

function hideLoading() {
    const overlay = document.querySelector('.loading-overlay');
    if (overlay) {
        overlay.remove();
    }
} 