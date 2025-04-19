
// Observer to watch for YouTube subtitle elements
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.addedNodes.length) {
      const subtitles = document.querySelector('.ytp-caption-window-container');
      if (subtitles) {
        customizeSubtitles(subtitles);
      }
    }
  });
});

// Start observing the document with the configured parameters
observer.observe(document.body, { childList: true, subtree: true });

// Function to customize subtitles
function customizeSubtitles(subtitleContainer) {
  // Hide original subtitles
  subtitleContainer.style.display = 'none';
  
  // Get saved styles from storage
  chrome.storage.sync.get(['subtitleStyle'], (result) => {
    const style = result.subtitleStyle || {
      color: "#ffffff",
      backgroundColor: "#000000",
      backgroundOpacity: 75,
      fontSize: 24,
      highlightColor: "#ffff00"
    };
    
    // Create custom subtitle container
    const customContainer = document.createElement('div');
    customContainer.id = 'custom-subtitle-container';
    customContainer.style.position = 'absolute';
    customContainer.style.bottom = '10%';
    customContainer.style.width = '100%';
    customContainer.style.textAlign = 'center';
    customContainer.style.zIndex = '9999';
    
    // Apply custom styles
    const text = subtitleContainer.textContent;
    customContainer.innerHTML = `
      <div style="
        display: inline-block;
        color: ${style.color};
        background-color: ${style.backgroundColor}${Math.round(style.backgroundOpacity * 2.55).toString(16).padStart(2, '0')};
        font-size: ${style.fontSize}px;
        padding: 4px 8px;
        border-radius: 4px;
      ">
        ${text}
      </div>
    `;
    
    // Add custom container to video
    const videoContainer = document.querySelector('.html5-video-container');
    if (videoContainer) {
      videoContainer.appendChild(customContainer);
    }
  });
}

// Listen for style updates from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'UPDATE_STYLES') {
    chrome.storage.sync.set({ subtitleStyle: request.styles });
  }
});
