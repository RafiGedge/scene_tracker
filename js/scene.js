// Scene management functions

// Create new scene
function createNewScene() {
    if (hasExistingScene) {
        if (confirm('Creating a new scene will clear all current data. Are you sure you want to continue?')) {
            clearExistingScene();
            setupDateTimePickers();
            document.getElementById('setup-modal').classList.remove('hidden');
        }
    } else {
        setupDateTimePickers();
        document.getElementById('setup-modal').classList.remove('hidden');
    }
}

// Set up date and time pickers with current date and time
function setupDateTimePickers() {
    const now = new Date();
    
    // Format date as YYYY-MM-DD for the date input
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    
    // Format time as HH:MM for the time input
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const formattedTime = `${hours}:${minutes}`;
    
    // Set the values
    document.getElementById('start-date').value = formattedDate;
    document.getElementById('start-time').value = formattedTime;
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

// Setup map and scene
function setupMapAndScene(centerLat, centerLon, radius, duration) {
    try {
        if (map) map.remove();
        
        // Validate inputs
        if (!centerLat || !centerLon || !radius || !duration) {
            console.error("Invalid parameters for setupMapAndScene:", { centerLat, centerLon, radius, duration });
            return;
        }
        
        map = L.map('map').setView([centerLat, centerLon], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // Add scene boundary circle
        L.circle([centerLat, centerLon], {
            color: 'blue',
            fillColor: '#30f',
            fillOpacity: 0.1,
            radius: radius
        }).addTo(map);

        const timelineSlider = document.getElementById('timeline-slider');
        timelineSlider.min = 0;
        timelineSlider.max = duration * 60;
        timelineSlider.value = 0;
        currentTimestamp = 0;

        document.getElementById('scene-info').textContent = `Scene: ${scene.scene_name} | Duration: ${duration} min`;

        hasExistingScene = true;
        map.on('click', handleMapClick);
        updateMapDisplay();
        updateObjectsList();
        
        console.log("Map and scene setup complete");
    } catch (error) {
        console.error("Error in setupMapAndScene:", error);
    }
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
        
        // Get selected date and time
        const startDate = document.getElementById('start-date').value;
        const startTime = document.getElementById('start-time').value;
        
        // Convert to timestamp
        let startTimestamp;
        if (startDate && startTime) {
            // Create a Date object from the selected date and time
            const dateTimeString = `${startDate}T${startTime}:00`;
            const selectedDateTime = new Date(dateTimeString);
            startTimestamp = Math.floor(selectedDateTime.getTime() / 1000);
            console.log(`Using selected date/time: ${selectedDateTime.toString()}, timestamp: ${startTimestamp}`);
        } else {
            // Fallback to current time if date/time not selected
            startTimestamp = Math.floor(Date.now() / 1000);
            console.log(`Using current time as timestamp: ${startTimestamp}`);
        }
        
        const utmCoords = latLonToUTM(centerLat, centerLon);

        scene = {
            scene_name: sceneName,
            center_lat: centerLat,
            center_lon: centerLon,
            center_x: utmCoords.x,
            center_y: utmCoords.y,
            utm_zone: utmCoords.zone,
            radius_meters: radius,
            start_timestamp: startTimestamp,
            end_timestamp: startTimestamp + (duration * 60),
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

// Fetch building and road data from OpenStreetMap
// This data is saved to CSV files but NOT rendered on the map
async function fetchMapData(centerLat, centerLon, radius) {
    try {
        const overpassQuery = `
            [out:json][timeout:25];
            (
                way["building"](around:${radius},${centerLat},${centerLon});
                way["highway"](around:${radius},${centerLat},${centerLon});
            );
            (._;>;);
            out geom;
        `;
        
        const response = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            body: 'data=' + encodeURIComponent(overpassQuery)
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch map data');
        }
        
        const data = await response.json();
        
        // Process buildings and roads for CSV export only
        buildings = [];
        roads = [];
        
        data.elements.forEach(element => {
            if (element.type === 'way' && element.geometry && element.geometry.length > 1) {
                const utmPoints = element.geometry.map(point => {
                    const utm = latLonToUTM(point.lat, point.lon);
                    return { x: utm.x, y: utm.y };
                });
                
                if (element.tags && element.tags.building) {
                    buildings.push({
                        id: generateUUID(),
                        type: element.tags.building || 'building',
                        points: utmPoints,
                        tags: element.tags
                    });
                } else if (element.tags && element.tags.highway) {
                    roads.push({
                        id: generateUUID(),
                        type: element.tags.highway || 'road',
                        points: utmPoints,
                        tags: element.tags
                    });
                }
            }
        });
        
        console.log(`Fetched ${buildings.length} buildings and ${roads.length} roads (for CSV export only)`);
        
    } catch (error) {
        console.error('Error fetching map data:', error);
        showStatus('init-status', 'Warning: Could not fetch map data. Continuing without external data.', 'error');
        // Continue without external map data
    }
}