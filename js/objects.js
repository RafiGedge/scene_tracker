// Object management functions with modified shooting behavior

// Start adding new object
function startAddingObject() {
    addingObject = true;
    document.getElementById('map').style.cursor = 'crosshair';
}

// Select object
function selectObject(objectType, objectId) {
    selectedObject = { type: objectType, id: objectId };
    document.getElementById('delete-btn').style.display = 'inline-block';
    document.getElementById('frame-management').style.display = objectType !== 'Shooting' ? 'block' : 'none';
    
    // Switch to the correct object type tab
    const tabs = document.querySelectorAll('.object-type-tab');
    tabs.forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.type === objectType) {
            tab.classList.add('active');
        }
    });
    currentObjectType = objectType;
    
    updateObjectsList();
    updateObjectProperties();
    updateMapDisplay();
    updateFrameList();
}

// Delete object
function deleteObject() {
    if (!selectedObject) return;
    
    const objectName = objects[selectedObject.type][selectedObject.id].callsign || selectedObject.id;
    if (confirm(`Are you sure you want to delete ${selectedObject.type}: ${objectName}?`)) {
        // Save to undo stack
        undoStack.push({
            action: 'delete',
            objectType: selectedObject.type,
            objectId: selectedObject.id,
            objectData: { ...objects[selectedObject.type][selectedObject.id] }
        });
        
        delete objects[selectedObject.type][selectedObject.id];
        selectedObject = null;
        document.getElementById('delete-btn').style.display = 'none';
        document.getElementById('frame-management').style.display = 'none';
        updateObjectsList();
        updateObjectProperties();
        updateMapDisplay();
        updateFrameList();
    }
}

// Update object position when dragged
function updateObjectPosition(objectType, objectId, latLng) {
    const utmCoords = latLonToUTM(latLng.lat, latLng.lng);
    const obj = objects[objectType][objectId];
    const currentTime = scene.start_timestamp + currentTimestamp;
    
    // Save to undo stack
    undoStack.push({
        action: 'move',
        objectType: objectType,
        objectId: objectId,
        timestamp: currentTime,
        oldPosition: getObjectPositionAtTime(obj, currentTime)
    });
    
    obj.frames = obj.frames || [];
    
    let frame = obj.frames.find(f => f.timestamp === currentTime);
    if (!frame) {
        frame = { timestamp: currentTime, x: utmCoords.x, y: utmCoords.y };
        obj.frames.push(frame);
    } else {
        frame.x = utmCoords.x;
        frame.y = utmCoords.y;
    }
    
    // Update object's base position (for compatibility)
    obj.x = utmCoords.x;
    obj.y = utmCoords.y;
    obj.timestamp = currentTime;
    
    updateObjectsList();
    updateObjectProperties();
    updateFrameList();
}

// Get object position at specific time
function getObjectPositionAtTime(obj, timestamp) {
    try {
        // Special handling for Shooting objects
        if (obj && obj.target_x !== undefined && obj.target_y !== undefined) {
            // This is a Shooting object - they don't have frames
            // Return target position when asked (they don't move)
            return { x: parseFloat(obj.target_x), y: parseFloat(obj.target_y) };
        }
        
        // For other object types, use frames
        if (!obj || !obj.frames || obj.frames.length === 0) {
            if (obj && obj.timestamp && obj.timestamp <= timestamp) {
                return { x: obj.x, y: obj.y };
            }
            return null;
        }
        
        const sortedFrames = obj.frames.sort((a, b) => a.timestamp - b.timestamp);
        let lastFrame = null;
        for (const frame of sortedFrames) {
            if (frame.timestamp <= timestamp) {
                lastFrame = frame;
            } else {
                break;
            }
        }
        
        return lastFrame;
    } catch (error) {
        console.error("Error in getObjectPositionAtTime:", error, "Object:", obj);
        return null; // Return null in case of any error
    }
}

// Update objects list
function updateObjectsList() {
    const listContainer = document.getElementById('objects-list');
    listContainer.innerHTML = '';
    
    const objectsOfType = objects[currentObjectType] || {};
    
    for (const [objectId, obj] of Object.entries(objectsOfType)) {
        const item = document.createElement('div');
        item.className = 'object-item';
        if (selectedObject && selectedObject.type === currentObjectType && selectedObject.id === objectId) {
            item.classList.add('selected');
        }
        
        const nameSpan = document.createElement('span');
        let displayText = '';
        if (obj.callsign) displayText = obj.callsign;
        else if (obj.ground_callsign) displayText = obj.ground_callsign; 
        else if (obj.target_type) displayText = obj.target_type;
        else if (obj.type) displayText = obj.type;
        else displayText = objectId.substring(0, 8);
        nameSpan.textContent = displayText;
        
        const framesCount = document.createElement('span');
        if (currentObjectType === 'Shooting') {
            // For Shooting objects, don't show frames count
            framesCount.textContent = '';
        } else {
            framesCount.textContent = `(${obj.frames ? obj.frames.length : 1} frames)`;
            framesCount.style.fontSize = '12px';
            framesCount.style.color = '#666';
        }
        
        item.appendChild(nameSpan);
        item.appendChild(framesCount);
        item.onclick = () => selectObject(currentObjectType, objectId);
        listContainer.appendChild(item);
    }
}

// Update object properties panel
function updateObjectProperties() {
    const propertiesContainer = document.getElementById('object-properties');
    propertiesContainer.innerHTML = '';
    
    if (!selectedObject) return;
    const obj = objects[selectedObject.type][selectedObject.id];
    if (!obj) return;
    
    const fields = getFieldsForObjectType(selectedObject.type);
    
    fields.forEach(field => {
        const group = document.createElement('div');
        group.className = 'form-group';
        
        const label = document.createElement('label');
        label.textContent = field.label + ':';
        group.appendChild(label);
        
        let input;
        if (field.type === 'textarea') {
            input = document.createElement('textarea');
            input.rows = 3;
        } else if (field.type === 'select') {
            input = document.createElement('select');
            field.options.forEach(option => {
                const opt = document.createElement('option');
                opt.value = option.value;
                opt.textContent = option.text;
                input.appendChild(opt);
            });
        } else if (field.type === 'ground-select') {
            // Special dropdown for Ground objects
            input = document.createElement('select');
            input.innerHTML = '<option value="">-- Select Ground Object --</option>';
            
            // Populate with available Ground objects
            for (const [groundId, groundObj] of Object.entries(objects.Ground || {})) {
                const opt = document.createElement('option');
                opt.value = groundId;
                opt.textContent = groundObj.callsign || groundId.substring(0, 8);
                if (obj.associated_ground_id === groundId) {
                    opt.selected = true;
                }
                input.appendChild(opt);
            }
        } else {
            input = document.createElement('input');
            input.type = field.type || 'text';
        }
        
        input.value = obj[field.key] || '';
        input.readOnly = field.readOnly || false;
        
        // Special handling for ground-select
        if (field.type === 'ground-select') {
            input.onchange = () => updateWithGroundObject(selectedObject.type, field.key, input.value);
        } else {
            input.onchange = () => updateObjectProperty(field.key, input.value);
        }
        
        group.appendChild(input);
        propertiesContainer.appendChild(group);
    });
    
    // Show current position for non-Shooting objects
    if (selectedObject.type !== 'Shooting') {
        const position = getObjectPositionAtTime(obj, scene.start_timestamp + currentTimestamp);
        if (position) {
            const coordsDiv = document.createElement('div');
            coordsDiv.className = 'coordinates-display';
            coordsDiv.textContent = `UTM: ${position.x.toFixed(2)}, ${position.y.toFixed(2)}`;
            propertiesContainer.appendChild(coordsDiv);
        }
    } else {
        // For Shooting objects, show target coordinates
        if (obj.target_x && obj.target_y) {
            const coordsDiv = document.createElement('div');
            coordsDiv.className = 'coordinates-display';
            coordsDiv.textContent = `Target UTM: ${parseFloat(obj.target_x).toFixed(2)}, ${parseFloat(obj.target_y).toFixed(2)}`;
            propertiesContainer.appendChild(coordsDiv);
        }
    }
}

// Check if position is within scene radius
function isPositionInScene(x, y) {
    if (!scene.center_x || !scene.center_y || !scene.radius_meters) return false;
    
    const distance = Math.sqrt(
        Math.pow(x - scene.center_x, 2) + Math.pow(y - scene.center_y, 2)
    );
    
    return distance <= scene.radius_meters;
}

// Update any object with Ground object information - simplified for Shooting objects
function updateWithGroundObject(objectType, fieldKey, groundObjectId) {
    if (!selectedObject) return;
    
    const obj = objects[selectedObject.type][selectedObject.id];
    
    if (!groundObjectId) {
        // Clear the associated ground object
        obj.associated_ground_id = null;
        obj.ground_callsign = '';
        
        // For Shooting objects, clear launch location too
        if (objectType === 'Shooting') {
            obj.launch_location_x = 'None';
            obj.launch_location_y = 'None';
        }
    } else {
        const groundObj = objects.Ground[groundObjectId];
        if (groundObj) {
            // Get ground object position at CURRENT time
            const currentTime = scene.start_timestamp + currentTimestamp;
            const groundPosition = getObjectPositionAtTime(groundObj, currentTime);
            
            if (groundPosition && isPositionInScene(groundPosition.x, groundPosition.y)) {
                // Within scene - set the values
                obj.associated_ground_id = groundObjectId;
                obj.ground_callsign = groundObj.callsign || 'Unknown';
                
                // For Shooting objects, set launch location to current ground position
                if (objectType === 'Shooting') {
                    obj.launch_location_x = groundPosition.x;
                    obj.launch_location_y = groundPosition.y;
                    // Also record creation timestamp
                    obj.timestamp = currentTime;
                }
            } else {
                // Out of scene or no position
                obj.associated_ground_id = groundObjectId; // Keep the association
                obj.ground_callsign = groundObj.callsign || 'Unknown';
                
                // For Shooting objects - set to None if position not available
                if (objectType === 'Shooting') {
                    obj.launch_location_x = 'None';
                    obj.launch_location_y = 'None';
                }
            }
        }
    }
    
    // Update the display
    updateObjectProperties();
    updateMapDisplay();
}

// Get fields for object type - simplified for Shooting objects
function getFieldsForObjectType(objectType) {
    switch (objectType) {
        case 'Ground': return [
            { key: 'callsign', label: 'Callsign', type: 'text' },
            { key: 'type', label: 'Type', type: 'text' }
        ];
        case 'Shooting': return [
            { key: 'associated_ground_id', label: 'Associated Ground Object', type: 'ground-select' },
            { key: 'ground_callsign', label: 'Ground Callsign', type: 'text', readOnly: true },
            { key: 'timestamp', label: 'Created Timestamp', type: 'text', readOnly: true },
            { key: 'ammo_type', label: 'Ammo Type', type: 'text' },
            { key: 'launch_location_x', label: 'Launch X', type: 'text', readOnly: true },
            { key: 'launch_location_y', label: 'Launch Y', type: 'text', readOnly: true },
            { key: 'target_x', label: 'Target X', type: 'number' },
            { key: 'target_y', label: 'Target Y', type: 'number' }
        ];
        case 'EnemySpot': return [
            { key: 'associated_ground_id', label: 'Associated Ground Object', type: 'ground-select' },
            { key: 'ground_callsign', label: 'Ground Callsign', type: 'text', readOnly: true },
            { key: 'callsign', label: 'Callsign', type: 'text' },
            { key: 'desc', label: 'Description', type: 'textarea' }
        ];
        case 'Report': return [
            { key: 'associated_ground_id', label: 'Associated Ground Object', type: 'ground-select' },
            { key: 'ground_callsign', label: 'Ground Callsign', type: 'text', readOnly: true },
            { key: 'callsign', label: 'Callsign', type: 'text' },
            { key: 'desc', label: 'Description', type: 'textarea' }
        ];
        case 'Targets': return [
            { key: 'target_type', label: 'Target Type', type: 'text' }
        ];
        case 'EnemyInfrastructure': return [
            { key: 'type', label: 'Type', type: 'text' }
        ];
        default: return [];
    }
}

// Update object property
function updateObjectProperty(key, value) {
    if (!selectedObject) return;
    const obj = objects[selectedObject.type][selectedObject.id];
    
    // Save to undo stack
    undoStack.push({
        action: 'updateProperty',
        objectType: selectedObject.type,
        objectId: selectedObject.id,
        key: key,
        oldValue: obj[key],
        newValue: value
    });
    
    obj[key] = value;
    updateObjectsList();
    
    // Update map display if we changed target coordinates for a Shooting object
    if (selectedObject.type === 'Shooting' && (key === 'target_x' || key === 'target_y')) {
        updateMapDisplay();
    }
}