// Global variables
let map, scene = {}, objects = {}, buildings = [], roads = [];
let currentTimestamp = 0, isPlaying = false, playInterval;
let selectedObject = null, addingObject = false, currentMarkers = [];
let hasExistingScene = false, currentObjectType = 'Ground';
let undoStack = [], frameHistory = {};

// Object type definitions
const OBJECT_TYPES = {
    Ground: 'Ground',
    Shooting: 'Shooting',
    EnemySpot: 'EnemySpot',
    Report: 'Report',
    Targets: 'Targets',
    EnemyInfrastructure: 'EnemyInfrastructure'
};

// Initialize objects structure
function initializeObjects() {
    objects = {
        Ground: {},
        Shooting: {},
        EnemySpot: {},
        Report: {},
        Targets: {},
        EnemyInfrastructure: {}
    };
}

// Initialize app
function initializeApp() {
    initializeObjects();
    document.getElementById('scene-info').textContent = 'Create a new scene to get started';
}