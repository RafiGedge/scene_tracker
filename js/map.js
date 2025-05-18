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

// Draw line between launch and target positions for Shooting objects
function drawShootingLine(obj, currentPos) {
    // Only draw if we have launch coordinates
    if (obj.launch_location_x && obj.launch_location_y && 
        obj.launch_location_x !== 'None' && obj.launch_location_y !== 'None') {
        
        const launchPos = {
            x: parseFloat(obj.launch_location_x),
            y: parseFloat(obj.launch_location_y)
        };
        
        const launchLatLon = utmToLatLon(launchPos.x, launchPos.y, scene.utm_zone);
        const targetLatLon = utmToLatLon(currentPos.x, currentPos.y, scene.utm_zone);
        
        // Orange dashed line for Shooting objects
        const connectionLine = L.polyline([launchLatLon, targetLatLon], {
            color: '#FFA500',  // Orange
            weight: 2,
            opacity: 0.7,
            dashArray: '5, 5'  // Dashed line
        }).addTo(map);
        currentMarkers.push(connectionLine);
        
        // Add a small marker at the launch position
        const launchPosMarker = L.circleMarker(launchLatLon, {
            radius: 4,
            color: '#FFA500',
            fillColor: '#FFA500',
            fillOpacity: 0.5
        }).addTo(map);
        launchPosMarker.bindTooltip("Launch Position");
        currentMarkers.push(launchPosMarker);
    }
}

// Update map display for current timestamp
function updateMapDisplay() {
    if (!map) return;
    
    // Clear existing markers
    currentMarkers.forEach(marker => map.removeLayer(marker));
    currentMarkers = [];
    
    const currentTime = scene.start_timestamp + currentTimestamp;
    
    for (const [objectType, objectsOfType] of Object.entries(objects)) {
        for (const [objectId, obj] of Object.entries(objectsOfType)) {
            // Skip rendering for Shooting objects with target coordinates
            // These will be rendered specially below
            if (objectType === 'Shooting') {
                continue;
            }
            
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
            if ((objectType === 'EnemySpot' || objectType === 'Report') && obj.associated_ground_id) {
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
        }
    }
    
    // Handle Shooting objects separately
    for (const [objectId, obj] of Object.entries(objects.Shooting || {})) {
        // Only display Shooting objects with valid target coordinates
        if (!obj.target_x || !obj.target_y) continue;
        
        // Convert target coordinates to lat/lon
        const targetLatLon = utmToLatLon(parseFloat(obj.target_x), parseFloat(obj.target_y), scene.utm_zone);
        
        // Create marker at the target position
        const targetMarker = L.marker([targetLatLon.lat, targetLatLon.lon], {
            icon: createCustomIcon('Shooting')
        });
        
        // Add popup with styled content
        let popupContent = `
            <div style="text-align: center;">
                <strong>Shooting</strong><br>
                ${obj.ground_callsign || 'Unknown'}<br>
                <small>Target X: ${parseFloat(obj.target_x).toFixed(1)}, Y: ${parseFloat(obj.target_y).toFixed(1)}</small>
            </div>
        `;
        
        // Add Ground association info if available
        if (obj.associated_ground_id) {
            const groundObj = objects.Ground[obj.associated_ground_id];
            if (groundObj) {
                popupContent += `<hr style="margin: 5px 0;"><small>Associated with: ${groundObj.callsign}</small>`;
            }
        }
        
        targetMarker.bindPopup(popupContent);
        targetMarker.on('click', () => selectObject('Shooting', objectId));
        targetMarker.addTo(map);
        currentMarkers.push(targetMarker);
        
        // Enable dragging for selected objects
        if (selectedObject && selectedObject.type === 'Shooting' && selectedObject.id === objectId) {
            // Add selection indicator
            targetMarker.setIcon(createSelectedIcon('Shooting'));
            targetMarker.dragging.enable();
            targetMarker.on('dragend', (e) => {
                const latLng = e.target.getLatLng();
                const utmCoords = latLonToUTM(latLng.lat, latLng.lng);
                
                // Save to undo stack
                undoStack.push({
                    action: 'updateProperty',
                    objectType: 'Shooting',
                    objectId: objectId,
                    key: 'target_x',
                    oldValue: obj.target_x,
                    newValue: utmCoords.x
                });
                
                // Update the target coordinates
                obj.target_x = utmCoords.x;
                obj.target_y = utmCoords.y;
                updateObjectProperties();
                updateMapDisplay();
            });
        }
        
        // Draw the line from launch to target
        drawShootingLine(obj, { x: parseFloat(obj.target_x), y: parseFloat(obj.target_y) });
    }
}

// Handle map click for object placement
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
            // Simplified Shooting object with only target coordinates (initially)
            newObject.target_x = utmCoords.x;
            newObject.target_y = utmCoords.y;
            newObject.launch_location_x = 'None';
            newObject.launch_location_y = 'None';
            newObject.ammo_type = 'standard';
            newObject.associated_ground_id = null;
            newObject.ground_callsign = '';
            newObject.timestamp = scene.start_timestamp + currentTimestamp;
            // Remove frames as Shooting objects don't move
            delete newObject.frames;
            delete newObject.x;
            delete newObject.y;
            break;
        case 'EnemySpot':
            newObject.desc = 'Enemy spotted';
            newObject.callsign = 'Observer-' + (Object.keys(objects.EnemySpot).length + 1);
            newObject.associated_ground_id = null;
            newObject.ground_callsign = '';
            break;
        case 'Report':
            newObject.desc = 'Report description';
            newObject.callsign = 'Reporter-' + (Object.keys(objects.Report).length + 1);
            newObject.associated_ground_id = null;
            newObject.ground_callsign = '';
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