// Frame management functions

// Add frame at current timestamp
function addFrame() {
    if (!selectedObject) return;
    
    const obj = objects[selectedObject.type][selectedObject.id];
    const currentTime = scene.start_timestamp + currentTimestamp;
    
    // Check if frame already exists
    const existingFrame = obj.frames.find(f => f.timestamp === currentTime);
    if (existingFrame) {
        alert('Frame already exists at this timestamp.');
        return;
    }
    
    // Get current position or use last known position
    const lastPosition = getObjectPositionAtTime(obj, currentTime - 1) || { x: obj.x, y: obj.y };
    
    // Save to undo stack
    undoStack.push({
        action: 'addFrame',
        objectType: selectedObject.type,
        objectId: selectedObject.id,
        timestamp: currentTime
    });
    
    obj.frames.push({
        timestamp: currentTime,
        x: lastPosition.x,
        y: lastPosition.y
    });
    
    updateMapDisplay();
    updateFrameList();
}

// Delete frame at current timestamp
function deleteFrame() {
    if (!selectedObject) return;
    
    const obj = objects[selectedObject.type][selectedObject.id];
    const currentTime = scene.start_timestamp + currentTimestamp;
    
    const frameIndex = obj.frames.findIndex(f => f.timestamp === currentTime);
    if (frameIndex === -1) {
        alert('No frame exists at this timestamp.');
        return;
    }
    
    // Save to undo stack
    undoStack.push({
        action: 'deleteFrame',
        objectType: selectedObject.type,
        objectId: selectedObject.id,
        frameData: { ...obj.frames[frameIndex] }
    });
    
    obj.frames.splice(frameIndex, 1);
    updateMapDisplay();
    updateFrameList();
}

// Undo last change
function undoLastChange() {
    if (undoStack.length === 0) {
        alert('Nothing to undo.');
        return;
    }
    
    const lastAction = undoStack.pop();
    
    switch (lastAction.action) {
        case 'create':
            delete objects[lastAction.objectType][lastAction.objectId];
            if (selectedObject && selectedObject.id === lastAction.objectId) {
                selectedObject = null;
                document.getElementById('delete-btn').style.display = 'none';
                document.getElementById('frame-management').style.display = 'none';
            }
            break;
            
        case 'delete':
            objects[lastAction.objectType][lastAction.objectId] = lastAction.objectData;
            break;
            
        case 'move':
            const obj = objects[lastAction.objectType][lastAction.objectId];
            const frameIndex = obj.frames.findIndex(f => f.timestamp === lastAction.timestamp);
            if (frameIndex !== -1) {
                if (lastAction.oldPosition) {
                    obj.frames[frameIndex].x = lastAction.oldPosition.x;
                    obj.frames[frameIndex].y = lastAction.oldPosition.y;
                } else {
                    obj.frames.splice(frameIndex, 1);
                }
            }
            break;
            
        case 'addFrame':
            const addObj = objects[lastAction.objectType][lastAction.objectId];
            const addFrameIndex = addObj.frames.findIndex(f => f.timestamp === lastAction.timestamp);
            if (addFrameIndex !== -1) {
                addObj.frames.splice(addFrameIndex, 1);
            }
            break;
            
        case 'deleteFrame':
            const delObj = objects[lastAction.objectType][lastAction.objectId];
            delObj.frames.push(lastAction.frameData);
            break;
            
        case 'updateProperty':
            const propObj = objects[lastAction.objectType][lastAction.objectId];
            propObj[lastAction.key] = lastAction.oldValue;
            break;
    }
    
    updateObjectsList();
    updateObjectProperties();
    updateMapDisplay();
    updateFrameList();
}

// Update frame list display
function updateFrameList() {
    const frameList = document.getElementById('frame-list');
    frameList.innerHTML = '';
    
    if (!selectedObject) return;
    
    const obj = objects[selectedObject.type][selectedObject.id];
    if (!obj.frames || obj.frames.length === 0) return;
    
    const currentTime = scene.start_timestamp + currentTimestamp;
    const sortedFrames = obj.frames.sort((a, b) => a.timestamp - b.timestamp);
    
    sortedFrames.forEach(frame => {
        const frameItem = document.createElement('div');
        frameItem.className = 'frame-item';
        if (frame.timestamp === currentTime) {
            frameItem.classList.add('current');
        }
        
        const timeOffset = frame.timestamp - scene.start_timestamp;
        const timeStr = formatTime(timeOffset);
        
        frameItem.innerHTML = `
            <span>${timeStr}</span>
            <span>x: ${frame.x.toFixed(2)}, y: ${frame.y.toFixed(2)}</span>
        `;
        
        frameItem.onclick = () => {
            document.getElementById('timeline-slider').value = timeOffset;
            updateTimeline();
        };
        
        frameList.appendChild(frameItem);
    });
}