// Object management functions with Ground association for all types

// Start adding new object
function startAddingObject() {
    addingObject = true;
    document.getElementById('map').style.cursor = 'crosshair';
}

// Select object
function selectObject(objectType, objectId) {
    selectedObject = { type: objectType, id: objectId };
    document.getElementById('delete-btn').style.display = 'inline-block';
    document.getElementById('frame-management').style.display = 'block';
    
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
    if (!obj.frames || obj.frames.length === 0) {
        if (obj.timestamp && obj.timestamp <= timestamp) {
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
        else if (obj.ground_callsign) displayText = obj.ground_callsign; // For objects with ground association
        else if (obj.target_type) displayText = obj.target_type;
        else if (obj.type) displayText = obj.type;
        else displayText = objectId.substring(0, 8);
        nameSpan.textContent = displayText;
        
        const framesCount = document.createElement('span');
        framesCount.textContent = `(${obj.frames ? obj.frames.length : 1} frames)`;
        framesCount.style.fontSize = '12px';
        framesCount.style.color = '#666';
        
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
    
    // Show current position
    const position = getObjectPositionAtTime(obj, scene.start_timestamp + currentTimestamp);
    if (position) {
        const coordsDiv = document.createElement('div');
        coordsDiv.className = 'coordinates-display';
        coordsDiv.textContent = `UTM: ${position.x.toFixed(2)}, ${position.y.toFixed(2)}`;
        propertiesContainer.appendChild(coordsDiv);
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

// Update any object with Ground object information - generalized function
function updateWithGroundObject(objectType, fieldKey, groundObjectId) {
    if (!selectedObject) return;
    
    const obj = objects[selectedObject.type][selectedObject.id];
    
    if (!groundObjectId) {
        // Clear the associated ground object
        obj.associated_ground_id = null;
        obj.ground_callsign = '';
        
        // Specific to Shooting objects
        if (objectType === 'Shooting') {
            obj.launch_location_x = 'None';
            obj.launch_location_y = 'None';
            obj.original_ground_x = null;
            obj.original_ground_y = null;
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
                
                // Specific to Shooting objects
                if (objectType === 'Shooting') {
                    obj.launch_location_x = groundPosition.x;
                    obj.launch_location_y = groundPosition.y;
                    
                    // Store the original ground position when association is made
                    obj.original_ground_x = groundPosition.x;
                    obj.original_ground_y = groundPosition.y;
                }
                
                // Store original position for EnemySpot and Report objects too
                if (objectType === 'EnemySpot' || objectType === 'Report') {
                    obj.original_ground_x = groundPosition.x;
                    obj.original_ground_y = groundPosition.y;
                }
            } else {
                // Out of scene or no position - set to None
                obj.associated_ground_id = groundObjectId; // Keep the association
                obj.ground_callsign = groundObj.callsign || 'Unknown';
                
                // Specific to Shooting objects
                if (objectType === 'Shooting') {
                    obj.launch_location_x = 'None';
                    obj.launch_location_y = 'None';
                    obj.original_ground_x = null;
                    obj.original_ground_y = null;
                }
                
                // Clear original position for EnemySpot and Report objects too
                if (objectType === 'EnemySpot' || objectType === 'Report') {
                    obj.original_ground_x = null;
                    obj.original_ground_y = null;
                }
            }
        }
    }
    
    // Update the display
    updateObjectProperties();
    updateMapDisplay();
}

// Get fields for object type - with Ground association for EnemySpot and Report
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
}