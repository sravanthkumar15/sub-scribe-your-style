// YouTube Subtitle Customizer - Content Script
// 
// The approach:
// 1. We use a MutationObserver to detect when captions appear
// 2. We don't try to hide the original captions, just create our own overlay
// 3. We position our captions at the bottom of the video player
// 4. We use simple, reliable DOM operations

// Configuration
const DEBUG = true; // Set to false for production
let debugMode = false;
let debugInfo = [];

// Simple logging function
function log(...args) {
  if (DEBUG || debugMode) {
    console.log('[YouTube Subtitle Customizer]', ...args);
    // Keep last 20 logs for debugging
    debugInfo.unshift(new Date().toISOString().substring(11, 19) + ': ' + args.join(' '));
    if (debugInfo.length > 20) debugInfo.pop();
  }
}

// State
let customSubtitlesContainer = null;
let currentVideoId = null;
let lastSubtitleText = '';
let subtitleObserver = null;
let positionInterval = null;
let subtitleCheckInterval = null;

// Default styles
const defaultSubtitleStyle = {
  color: "#ffffff",
  backgroundColor: "#000000",
  backgroundOpacity: 75,
  fontSize: 24,
  highlightColor: "#ffff00"
};

// Load saved styles from chrome storage
function loadStyles() {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.sync.get(['subtitleStyle', 'debugMode'], (result) => {
        if (result.subtitleStyle) {
          log('Loaded saved styles:', result.subtitleStyle);
          resolve(result.subtitleStyle);
        } else {
          log('No saved styles found, using defaults');
          resolve(defaultSubtitleStyle);
        }
        
        // Set debug mode if available
        if (result.debugMode !== undefined) {
          debugMode = result.debugMode;
          log('Debug mode set to:', debugMode);
        }
      });
    } else {
      log('Chrome storage not available, using default styles');
      resolve(defaultSubtitleStyle);
    }
  });
}

// Get the current YouTube video ID
function getYouTubeVideoId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('v');
}

// Find the YouTube subtitle element using multiple approaches
function findSubtitleElement() {
  // First method: look for specific YouTube subtitle selectors
  const selectors = [
    '.ytp-caption-segment',                // Most common
    '.captions-text',                      // Alternative
    '.caption-window',                     // Another alternative
    '.ytp-caption-window-container',       // Container
    '[class*="caption"] span',             // Any element with caption in class name
    '[class*="subtitle"] span'             // Any element with subtitle in class name
  ];
  
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    if (elements && elements.length > 0) {
      for (const element of elements) {
        if (element && element.textContent && element.textContent.trim()) {
          log(`Found subtitle element with selector: ${selector}`);
          return element;
        }
      }
    }
  }
  
  // Log if not found for debugging
  log('No subtitle element found with standard selectors');
  return null;
}

// Simplified function to extract subtitle text
function getSubtitleText() {
  const element = findSubtitleElement();
  if (element && element.textContent) {
    const text = element.textContent.trim();
    if (text) {
      log('Found subtitle text:', text);
      return text;
    }
  }
  return null;
}

// Create the custom subtitles container
function createCustomSubtitlesContainer() {
  // Remove existing container if present
  if (customSubtitlesContainer) {
    customSubtitlesContainer.remove();
  }
  
  // Create new container
  customSubtitlesContainer = document.createElement('div');
  customSubtitlesContainer.id = 'youtube-subtitle-customizer';
  customSubtitlesContainer.style.position = 'absolute';
  customSubtitlesContainer.style.zIndex = '9999';
  customSubtitlesContainer.style.bottom = '60px';
  customSubtitlesContainer.style.left = '0';
  customSubtitlesContainer.style.width = '100%';
  customSubtitlesContainer.style.pointerEvents = 'none';
  customSubtitlesContainer.style.textAlign = 'center';
  customSubtitlesContainer.style.display = 'flex';
  customSubtitlesContainer.style.justifyContent = 'center';
  customSubtitlesContainer.style.transition = 'bottom 0.3s ease-in-out';
  
  // Add to player container
  const videoContainer = document.querySelector('.html5-video-container');
  if (videoContainer) {
    videoContainer.appendChild(customSubtitlesContainer);
    log('Created custom subtitles container in video container');
  } else {
    // Fallback to player
    const player = document.querySelector('.html5-video-player');
    if (player) {
      player.appendChild(customSubtitlesContainer);
      log('Created custom subtitles container in player (fallback)');
    } else {
      // Last resort: add to body
      document.body.appendChild(customSubtitlesContainer);
      log('Created custom subtitles container in body (last resort)');
    }
  }
  
  return customSubtitlesContainer;
}

// Update the custom subtitles with text and styles
async function updateCustomSubtitles(subtitleText, style) {
  // If no style provided, load from storage
  if (!style) {
    style = await loadStyles();
  }
  
  // If no container, create one
  if (!customSubtitlesContainer) {
    createCustomSubtitlesContainer();
  }
  
  // If no text provided, try to get it
  if (!subtitleText) {
    subtitleText = getSubtitleText();
    if (!subtitleText) {
      return false;
    }
  }
  
  // Skip if it's the same as last time
  if (subtitleText === lastSubtitleText) {
    return false;
  }
  
  // Update last text
  lastSubtitleText = subtitleText;
  
  // Convert opacity percentage to hex
  const opacityHex = Math.round(style.backgroundOpacity * 2.55)
    .toString(16)
    .padStart(2, '0');
  
  // Update container content
  customSubtitlesContainer.innerHTML = `
    <div style="
      display: inline-block;
      color: ${style.color};
      background-color: ${style.backgroundColor}${opacityHex};
      font-size: ${style.fontSize}px;
      padding: 6px 10px;
      border-radius: 4px;
      text-shadow: 1px 1px 1px rgba(0,0,0,0.5);
      font-family: Arial, sans-serif;
      font-weight: bold;
      max-width: 80%;
      line-height: 1.3;
      margin-bottom: 20px;
    ">
      ${subtitleText}
    </div>
  `;
  
  log('Updated custom subtitles with text:', subtitleText);
  return true;
}

// Check if the video player is in fullscreen mode
function isFullscreen() {
  return document.fullscreenElement !== null || 
         document.querySelector('.html5-video-player.ytp-fullscreen') !== null;
}

// Update the position of the custom subtitles based on player state
function updateSubtitlePosition() {
  if (!customSubtitlesContainer) return;
  
  try {
    // Get player state
    const fullscreen = isFullscreen();
    const theaterMode = document.querySelector('.html5-video-player.ytp-big-mode') !== null;
    const controlsShowing = document.querySelector('.ytp-chrome-bottom') !== null &&
                           !document.querySelector('.ytp-autohide');
    
    // Adjust position based on player state
    if (fullscreen) {
      customSubtitlesContainer.style.bottom = controlsShowing ? '120px' : '80px';
    } else if (theaterMode) {
      customSubtitlesContainer.style.bottom = controlsShowing ? '100px' : '60px';
    } else {
      customSubtitlesContainer.style.bottom = controlsShowing ? '80px' : '40px';
    }
    
    log('Updated subtitle position. Fullscreen:', fullscreen, 'Theater:', theaterMode, 'Controls:', controlsShowing);
  } catch (e) {
    log('Error updating subtitle position:', e);
  }
}

// Start checking for subtitles
function startSubtitleCheck() {
  // Stop any existing interval
  if (subtitleCheckInterval) {
    clearInterval(subtitleCheckInterval);
  }
  
  // Start new interval
  subtitleCheckInterval = setInterval(async () => {
    const subtitleText = getSubtitleText();
    if (subtitleText) {
      updateCustomSubtitles(subtitleText);
    }
  }, 500); // Check every half second
  
  log('Started subtitle check interval');
}

// Initialize position check interval
function startPositionCheck() {
  // Stop any existing interval
  if (positionInterval) {
    clearInterval(positionInterval);
  }
  
  // Start new interval
  positionInterval = setInterval(updateSubtitlePosition, 1000);
  
  log('Started position check interval');
}

// Set up mutation observer to detect when subtitles appear
function setupSubtitleObserver() {
  // Disconnect existing observer if any
  if (subtitleObserver) {
    subtitleObserver.disconnect();
  }
  
  // Create new observer
  subtitleObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList' || mutation.type === 'characterData') {
        const subtitleText = getSubtitleText();
        if (subtitleText) {
          updateCustomSubtitles(subtitleText);
        }
      }
    }
  });
  
  // Start observing
  subtitleObserver.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
  
  log('Set up subtitle mutation observer');
}

// Clean up everything
function cleanup() {
  if (subtitleObserver) {
    subtitleObserver.disconnect();
    subtitleObserver = null;
  }
  
  if (subtitleCheckInterval) {
    clearInterval(subtitleCheckInterval);
    subtitleCheckInterval = null;
  }
  
  if (positionInterval) {
    clearInterval(positionInterval);
    positionInterval = null;
  }
  
  if (customSubtitlesContainer) {
    customSubtitlesContainer.remove();
    customSubtitlesContainer = null;
  }
  
  lastSubtitleText = '';
  
  log('Cleaned up all resources');
}

// Force refresh subtitles
function forceRefresh() {
  log('Forcing refresh of subtitles');
  
  // Clean up first
  cleanup();
  
  // Set up everything again
  initialize();
  
  // Force update
  setTimeout(async () => {
    const subtitleText = getSubtitleText();
    if (subtitleText) {
      const style = await loadStyles();
      updateCustomSubtitles(subtitleText, style);
    }
  }, 500);
}

// Initialize the extension
function initialize() {
  log('Initializing YouTube Subtitle Customizer');
  
  // Get current video ID
  currentVideoId = getYouTubeVideoId();
  
  // Create subtitles container
  createCustomSubtitlesContainer();
  
  // Set up observers and intervals
  setupSubtitleObserver();
  startSubtitleCheck();
  startPositionCheck();
  
  // Initial position update
  updateSubtitlePosition();
  
  log('Initialization complete');
}

// Handle navigation (YouTube is a SPA)
const handleNavigation = () => {
  log('URL changed, checking if we need to reinitialize');
  
  // Get new video ID
  const newVideoId = getYouTubeVideoId();
  
  // If video ID changed, reinitialize
  if (newVideoId !== currentVideoId) {
    log('Video ID changed from', currentVideoId, 'to', newVideoId);
    cleanup();
    
    // Short delay to allow YouTube to set up
    setTimeout(initialize, 1000);
  }
};

// Message handler for popup commands
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  log('Received message:', message.type);
  
  switch (message.type) {
    case 'UPDATE_STYLES':
      log('Updating styles:', message.styles);
      updateCustomSubtitles(null, message.styles);
      sendResponse({ success: true });
      break;
    
    case 'FORCE_REFRESH':
      log('Force refreshing subtitles');
      forceRefresh();
      sendResponse({ success: true });
      break;
    
    case 'TOGGLE_DEBUG':
      debugMode = message.enabled;
      log('Debug mode set to:', debugMode);
      sendResponse({ success: true });
      break;
    
    case 'REQUEST_DEBUG_INFO':
      const info = debugInfo.join('\n');
      log('Sending debug info');
      sendResponse({ success: true, debugInfo: info });
      break;
      
    default:
      log('Unknown message type:', message.type);
      sendResponse({ success: false, error: 'Unknown message type' });
  }
  
  return true; // Keep the message channel open for async responses
});

// Watch for URL changes
let lastUrl = location.href;
const urlObserver = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    handleNavigation();
  }
});

// Watch for fullscreen changes
document.addEventListener('fullscreenchange', updateSubtitlePosition);

// Run when the page is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initialize();
    urlObserver.observe(document, { subtree: true, childList: true });
  });
} else {
  initialize();
  urlObserver.observe(document, { subtree: true, childList: true });
}

// Log that we've loaded
log('Content script loaded successfully');
