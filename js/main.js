// Main application entry point

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize globals
    initializeApp();
    
    // Setup event listeners
    document.getElementById('timeline-slider').addEventListener('input', updateTimeline);
    
    // Setup object type tabs
    setupObjectTypeTabs();
    
    // Make functions available globally
    window.createNewScene = createNewScene;
    window.initializeScene = initializeScene;
    window.saveScene = saveScene;
    window.downloadScene = downloadScene;
    window.showLoadOptions = showLoadOptions;
    window.loadSelectedFile = loadSelectedFile;
    window.closeLoadModal = closeLoadModal;
    window.deleteObject = deleteObject;
    window.startAddingObject = startAddingObject;
    window.playPause = playPause;
    window.resetTimeline = resetTimeline;
    window.addFrame = addFrame;
    window.deleteFrame = deleteFrame;
    window.undoLastChange = undoLastChange;
    
    console.log('App initialized, all functions exposed to global scope');
});

// Setup object type tabs
function setupObjectTypeTabs() {
    const tabs = document.querySelectorAll('.object-type-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentObjectType = tab.dataset.type;
            updateObjectsList();
        });
    });
}