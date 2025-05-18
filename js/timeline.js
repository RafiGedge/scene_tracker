// Timeline management functions with timestamp in formatted date

// Update timeline display with timestamp as formatted date
function updateTimeline() {
    const slider = document.getElementById('timeline-slider');
    currentTimestamp = parseInt(slider.value);
    
    // Calculate the absolute timestamp
    const absoluteTimestamp = scene.start_timestamp + currentTimestamp;
    
    // Format the relative time (HH:MM:SS)
    const hours = Math.floor(currentTimestamp / 3600);
    const minutes = Math.floor((currentTimestamp % 3600) / 60);
    const seconds = currentTimestamp % 60;
    const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Format the absolute timestamp as a regular date and time
    const date = new Date(absoluteTimestamp * 1000);
    const formattedDate = date.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    // Display both relative time and absolute date
    document.getElementById('current-time').textContent = `${formattedTime} [${formattedDate}]`;
    
    updateMapDisplay();
    updateFrameList();
}

// Play/pause timeline with corrected speed calculation
function playPause() {
    // Stop any existing playback
    if (playInterval) {
        clearInterval(playInterval);
        playInterval = null;
    }
    
    const button = event.target;
    
    if (isPlaying) {
        button.textContent = 'Play';
        isPlaying = false;
        console.log('Playback stopped');
    } else {
        const speed = parseInt(document.getElementById('playback-speed').value);
        button.textContent = 'Pause';
        isPlaying = true;
        
        // Calculate interval for proper speed
        // For 10x speed: we want to show 10 seconds in 1 real second
        // So we update every 1000ms/10 = 100ms
        const intervalMs = Math.max(10, Math.floor(1000 / speed)); // Min 10ms to prevent too fast updates
        
        console.log(`Starting playback: ${speed}x speed, interval: ${intervalMs}ms`);
        
        // Track start time for accurate timing
        let startTime = Date.now();
        let expectedTime = startTime;
        let frameCount = 0;
        
        playInterval = setInterval(() => {
            const slider = document.getElementById('timeline-slider');
            const currentValue = parseInt(slider.value);
            const maxValue = parseInt(slider.max);
            
            // Check if we've reached the end
            if (currentValue >= maxValue) {
                clearInterval(playInterval);
                playInterval = null;
                button.textContent = 'Play';
                isPlaying = false;
                console.log('Playback finished - reached end');
                return;
            }
            
            // Increment by 1 second
            const newValue = currentValue + 1;
            slider.value = newValue;
            updateTimeline();
            
            // Debug timing information
            frameCount++;
            expectedTime += intervalMs;
            const currentTime = Date.now();
            const timeDrift = currentTime - expectedTime;
            
            if (frameCount % 10 === 0) { // Log every 10 frames
                console.log(`Frame ${frameCount}: Timeline at ${newValue}s, Drift: ${timeDrift}ms`);
            }
        }, intervalMs);
    }
}

// Reset timeline to beginning
function resetTimeline() {
    // Stop playback first
    if (isPlaying) {
        const playButton = document.querySelector('#timeline-container .button');
        if (playButton) {
            playButton.click(); // This will stop playback
        }
    }
    
    const slider = document.getElementById('timeline-slider');
    slider.value = 0;
    updateTimeline();
    console.log('Timeline reset to 0');
}