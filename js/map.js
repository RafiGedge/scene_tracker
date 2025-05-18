// Map management functions with Ground-Shooting association visualization

// Define custom icons for each object type
const objectIcons = {
    Ground: {
        icon: '🚶', // Person/unit icon
        color: '#2E8B57', // Sea green
        size: [30, 30]
    },
    Shooting: {
        icon: '🎯', // Target/shooting icon
        color: '#DC143C', // Crimson red
        size: [25, 25]
    },
    EnemySpot: {
        icon: '👁️', // Eye icon for observation
        color: '#FF8C00', // Dark orange
        size: [28, 28]
    },
    Report: {
        icon: '📋', // Clipboard/report icon
        color: '#4169E1', // Royal blue
        size: [26, 26]
    },
    Targets: {
        icon: '🎯', // Target icon
        color: '#FF1493', // Deep pink
        size: [24, 24]
    },
    EnemyInfrastructure: {
        icon: '🏗️', // Building/infrastructure icon
        color: '#8B4513', // Saddle brown
        size: [32, 32]
    }
};

// Create custom Leaflet icon with emoji
function createCustomIcon(objectType) {
    const config = objectIcons[objectType];
    
    return L.divIcon({
        html: `<div style="
            width: ${config.size[0]}px; 
            height: ${config.size[1]}px; 
            background-color: ${config.color}; 
            border-radius: 50%; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            font-size: 16px; 
            border: 2px solid white; 
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        ">${config.icon}</div>`,
        className: 'custom-div-icon',
        iconSize: config.size,
        iconAnchor: [config.size[0]/2, config.size[1]/2],
        popupAnchor: [0, -config.size[1]/2]
    });
}

// Create selected version of icon (with border highlight)
function createSelectedIcon(objectType) {
    const config = objectIcons[objectType];
    
    return L.divIcon({
        html: `<div style="
            width: ${config.size[0]}px; 
            height: ${config.size[1]}px; 
            background-color: ${config.color}; 
            border-radius: 50%; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            font-size: 16px; 
            border: 3px solid #FFD700; 
            box-shadow: 0 2px 8px rgba(255,215,0,0.7);
            animation: pulse 2s infinite;
        ">${config.icon}</div>
        <style>
        @keyframes pulse {
            0% { box-shadow: 0 2px 8px rgba(255,215,0,0.7); }
            50% { box-shadow: 0 2px 12px rgba(255,215,0,0.9); }
            100% { box-shadow: 0 2px 8px rgba(255,215,0,0.7); }
        }
        </style>`,
        className: 'custom-div-icon selected',
        iconSize: config.size,
        iconAnchor: [config.size[0]/2, config.size[1]/2],
        popupAnchor: [0, -config.size[1]/2]
    });
}

// Setup map and scene
function setupMapAndScene(centerLat, centerLon, radius, duration) {
    if (map) map.remove();
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

    // NOTE: Buildings and roads are fetched and saved to CSV, 
    // but they are NOT rendered on the map as per requirements

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
}

// Draw line between Ground object and Shooting object only
function drawGroundShootingConnection(obj, currentPos) {
    // Use the original ground position
    if (obj.original_ground_x && obj.original_ground_y) {
        const originalGroundPos = {
            x: obj.original_ground_x,
            y: obj.original_ground_y
        };
        
        const groundLatLon = utmToLatLon(originalGroundPos.x, originalGroundPos.y, scene.utm_zone);
        const currentLatLon = utmToLatLon(currentPos.x, currentPos.y, scene.utm_zone);
        
        // Orange dashed line for Shooting objects
        const connectionLine = L.polyline([groundLatLon, currentLatLon], {
            color: '#FFA500',  // Orange
            weight: 2,
            opacity: 0.7,
            dashArray: '5, 5'  // Dashed line
        }).addTo(map);
        currentMarkers.push(connectionLine);
        
        // Add a small marker at the original ground position
        const originalPosMarker = L.circleMarker(groundLatLon, {
            radius: 4,
            color: '#FFA500',
            fillColor: '#FFA500',
            fillOpacity: 0.5
        }).addTo(map);
        originalPosMarker.bindTooltip("Original Ground Position");
        currentMarkers.push(originalPosMarker);
    }
}


// Update map display for current timestamp - No dash lines for Report and EnemySpot
function updateMapDisplay() {
    if (!map) return;
    
    // Clear existing markers
    currentMarkers.forEach(marker => map.removeLayer(marker));
    currentMarkers = [];
    
    const currentTime = scene.start_timestamp + currentTimestamp;
    
    for (const [objectType, objectsOfType] of Object.entries(objects)) {
        for (const [objectId, obj] of Object.entries(objectsOfType)) {
            const position = getObjectPositionAtTime(obj, currentTime);
            if (!position) continue;
            
            const latLon = utmToLatLon(position.x, position.y, scene.utm_zone);
            
            // Create marker with custom icon
            const marker = L.marker([latLon.lat, latLon.lon], {
                icon: createCustomIcon(objectType)
            });
            
            // Add popup with styled content
            let popupContent = `
                <div style="text-align: center;">
                    <strong>${objectType}</strong><br>
                    ${obj.callsign || obj.ground_callsign || obj.target_type || obj.type || 'ID: ' + objectId.substring(0, 8)}<br>
                    <small>X: ${position.x.toFixed(1)}, Y: ${position.y.toFixed(1)}</small>
                </div>
            `;
            
            // Special popup content for objects with Ground association
            if ((objectType === 'Shooting' || objectType === 'EnemySpot' || objectType === 'Report') && obj.associated_ground_id) {
                const groundObj = objects.Ground[obj.associated_ground_id];
                if (groundObj) {
                    popupContent += `<hr style="margin: 5px 0;"><small>Associated with: ${groundObj.callsign}</small>`;
                }
            }
            
            marker.bindPopup(popupContent);
            marker.on('click', () => selectObject(objectType, objectId));
            marker.addTo(map);
            currentMarkers.push(marker);
            
            // Enable dragging for selected objects
            if (selectedObject && selectedObject.type === objectType && selectedObject.id === objectId) {
                // Add selection indicator
                marker.setIcon(createSelectedIcon(objectType));
                marker.dragging.enable();
                marker.on('dragend', (e) => updateObjectPosition(objectType, objectId, e.target.getLatLng()));
            }
            
            // Draw connection lines ONLY for Shooting objects (not EnemySpot or Report)
            if (objectType === 'Shooting' && 
                obj.associated_ground_id && obj.original_ground_x && obj.original_ground_y) {
                
                // Only draw connection line for Shooting objects
                drawGroundShootingConnection(obj, position);
            }
        }
    }
}

// Draw line between Ground object and any associated object - Using original position
function drawGroundConnection(obj, currentPos, objectType) {
    // Use the original ground position
    if (obj.original_ground_x && obj.original_ground_y) {
        const originalGroundPos = {
            x: obj.original_ground_x,
            y: obj.original_ground_y
        };
        
        const groundLatLon = utmToLatLon(originalGroundPos.x, originalGroundPos.y, scene.utm_zone);
        const currentLatLon = utmToLatLon(currentPos.x, currentPos.y, scene.utm_zone);
        
        // Different line styles by object type
        let lineStyle = {
            color: '#FFA500',  // Default: orange
            weight: 2,
            opacity: 0.7,
            dashArray: '5, 5'  // Default: dashed line
        };
        
        // Customize line by object type
        if (objectType === 'EnemySpot') {
            lineStyle.color = '#FF8C00';  // Dark orange
            lineStyle.dashArray = '3, 7';  // Different dash pattern
        } else if (objectType === 'Report') {
            lineStyle.color = '#4169E1';  // Royal blue
            lineStyle.dashArray = '2, 4';  // Different dash pattern
        }
        
        // Line from original Ground position to current position
        const connectionLine = L.polyline([groundLatLon, currentLatLon], lineStyle).addTo(map);
        currentMarkers.push(connectionLine);
        
        // Add a small marker at the original ground position
        const originalPosMarker = L.circleMarker(groundLatLon, {
            radius: 4,
            color: lineStyle.color,
            fillColor: lineStyle.color,
            fillOpacity: 0.5
        }).addTo(map);
        originalPosMarker.bindTooltip("Original Ground Position");
        currentMarkers.push(originalPosMarker);
    }
}

// Update Shooting object when associated Ground moves
function updateShootingAssociations(groundId) {
    const currentTime = scene.start_timestamp + currentTimestamp;
    const groundObj = objects.Ground[groundId];
    if (!groundObj) return;
    
    const groundPosition = getObjectPositionAtTime(groundObj, currentTime);
    
    // Update all Shooting objects associated with this Ground object
    for (const [shootingId, shootingObj] of Object.entries(objects.Shooting || {})) {
        if (shootingObj.associated_ground_id === groundId) {
            if (groundPosition && isPositionInScene(groundPosition.x, groundPosition.y)) {
                shootingObj.launch_location_x = groundPosition.x;
                shootingObj.launch_location_y = groundPosition.y;
                shootingObj.ground_callsign = groundObj.callsign || 'Unknown';
            } else {
                shootingObj.launch_location_x = 'None';
                shootingObj.launch_location_y = 'None';
            }
        }
    }
    
    // Update the display if a Shooting object is currently selected
    if (selectedObject && selectedObject.type === 'Shooting') {
        updateObjectProperties();
    }
}

// Handle map click for object placement - With additional associations
function handleMapClick(e) {
    if (!addingObject) return;
    
    const clickedLatLng = e.latlng;
    const utmCoords = latLonToUTM(clickedLatLng.lat, clickedLatLng.lng);
    const objectId = generateUUID();
    
    const newObject = {
        id: objectId,
        x: utmCoords.x,
        y: utmCoords.y,
        timestamp: scene.start_timestamp + currentTimestamp,
        frames: [{
            timestamp: scene.start_timestamp + currentTimestamp,
            x: utmCoords.x,
            y: utmCoords.y
        }]
    };

    // Add object-specific properties
    switch (currentObjectType) {
        case 'Ground':
            newObject.type = 'unit';
            newObject.callsign = 'Unit-' + (Object.keys(objects.Ground).length + 1);
            break;
        case 'Shooting':
            newObject.launch_location_x = 'None';
            newObject.launch_location_y = 'None';
            newObject.target_x = utmCoords.x + 100;
            newObject.target_y = utmCoords.y + 100;
            newObject.ammo_type = 'standard';
            newObject.associated_ground_id = null;
            newObject.ground_callsign = '';
            newObject.original_ground_x = null;
            newObject.original_ground_y = null;
            newObject.timestamp = scene.start_timestamp + currentTimestamp;
            break;
        case 'EnemySpot':
            newObject.desc = 'Enemy spotted';
            newObject.callsign = 'Observer-' + (Object.keys(objects.EnemySpot).length + 1);
            newObject.associated_ground_id = null;
            newObject.ground_callsign = '';
            newObject.original_ground_x = null;
            newObject.original_ground_y = null;
            break;
        case 'Report':
            newObject.desc = 'Report description';
            newObject.callsign = 'Reporter-' + (Object.keys(objects.Report).length + 1);
            newObject.associated_ground_id = null;
            newObject.ground_callsign = '';
            newObject.original_ground_x = null;
            newObject.original_ground_y = null;
            break;
        case 'Targets':
            newObject.creation_time = scene.start_timestamp + currentTimestamp;
            newObject.target_type = 'unknown';
            delete newObject.timestamp;
            break;
        case 'EnemyInfrastructure':
            newObject.type = 'building';
            break;
    }

    // Save to undo stack
    undoStack.push({
        action: 'create',
        objectType: currentObjectType,
        objectId: objectId,
        timestamp: currentTimestamp
    });

    objects[currentObjectType][objectId] = newObject;
    selectedObject = { type: currentObjectType, id: objectId };
    addingObject = false;
    document.getElementById('map').style.cursor = 'default';
    updateMapDisplay();
    updateObjectsList();
    updateObjectProperties();
    updateFrameList();
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