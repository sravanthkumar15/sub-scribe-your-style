
// YouTube Subtitle Customizer - Content Script

// Configuration
const DEBUG = true; // Set to false in production
const SUBTITLE_CHECK_INTERVAL = 100; // ms (reduced for faster response)
const MAX_RETRIES = 30;
const POSITION_CHECK_INTERVAL = 500; // Check positioning more frequently

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
let lastSubtitleText = '';
let isOriginalSubtitleHidden = false;
let positionInterval = null;

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
    '.ytp-caption-segment',
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
  const video = document.querySelector('video');
  
  if (!subtitleContainer) {
    retryCount++;
    if (retryCount > MAX_RETRIES) {
      log('Gave up looking for subtitle container after', MAX_RETRIES, 'attempts');
      clearInterval(checkInterval);
      return;
    }
    log('No subtitle container found, retry', retryCount, 'of', MAX_RETRIES);
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
  
  // Skip if text hasn't changed and we already have a container
  if (subtitleText === lastSubtitleText && customContainer) {
    return;
  }
  
  // Update last seen text
  lastSubtitleText = subtitleText;
  
  log('Updating subtitles with text:', subtitleText);
  
  // Get saved styles
  const style = await getSubtitleStyles();
  
  // Create custom container if it doesn't exist
  if (!customContainer) {
    // First, try to remove any existing container to avoid duplicates
    const existingContainer = document.getElementById('youtube-subtitle-customizer');
    if (existingContainer) {
      existingContainer.remove();
    }
    
    // Create our custom container
    customContainer = document.createElement('div');
    customContainer.id = 'youtube-subtitle-customizer';
    customContainer.style.position = 'absolute';
    customContainer.style.bottom = '10%';
    customContainer.style.left = '0';
    customContainer.style.right = '0';
    customContainer.style.width = '100%';
    customContainer.style.textAlign = 'center';
    customContainer.style.zIndex = '9999999'; // Very high z-index
    customContainer.style.pointerEvents = 'none'; // Don't block clicks
    customContainer.style.display = 'flex';
    customContainer.style.justifyContent = 'center';
    customContainer.style.alignItems = 'flex-end';
    
    // Add it directly to the video container for best positioning
    if (videoContainer) {
      videoContainer.appendChild(customContainer);
      log('Created custom subtitle container in video container');
    } else {
      // Fallback to document.body if videoContainer not found
      document.body.appendChild(customContainer);
      log('Created custom subtitle container in body (fallback)');
    }
    
    // Start position checking interval
    if (!positionInterval) {
      positionInterval = setInterval(checkSubtitlePosition, POSITION_CHECK_INTERVAL);
    }
  }
  
  // Hide original subtitles
  hideOriginalSubtitles();
  
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
      padding: 6px 10px;
      margin-bottom: 60px;
      border-radius: 4px;
      text-shadow: 1px 1px 1px rgba(0,0,0,0.5);
      font-family: Arial, sans-serif;
      font-weight: bold;
      max-width: 80%;
      line-height: 1.3;
      transition: all 0.2s ease-in-out;
    ">
      ${subtitleText}
    </div>
  `;
  
  log('Updated custom subtitles');
}

// Hide original subtitles using multiple approaches
function hideOriginalSubtitles() {
  if (isOriginalSubtitleHidden) {
    return;
  }
  
  try {
    // Multiple approaches to hide captions
    const selectors = [
      '.ytp-caption-window-container',
      '.caption-window',
      '.captions-text',
      '.ytp-caption-segment'
    ];
    
    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        element.style.opacity = '0';
        element.style.visibility = 'hidden';
        element.style.display = 'none'; // More aggressive hiding
      });
    });
    
    // Also try to add a style tag for broader coverage
    if (!document.getElementById('youtube-subtitle-customizer-styles')) {
      const styleTag = document.createElement('style');
      styleTag.id = 'youtube-subtitle-customizer-styles';
      styleTag.textContent = `
        .ytp-caption-window-container, .caption-window, .captions-text, .ytp-caption-segment {
          opacity: 0 !important;
          visibility: hidden !important;
          display: none !important;
        }
      `;
      document.head.appendChild(styleTag);
    }
    
    isOriginalSubtitleHidden = true;
    log('Hidden original subtitles');
  } catch (e) {
    log('Error hiding original subtitles:', e);
  }
}

// Check and adjust the subtitle position based on player state
function checkSubtitlePosition() {
  if (!customContainer) return;
  
  const player = document.querySelector('.html5-video-player');
  const isFullscreen = document.fullscreenElement !== null || 
                      (player && player.classList.contains('ytp-fullscreen'));
  const isTheaterMode = player && player.classList.contains('ytp-big-mode');
  const isEmbedded = window.location.hostname !== 'www.youtube.com';
  
  // Adjust position based on player mode
  if (isFullscreen) {
    customContainer.style.bottom = '15%'; // More space in fullscreen
    customContainer.querySelector('div').style.marginBottom = '90px';
  } else if (isTheaterMode) {
    customContainer.style.bottom = '12%';
    customContainer.querySelector('div').style.marginBottom = '70px';
  } else {
    customContainer.style.bottom = '10%';
    customContainer.querySelector('div').style.marginBottom = '60px';
  }
  
  // Make sure container is visible and positioned correctly
  customContainer.style.display = 'flex';
  
  log('Updated subtitle position. Fullscreen:', isFullscreen, 'Theater:', isTheaterMode);
}

// Initialize extension
function initialize() {
  log('Initializing YouTube Subtitle Customizer');
  
  // Reset state
  if (customContainer) {
    customContainer.remove();
  }
  customContainer = null;
  retryCount = 0;
  isOriginalSubtitleHidden = false;
  lastSubtitleText = '';
  
  // Clear any existing intervals
  if (checkInterval) clearInterval(checkInterval);
  if (positionInterval) clearInterval(positionInterval);
  
  // Start checking for subtitles
  checkInterval = setInterval(updateCustomSubtitles, SUBTITLE_CHECK_INTERVAL);
  
  // Force an immediate check
  setTimeout(updateCustomSubtitles, 100);
  
  // Listen for style updates from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'UPDATE_STYLES') {
      log('Received style update:', request.styles);
      chrome.storage.sync.set({ subtitleStyle: request.styles });
      // Force update subtitles with new style
      lastSubtitleText = ''; // Reset to force update
      updateCustomSubtitles();
      sendResponse({ success: true });
    }
  });
  
  log('Message listener set up successfully');
  log('Extension is active');
}

// Handle page navigation (for YouTube's SPA behavior)
const handleNavigation = () => {
  log('URL changed, resetting subtitle customizer');
  if (customContainer) {
    customContainer.remove();
    customContainer = null;
  }
  
  // Clear intervals
  clearInterval(checkInterval);
  clearInterval(positionInterval);
  
  retryCount = 0;
  isOriginalSubtitleHidden = false;
  lastSubtitleText = '';
  
  // Restart intervals
  checkInterval = setInterval(updateCustomSubtitles, SUBTITLE_CHECK_INTERVAL);
  positionInterval = setInterval(checkSubtitlePosition, POSITION_CHECK_INTERVAL);
  
  // Force an immediate check
  setTimeout(updateCustomSubtitles, 100);
};

// Watch for YouTube navigation
let lastUrl = location.href;
const observer = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    handleNavigation();
  }
});

// Run the initializer when the page is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initialize();
    observer.observe(document, { subtree: true, childList: true });
  });
} else {
  initialize();
  observer.observe(document, { subtree: true, childList: true });
}
