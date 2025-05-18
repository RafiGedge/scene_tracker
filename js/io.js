// Input/Output functions - Save and Load with Windows Security Fixes

// Save scene as ZIP file with proper Windows compatibility
async function saveScene() {
    if (!hasExistingScene) {
        alert('Please initialize a scene first.');
        return;
    }
    
    try {
        const zip = new JSZip();
        const folderName = scene.scene_name.replace(/[<>:"/\\|?*]/g, '_'); // Sanitize filename
        const folder = zip.folder(folderName);
        
        // Save scene.json
        folder.file('scene.json', JSON.stringify(scene, null, 2));
        
        // Save buildings.csv
        if (buildings.length > 0) {
            const buildingsCsv = buildingsToCSV();
            folder.file('buildings.csv', buildingsCsv);
        }
        
        // Save roads.csv
        if (roads.length > 0) {
            const roadsCsv = roadsToCSV();
            folder.file('roads.csv', roadsCsv);
        }
        
        // Save object type CSVs
        for (const [objectType, objectsOfType] of Object.entries(objects)) {
            if (Object.keys(objectsOfType).length === 0) continue;
            const csvData = objectsToCSV(objectsOfType, objectType);
            folder.file(`${objectType.toLowerCase()}.csv`, csvData);
        }
        
        // Generate ZIP with proper options for Windows
        const content = await zip.generateAsync({ 
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 },
            // Add metadata for better Windows compatibility
            comment: `GIS Timeline Scene: ${folderName}`,
            platform: 'UNIX' // Better compatibility
        });
        
        // Create download with proper MIME type and attributes
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `${folderName}_${timestamp}.zip`;
        
        // Method 1: Direct blob download with proper headers
        const url = URL.createObjectURL(new Blob([content], { 
            type: 'application/zip'
        }));
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        a.setAttribute('download', filename); // Force download
        a.setAttribute('type', 'application/zip');
        
        // Add to DOM, click, and remove
        document.body.appendChild(a);
        a.click();
        
        // Clean up after a short delay
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
        
        // Optional: Show success message
        console.log(`Scene saved as ${filename}`);
        
    } catch (error) {
        console.error('Error saving scene:', error);
        alert(`Error saving scene: ${error.message}`);
    }
}

// Alternative download method if the above doesn't work
async function saveSceneAlternative() {
    if (!hasExistingScene) {
        alert('Please initialize a scene first.');
        return;
    }
    
    try {
        const zip = new JSZip();
        const folderName = scene.scene_name.replace(/[<>:"/\\|?*]/g, '_');
        const folder = zip.folder(folderName);
        
        // Add all files as before...
        folder.file('scene.json', JSON.stringify(scene, null, 2));
        // ... (other files)
        
        const content = await zip.generateAsync({ type: 'base64' });
        
        // Create data URL
        const dataUrl = `data:application/zip;base64,${content}`;
        
        // Force download
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `${folderName}_${new Date().toISOString().split('T')[0]}.zip`;
        link.click();
        
    } catch (error) {
        console.error('Error saving scene:', error);
        alert(`Error saving scene: ${error.message}`);
    }
}

// Convert buildings to CSV
function buildingsToCSV() {
    if (buildings.length === 0) return '';
    let csv = 'id,type,geometry\n';
    buildings.forEach(building => {
        const geometry = JSON.stringify(building.points).replace(/"/g, '""'); // Escape quotes
        csv += `${building.id},${building.type},"${geometry}"\n`;
    });
    return csv;
}

// Convert roads to CSV
function roadsToCSV() {
    if (roads.length === 0) return '';
    let csv = 'id,type,geometry\n';
    roads.forEach(road => {
        const geometry = JSON.stringify(road.points).replace(/"/g, '""'); // Escape quotes
        csv += `${road.id},${road.type},"${geometry}"\n`;
    });
    return csv;
}

// Convert objects to CSV with proper frame handling
function objectsToCSV(objects, type) {
    if (Object.keys(objects).length === 0) return '';
    const headers = getCSVHeaders(type);
    let csv = headers.join(',') + '\n';
    
    for (const obj of Object.values(objects)) {
        // For objects with frames, create a row for each frame
        if (obj.frames && obj.frames.length > 0) {
            obj.frames.forEach(frame => {
                const values = headers.map(header => {
                    let value;
                    if (header === 'x') value = frame.x;
                    else if (header === 'y') value = frame.y;
                    else if (header === 'timestamp') value = frame.timestamp;
                    else value = obj[header];
                    
                    if (value === undefined || value === null) return '';
                    if (typeof value === 'string' && value.includes(',')) {
                        return `"${value.replace(/"/g, '""')}"`;
                    }
                    return value;
                });
                csv += values.join(',') + '\n';
            });
        } else {
            // Single row for objects without frames
            const values = headers.map(header => {
                const value = obj[header];
                if (value === undefined || value === null) return '';
                if (typeof value === 'string' && value.includes(',')) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            });
            csv += values.join(',') + '\n';
        }
    }
    return csv;
}



// Get CSV headers for object type - Updated for all associable objects
function getCSVHeaders(type) {
    switch (type) {
        case 'Ground': return ['id', 'type', 'callsign', 'x', 'y', 'timestamp'];
        case 'Shooting': return ['associated_ground_id', 'ground_callsign', 'timestamp', 'launch_location_x', 'launch_location_y', 'original_ground_x', 'original_ground_y', 'target_x', 'target_y', 'ammo_type'];
        case 'EnemySpot': return ['timestamp', 'x', 'y', 'desc', 'callsign', 'associated_ground_id', 'ground_callsign', 'original_ground_x', 'original_ground_y'];
        case 'Report': return ['timestamp', 'x', 'y', 'desc', 'callsign', 'associated_ground_id', 'ground_callsign', 'original_ground_x', 'original_ground_y'];
        case 'Targets': return ['creation_time', 'x', 'y', 'target_type'];
        case 'EnemyInfrastructure': return ['id', 'type', 'x', 'y', 'timestamp'];
        default: return [];
    }
}

// Show load options
function showLoadOptions() {
    document.getElementById('load-modal').classList.remove('hidden');
}

// Close load modal
function closeLoadModal() {
    document.getElementById('load-modal').classList.add('hidden');
    clearStatus('load-status');
}

// Load selected ZIP file with better error handling
async function loadSelectedFile() {
    const zipInput = document.getElementById('zip-file-input');
    if (!zipInput.files.length) {
        showStatus('load-status', 'Please select a ZIP file to load.', 'error');
        return;
    }
    
    showStatus('load-status', 'Loading scene...', 'loading');
    
    try {
        const file = zipInput.files[0];
        
        // Validate file type
        if (!file.name.toLowerCase().endsWith('.zip')) {
            throw new Error('Please select a ZIP file.');
        }
        
        const zip = new JSZip();
        const content = await zip.loadAsync(file);
        
        // Find scene.json (could be in root or subfolder)
        let sceneFile = null;
        let sceneFolder = null;
        
        for (const fileName of Object.keys(content.files)) {
            if (fileName.endsWith('scene.json') && !content.files[fileName].dir) {
                sceneFile = content.files[fileName];
                const pathParts = fileName.split('/');
                if (pathParts.length > 1) {
                    sceneFolder = pathParts[0] + '/';
                }
                break;
            }
        }
        
        if (!sceneFile) {
            throw new Error('scene.json not found in the ZIP file.');
        }
        
        // Load scene.json
        const sceneContent = await sceneFile.async('string');
        scene = JSON.parse(sceneContent);
        
        // Validate scene data
        if (!scene.scene_name || !scene.center_lat || !scene.center_lon) {
            throw new Error('Invalid scene.json format.');
        }
        
        // Load building and road data
        buildings = [];
        roads = [];
        
        const buildingsFile = content.files[(sceneFolder || '') + 'buildings.csv'];
        if (buildingsFile && !buildingsFile.dir) {
            const buildingsCsv = await buildingsFile.async('string');
            buildings = parseBuildingsCSV(buildingsCsv);
        }
        
        const roadsFile = content.files[(sceneFolder || '') + 'roads.csv'];
        if (roadsFile && !roadsFile.dir) {
            const roadsCsv = await roadsFile.async('string');
            roads = parseRoadsCSV(roadsCsv);
        }
        
        // Load object data
        initializeObjects();
        
        // Load each object type
        const objectTypes = ['Ground', 'Shooting', 'EnemySpot', 'Report', 'Targets', 'EnemyInfrastructure'];
        for (const objectType of objectTypes) {
            const fileName = (sceneFolder || '') + objectType.toLowerCase() + '.csv';
            const file = content.files[fileName];
            if (file && !file.dir) {
                const csvContent = await file.async('string');
                objects[objectType] = parseObjectCSV(csvContent, objectType);
            }
        }
        
        // Setup scene
        const duration = (scene.end_timestamp - scene.start_timestamp) / 60;
        setupMapAndScene(scene.center_lat, scene.center_lon, scene.radius_meters, duration);
        
        // Update timeline
        currentTimestamp = 0;
        const timelineSlider = document.getElementById('timeline-slider');
        timelineSlider.value = 0;
        updateTimeline();
        
        showStatus('load-status', 'Scene loaded successfully!', 'success');
        setTimeout(() => {
            closeLoadModal();
        }, 1500);
        
    } catch (error) {
        console.error('Load error:', error);
        showStatus('load-status', `Error loading file: ${error.message}`, 'error');
    }
}

// Parse buildings CSV with error handling
function parseBuildingsCSV(csv) {
    const lines = csv.split('\n').filter(line => line.trim());
    if (lines.length <= 1) return [];
    
    const buildings = [];
    for (let i = 1; i < lines.length; i++) {
        try {
            const parts = parseCSVLine(lines[i]);
            if (parts.length >= 3) {
                buildings.push({
                    id: parts[0],
                    type: parts[1],
                    points: JSON.parse(parts[2])
                });
            }
        } catch (e) {
            console.warn('Error parsing building CSV line:', lines[i], e);
        }
    }
    return buildings;
}

// Parse roads CSV with error handling
function parseRoadsCSV(csv) {
    const lines = csv.split('\n').filter(line => line.trim());
    if (lines.length <= 1) return [];
    
    const roads = [];
    for (let i = 1; i < lines.length; i++) {
        try {
            const parts = parseCSVLine(lines[i]);
            if (parts.length >= 3) {
                roads.push({
                    id: parts[0],
                    type: parts[1],
                    points: JSON.parse(parts[2])
                });
            }
        } catch (e) {
            console.warn('Error parsing road CSV line:', lines[i], e);
        }
    }
    return roads;
}

// Parse object CSV with improved error handling
function parseObjectCSV(csv, objectType) {
    const lines = csv.split('\n').filter(line => line.trim());
    if (lines.length <= 1) return {};
    
    const headers = parseCSVLine(lines[0]);
    const objects = {};
    
    for (let i = 1; i < lines.length; i++) {
        try {
            const parts = parseCSVLine(lines[i]);
            const obj = {};
            
            headers.forEach((header, index) => {
                let value = parts[index] || '';
                // Convert numeric fields
                if (value && (header.includes('_time') || header === 'timestamp' || header === 'creation_time')) {
                    value = parseInt(value);
                } else if (value && (header === 'x' || header === 'y' || header.includes('_x') || header.includes('_y'))) {
                    value = parseFloat(value);
                }
                obj[header] = value;
            });
            
            // Group frames by object ID
            const objId = obj.id || generateUUID();
            if (!objects[objId]) {
                objects[objId] = { ...obj };
                objects[objId].frames = [];
                // Remove frame-specific data from the main object
                if (objectType !== 'Targets') {
                    delete objects[objId].x;
                    delete objects[objId].y;
                    delete objects[objId].timestamp;
                }
            }
            
            // Add frame data for objects that have timeline data
            if (objectType !== 'Targets' && obj.x !== undefined && obj.y !== undefined && obj.timestamp) {
                objects[objId].frames.push({
                    x: obj.x,
                    y: obj.y,
                    timestamp: obj.timestamp
                });
            }
            
            // For Targets, use creation_time instead of timestamp
            if (objectType === 'Targets' && obj.creation_time) {
                objects[objId].creation_time = obj.creation_time;
                objects[objId].x = obj.x;
                objects[objId].y = obj.y;
            }
        } catch (e) {
            console.warn(`Error parsing ${objectType} CSV line:`, lines[i], e);
        }
    }
    
    return objects;
}

// Parse CSV line with proper quote handling
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
                // Handle escaped quotes
                current += '"';
                i++; // Skip next quote
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current);
    return result;
}

// Download scene (alias for saveScene)
async function downloadScene() {
    await saveScene();
}