
// YouTube Subtitle Customizer - Content Script

// Configuration
const DEBUG = true; // Set to false in production
const SUBTITLE_CHECK_INTERVAL = 1000; // ms
const MAX_RETRIES = 10;

// Debug logger
function log(...args) {
  if (DEBUG) {
    console.log('[YouTube Subtitle Customizer]', ...args);
  }
}

// Main state
let customContainer = null;
let retryCount = 0;
let checkInterval = null;

// Load saved styles
function getSubtitleStyles() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['subtitleStyle'], (result) => {
      const defaultStyle = {
        color: "#ffffff",
        backgroundColor: "#000000",
        backgroundOpacity: 75,
        fontSize: 24,
        highlightColor: "#ffff00"
      };
      
      resolve(result.subtitleStyle || defaultStyle);
    });
  });
}

// Find YouTube subtitle container
function findSubtitleContainer() {
  // Try multiple selector patterns that YouTube might use
  const selectors = [
    '.ytp-caption-window-container',
    '.captions-text',
    '.caption-window',
    // Add more selectors if YouTube changes their structure
  ];
  
  for (const selector of selectors) {
    const container = document.querySelector(selector);
    if (container) {
      log('Found subtitle container with selector:', selector);
      return container;
    }
  }
  
  return null;
}

// Create or update custom subtitle container
async function updateCustomSubtitles() {
  const subtitleContainer = findSubtitleContainer();
  const videoContainer = document.querySelector('.html5-video-container');
  
  if (!subtitleContainer) {
    retryCount++;
    if (retryCount > MAX_RETRIES) {
      log('Gave up looking for subtitle container after', MAX_RETRIES, 'attempts');
      clearInterval(checkInterval);
    }
    return;
  }
  
  // Reset retry count if we found the container
  retryCount = 0;
  
  // Get subtitle text
  const subtitleText = subtitleContainer.textContent?.trim() || '';
  
  // Skip if no text or container
  if (!subtitleText || !videoContainer) {
    return;
  }
  
  // Get saved styles
  const style = await getSubtitleStyles();
  
  // Create custom container if it doesn't exist
  if (!customContainer) {
    // Hide original subtitles
    subtitleContainer.style.opacity = '0';
    
    // Create our custom container
    customContainer = document.createElement('div');
    customContainer.id = 'youtube-subtitle-customizer';
    customContainer.style.position = 'absolute';
    customContainer.style.bottom = '10%';
    customContainer.style.width = '100%';
    customContainer.style.textAlign = 'center';
    customContainer.style.zIndex = '9999';
    customContainer.style.pointerEvents = 'none'; // Don't block clicks
    
    videoContainer.appendChild(customContainer);
    log('Created custom subtitle container');
  }
  
  // Convert opacity percentage to hex
  const opacityHex = Math.round(style.backgroundOpacity * 2.55)
    .toString(16)
    .padStart(2, '0');
    
  // Update subtitle content and styling
  customContainer.innerHTML = `
    <div style="
      display: inline-block;
      color: ${style.color};
      background-color: ${style.backgroundColor}${opacityHex};
      font-size: ${style.fontSize}px;
      padding: 4px 8px;
      border-radius: 4px;
      text-shadow: 1px 1px 1px rgba(0,0,0,0.5);
      font-family: Arial, sans-serif;
      max-width: 80%;
      margin: 0 auto;
    ">
      ${subtitleText}
    </div>
  `;
}

// Initialize extension
function initialize() {
  log('Initializing YouTube Subtitle Customizer');
  
  // Start checking for subtitles
  checkInterval = setInterval(updateCustomSubtitles, SUBTITLE_CHECK_INTERVAL);
  
  // Listen for style updates from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'UPDATE_STYLES') {
      log('Received style update:', request.styles);
      chrome.storage.sync.set({ subtitleStyle: request.styles });
      // Force update subtitles with new style
      updateCustomSubtitles();
      sendResponse({ success: true });
    }
  });
  
  // Handle page navigation (for YouTube's SPA behavior)
  const handleNavigation = () => {
    log('URL changed, resetting subtitle customizer');
    if (customContainer) {
      customContainer.remove();
      customContainer = null;
    }
    retryCount = 0;
    
    // Clear and restart interval
    clearInterval(checkInterval);
    checkInterval = setInterval(updateCustomSubtitles, SUBTITLE_CHECK_INTERVAL);
  };
  
  // Watch for YouTube navigation
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      handleNavigation();
    }
  }).observe(document, { subtree: true, childList: true });
}

// Run the initializer when the page is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
