// Utility functions

// Degree to radian conversion
function degToRad(deg) { return deg * (Math.PI / 180); }

// Radian to degree conversion
function radToDeg(rad) { return rad * (180 / Math.PI); }

// Generate UUID
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Convert Lat/Lon to UTM
function latLonToUTM(lat, lon) {
    const zone = Math.floor((lon + 180) / 6) + 1;
    const centralMeridian = (zone - 1) * 6 - 180 + 3;
    const k0 = 0.9996, e = 0.0818191908426215, e2 = e * e, a = 6378137.0;
    const latRad = degToRad(lat), lonRad = degToRad(lon), lonOriginRad = degToRad(centralMeridian);
    const N = a / Math.sqrt(1 - e2 * Math.sin(latRad) * Math.sin(latRad));
    const T = Math.tan(latRad) * Math.tan(latRad);
    const C = (e2 / (1 - e2)) * Math.cos(latRad) * Math.cos(latRad);
    const A = Math.cos(latRad) * (lonRad - lonOriginRad);
    const M = a * ((1 - e2/4 - 3*e2*e2/64 - 5*e2*e2*e2/256) * latRad
                 - (3*e2/8 + 3*e2*e2/32 + 45*e2*e2*e2/1024) * Math.sin(2*latRad)
                 + (15*e2*e2/256 + 45*e2*e2*e2/1024) * Math.sin(4*latRad)
                 - (35*e2*e2*e2/3072) * Math.sin(6*latRad));
    const x = k0 * N * (A + (1-T+C)*A*A*A/6 + (5-18*T+T*T+72*C-58)*A*A*A*A*A/120) + 500000;
    const y = k0 * (M + N * Math.tan(latRad) * (A*A/2 + (5-T+9*C+4*C*C)*A*A*A*A/24 + (61-58*T+T*T+600*C-330)*A*A*A*A*A*A/720));
    return { x, y, zone };
}

// Convert UTM to Lat/Lon
function utmToLatLon(x, y, zone) {
    const k0 = 0.9996, e = 0.0818191908426215, e1 = (1 - Math.sqrt(1 - e*e)) / (1 + Math.sqrt(1 - e*e)), a = 6378137.0;
    const x_offset = x - 500000, M = y / k0;
    const mu = M / (a * (1 - e*e/4 - 3*e*e*e*e/64 - 5*e*e*e*e*e*e/256));
    const phi1Rad = mu + (3*e1/2 - 27*e1*e1*e1/32) * Math.sin(2*mu) 
                      + (21*e1*e1/16 - 55*e1*e1*e1*e1/32) * Math.sin(4*mu)
                      + (151*e1*e1*e1/96) * Math.sin(6*mu);
    const N1 = a / Math.sqrt(1 - e*e * Math.sin(phi1Rad) * Math.sin(phi1Rad));
    const T1 = Math.tan(phi1Rad) * Math.tan(phi1Rad);
    const C1 = (e*e / (1 - e*e)) * Math.cos(phi1Rad) * Math.cos(phi1Rad);
    const R1 = a * (1 - e*e) / Math.pow(1 - e*e * Math.sin(phi1Rad) * Math.sin(phi1Rad), 1.5);
    const D = x_offset / (N1 * k0);
    const lat = phi1Rad - (N1 * Math.tan(phi1Rad) / R1) * (D*D/2 - (5+3*T1+10*C1-4*C1*C1-9*e*e)*D*D*D*D/24
                         + (61+90*T1+298*C1+45*T1*T1-252*e*e-3*C1*C1)*D*D*D*D*D*D/720);
    const lon = ((zone - 1) * 6 - 180 + 3) + radToDeg(D - (1+2*T1+C1)*D*D*D/6 + (5-2*C1+28*T1-3*C1*C1+8*e*e+24*T1*T1)*D*D*D*D*D/120) / Math.cos(phi1Rad);
    return { lat: radToDeg(lat), lon };
}

// Format time from seconds to HH:MM:SS
function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Show status message
function showStatus(element, message, type) {
    const statusDiv = document.getElementById(element);
    statusDiv.innerHTML = `<div class="${type}-message">${message}</div>`;
}

// Clear status message
function clearStatus(element) {
    const statusDiv = document.getElementById(element);
    statusDiv.innerHTML = '';
}