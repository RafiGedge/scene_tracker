// Scene management functions

// Create new scene
function createNewScene() {
    if (hasExistingScene) {
        if (confirm('Creating a new scene will clear all current data. Are you sure you want to continue?')) {
            clearExistingScene();
            document.getElementById('setup-modal').classList.remove('hidden');
        }
    } else {
        document.getElementById('setup-modal').classList.remove('hidden');
    }
}

// Clear existing scene
function clearExistingScene() {
    scene = {};
    initializeObjects();
    buildings = [];
    roads = [];
    currentTimestamp = 0;
    selectedObject = null;
    addingObject = false;
    hasExistingScene = false;
    undoStack = [];
    frameHistory = {};
    
    if (map) {
        map.remove();
        map = null;
    }
    
    document.getElementById('scene-info').textContent = 'Create a new scene to get started';
    document.getElementById('delete-btn').style.display = 'none';
    document.getElementById('frame-management').style.display = 'none';
    updateObjectsList();
}

// Initialize scene
async function initializeScene() {
    const statusDiv = document.getElementById('init-status');
    statusDiv.innerHTML = '<div class="loading">Initializing scene...</div>';
    
    try {
        const sceneName = document.getElementById('scene-name').value;
        const centerLat = parseFloat(document.getElementById('center-lat').value);
        const centerLon = parseFloat(document.getElementById('center-lon').value);
        const radius = parseInt(document.getElementById('radius').value);
        const duration = parseInt(document.getElementById('duration').value);
        const now = Math.floor(Date.now() / 1000);
        const utmCoords = latLonToUTM(centerLat, centerLon);

        scene = {
            scene_name: sceneName,
            center_lat: centerLat,
            center_lon: centerLon,
            center_x: utmCoords.x,
            center_y: utmCoords.y,
            utm_zone: utmCoords.zone,
            radius_meters: radius,
            start_timestamp: now,
            end_timestamp: now + (duration * 60),
            created_at: new Date().toISOString()
        };

        statusDiv.innerHTML = '<div class="loading">Fetching map data...</div>';
        await fetchMapData(centerLat, centerLon, radius);
        
        setupMapAndScene(centerLat, centerLon, radius, duration);
        statusDiv.innerHTML = '<div class="success-message">Scene initialized successfully!</div>';
        
        setTimeout(() => {
            document.getElementById('setup-modal').classList.add('hidden');
        }, 1500);
        
    } catch (error) {
        statusDiv.innerHTML = `<div class="error-message">Error: ${error.message}</div>`;
    }
}