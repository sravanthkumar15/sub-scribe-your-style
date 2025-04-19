// YouTube Subtitle Customizer - Content Script

// Configuration
const DEBUG = true; // Always enable debugging for now
let debugMode = true;
let debugInfo = [];

// Simple logging function with more visibility
function log(...args) {
  console.log('%c[YouTube Subtitle Customizer]', 'background: #9146FF; color: white; padding: 2px 4px; border-radius: 2px;', ...args);
  // Keep last 20 logs for debugging
  debugInfo.unshift(new Date().toISOString().substring(11, 19) + ': ' + args.join(' '));
  if (debugInfo.length > 20) debugInfo.pop();
}

// State
let customSubtitlesContainer = null;
let currentVideoId = null;
let lastSubtitleText = '';
let subtitleObserver = null;
let positionInterval = null;
let videoCheckInterval = null;

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

// This is the main, improved subtitle detection function that focuses on actual caption elements
function findYouTubeSubtitles() {
  // These are the EXACT selectors that YouTube uses for its subtitle text elements
  const captionSelectors = [
    // Primary modern YouTube caption selectors
    '.ytp-caption-segment',                          // Most common current selector
    '.captions-text > span',                         // Another common format
    '.caption-visual-line .ytp-caption-segment',     // Structured captions
    
    // Additional backup selectors
    '.ytp-caption-window-container [class*="caption"] span', // Fallback with wildcard
    '.ytp-caption-window-container div span',               // Most generic
  ];
  
  // Log that we're looking for subtitles in debug mode
  log('Searching for YouTube caption elements...');
  
  // Try each selector
  for (const selector of captionSelectors) {
    const elements = document.querySelectorAll(selector);
    if (elements && elements.length > 0) {
      // Filter out empty elements or suspected metadata
      const validElements = Array.from(elements).filter(el => {
        // Must have content and not be too long (metadata is often very long)
        const text = el.textContent?.trim();
        const isValidLength = text && text.length > 0 && text.length < 300;
        
        // Check if element is visible and inside the video player
        const isVisible = el.offsetWidth > 0 && el.offsetHeight > 0;
        const videoPlayer = document.querySelector('.html5-video-player');
        const isInPlayer = videoPlayer && videoPlayer.contains(el);
        
        return isValidLength && isVisible && isInPlayer;
      });
      
      if (validElements.length > 0) {
        log(`Found ${validElements.length} subtitle elements with selector: ${selector}`);
        return validElements;
      }
    }
  }
  
  // No subtitles found
  log('No subtitle elements found with any selector');
  return null;
}

// Extract subtitle text from valid subtitle elements
function getSubtitleText() {
  const elements = findYouTubeSubtitles();
  
  if (!elements || elements.length === 0) {
    return null;
  }
  
  // Combine text from all subtitle elements
  const textParts = elements.map(el => el.textContent?.trim()).filter(Boolean);
  if (textParts.length === 0) {
    return null;
  }
  
  const text = textParts.join(' ');
  log('Extracted subtitle text:', text);
  return text;
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
  customSubtitlesContainer.style.zIndex = '1000000'; // Very high to ensure it's on top
  customSubtitlesContainer.style.bottom = '80px';  // Position above controls
  customSubtitlesContainer.style.left = '50%';     // Center horizontally
  customSubtitlesContainer.style.transform = 'translateX(-50%)'; // Center alignment
  customSubtitlesContainer.style.width = 'auto';   // Let content determine width
  customSubtitlesContainer.style.maxWidth = '90%'; // Don't get too wide
  customSubtitlesContainer.style.pointerEvents = 'none'; // Don't block video clicks
  customSubtitlesContainer.style.display = 'flex';
  customSubtitlesContainer.style.justifyContent = 'center';
  customSubtitlesContainer.style.transition = 'all 0.3s ease';
  
  // Add a data attribute for debugging
  customSubtitlesContainer.setAttribute('data-custom-subtitles', 'true');
  
  // Find the video container and add our custom container
  const videoPlayer = document.querySelector('.html5-video-player');
  if (videoPlayer) {
    videoPlayer.appendChild(customSubtitlesContainer);
    log('Created custom subtitles container');
    return customSubtitlesContainer;
  }
  
  log('Failed to find video player');
  return null;
}

// Hide original subtitles if needed
function hideOriginalSubtitles() {
  // Add a style tag to hide YouTube's captions
  let styleTag = document.getElementById('youtube-subtitle-customizer-styles');
  
  if (!styleTag) {
    styleTag = document.createElement('style');
    styleTag.id = 'youtube-subtitle-customizer-styles';
    document.head.appendChild(styleTag);
  }
  
  // CSS to hide YouTube's caption container
  styleTag.textContent = `
    .ytp-caption-window-container, 
    .captions-text, 
    .ytp-caption-segment {
      opacity: 0 !important;
      visibility: hidden !important;
    }
  `;
  
  log('Hidden original YouTube subtitles');
}

// Update the custom subtitles with text and styles
async function updateCustomSubtitles(subtitleText, style) {
  // If no style provided, load from storage
  if (!style) {
    style = await loadStyles();
  }
  
  // If no container, create one
  if (!customSubtitlesContainer) {
    customSubtitlesContainer = createCustomSubtitlesContainer();
    if (!customSubtitlesContainer) {
      log('Failed to create custom subtitles container');
      return false;
    }
  }
  
  // If no text provided, try to get it
  if (!subtitleText) {
    subtitleText = getSubtitleText();
    if (!subtitleText) {
      if (customSubtitlesContainer.innerHTML) {
        log('No subtitle text found, keeping previous subtitle');
      } else {
        log('No subtitle text found');
      }
      return false;
    }
  }
  
  // Skip if it's the same as last time
  if (subtitleText === lastSubtitleText) {
    return false;
  }
  
  // Update last text
  lastSubtitleText = subtitleText;
  
  // Send subtitle to our React app
  if (chrome?.runtime?.sendMessage) {
    chrome.runtime.sendMessage({
      type: 'SUBTITLE_TEXT',
      text: subtitleText
    });
  }
  
  // Convert opacity percentage to hex
  const opacityHex = Math.round(style.backgroundOpacity * 2.55)
    .toString(16)
    .padStart(2, '0');
  
  // Update container content with better styling
  customSubtitlesContainer.innerHTML = `
    <div style="
      display: inline-block;
      color: ${style.color};
      background-color: ${style.backgroundColor}${opacityHex};
      font-size: ${style.fontSize}px;
      padding: 4px 8px;
      border-radius: 4px;
      text-shadow: 0px 1px 2px rgba(0,0,0,0.5);
      font-family: 'YouTube Noto', Roboto, Arial, sans-serif;
      font-weight: 500;
      line-height: 1.4;
      white-space: pre-line;
      text-align: center;
      transform-origin: center bottom;
      animation: subtitleFadeIn 0.3s ease-out;
    ">
      ${subtitleText}
    </div>
  `;
  
  // Add animation styles if not already present
  if (!document.getElementById('subtitle-animations')) {
    const style = document.createElement('style');
    style.id = 'subtitle-animations';
    style.textContent = `
      @keyframes subtitleFadeIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  log('Updated custom subtitles with text:', subtitleText);
  
  // Make sure original subtitles are hidden
  hideOriginalSubtitles();
  
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
    const video = document.querySelector('video');
    const isVideoPlaying = video && !video.paused && !video.ended;
    
    // Base position adjustment
    let bottomPosition = 60;
    
    // Adjust for player state
    if (fullscreen) {
      bottomPosition = controlsShowing ? 120 : 80;
    } else if (theaterMode) {
      bottomPosition = controlsShowing ? 90 : 70;
    } else {
      bottomPosition = controlsShowing ? 80 : 60;
    }
    
    // Apply the position
    customSubtitlesContainer.style.bottom = `${bottomPosition}px`;
    
    log('Updated subtitle position. Bottom:', bottomPosition);
  } catch (e) {
    log('Error updating subtitle position:', e);
  }
}

// A direct way to test if our overlay works - will show a test message
function showTestSubtitle() {
  const testMessage = "This is a test subtitle from the extension - " + new Date().toLocaleTimeString();
  log('Showing test subtitle:', testMessage);
  
  updateCustomSubtitles(testMessage, {
    color: "#ffff00", // Yellow text for visibility
    backgroundColor: "#000000",
    backgroundOpacity: 80,
    fontSize: 28,
    highlightColor: "#ffffff"
  });
}

// Check if video is ready and has subtitles enabled
function checkIfSubtitlesEnabled() {
  // Check for the presence of the CC button in an "on" state
  const ccButton = document.querySelector('.ytp-subtitles-button');
  if (ccButton) {
    const isEnabled = ccButton.getAttribute('aria-pressed') === 'true';
    log('CC button found, subtitles enabled:', isEnabled);
    return isEnabled;
  }
  
  // Alternative check: see if any caption elements exist
  const captionElements = document.querySelector('.ytp-caption-segment');
  const isEnabled = captionElements !== null;
  log('Subtitle elements found:', isEnabled);
  return isEnabled;
}

// Process video element and set up subtitle display
function processVideo() {
  const video = document.querySelector('video');
  if (!video) {
    log('No video element found');
    return;
  }

  log('Video element found, checking for subtitles');
  
  // Always proceed with setup even if subtitles don't seem enabled yet
  log('Setting up custom overlay and observers');
  setupSubtitleObserver();
  createCustomSubtitlesContainer();
  hideOriginalSubtitles();
  
  // Start position update interval
  startPositionUpdateInterval();
  
  // Show a test subtitle immediately
  showTestSubtitle();
  
  // And another one after 2 seconds to make sure it's visible
  setTimeout(showTestSubtitle, 2000);
}

// Check frequently if video state changed (play/pause/etc)
function startVideoCheck() {
  if (videoCheckInterval) {
    clearInterval(videoCheckInterval);
  }

  videoCheckInterval = setInterval(() => {
    const video = document.querySelector('video');
    if (video) {
      if (video.paused) {
        log('Video is paused');
      } else if (video.ended) {
        log('Video has ended');
      } else {
        // Check for subtitle text when video is playing
        const subtitleText = getSubtitleText();
        if (subtitleText) {
          updateCustomSubtitles(subtitleText);
        } else {
          // If no natural subtitles found, show a test one occasionally
          if (Math.random() < 0.1) { // 10% chance each check
            showTestSubtitle();
          }
        }
      }
    }
    
    // Also update subtitle position
    updateSubtitlePosition();
  }, 1000);
}

// Start interval to update subtitle position
function startPositionUpdateInterval() {
  if (positionInterval) {
    clearInterval(positionInterval);
  }
  
  // Update position more frequently to catch changes in player state
  positionInterval = setInterval(updateSubtitlePosition, 200);
  log('Started position update interval');
}

// Set up mutation observer to detect when subtitles appear
function setupSubtitleObserver() {
  // Disconnect existing observer if any
  if (subtitleObserver) {
    subtitleObserver.disconnect();
  }
  
  // Define subtitle container selectors (where subtitles appear)
  const subtitleContainerSelectors = [
    '.ytp-caption-window-container',
    '.caption-window',
    '.ytp-caption-window',
    '.captions-text-track'
  ];
  
  // Try to find a subtitle container to observe
  let subtitleContainer = null;
  for (const selector of subtitleContainerSelectors) {
    subtitleContainer = document.querySelector(selector);
    if (subtitleContainer) {
      log(`Found subtitle container with selector: ${selector}`);
      break;
    }
  }
  
  // If no specific container found, observe the video player
  if (!subtitleContainer) {
    subtitleContainer = document.querySelector('.html5-video-player') || document.body;
    log('No specific subtitle container found, observing:', 
      subtitleContainer === document.body ? 'document body' : 'video player');
  }
  
  // Create new observer
  subtitleObserver = new MutationObserver((mutations) => {
    let subtitleFound = false;
    
    for (const mutation of mutations) {
      // Only process a few specific mutations
      if (mutation.type === 'childList' || mutation.type === 'characterData') {
        const subtitleText = getSubtitleText();
        if (subtitleText) {
          subtitleFound = true;
          updateCustomSubtitles(subtitleText);
          break;
        }
      }
    }
    
    if (subtitleFound) {
      log('Detected subtitle change through MutationObserver');
    }
  });
  
  // Start observing with appropriate options
  subtitleObserver.observe(subtitleContainer, {
    childList: true,
    subtree: true,
    characterData: true
  });
  
  log('Set up subtitle mutation observer on container');
}

// Clean up everything
function cleanup() {
  if (subtitleObserver) {
    subtitleObserver.disconnect();
    subtitleObserver = null;
  }
  
  if (videoCheckInterval) {
    clearInterval(videoCheckInterval);
    videoCheckInterval = null;
  }
  
  if (positionInterval) {
    clearInterval(positionInterval);
    positionInterval = null;
  }
  
  if (customSubtitlesContainer) {
    customSubtitlesContainer.remove();
    customSubtitlesContainer = null;
  }
  
  // Remove the style tag for hiding original subtitles
  const styleTag = document.getElementById('youtube-subtitle-customizer-styles');
  if (styleTag) {
    styleTag.remove();
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
  
  // Force immediate check for subtitles
  setTimeout(async () => {
    log('Checking for subtitles after force refresh');
    processVideo();
    const subtitleText = getSubtitleText();
    if (subtitleText) {
      const style = await loadStyles();
      updateCustomSubtitles(subtitleText, style);
      log('Found subtitles after force refresh:', subtitleText);
    } else {
      log('No subtitles found after force refresh');
      // Show a test subtitle anyway
      showTestSubtitle();
    }
  }, 500);
}

// Initialize the extension
function initialize() {
  log('Initializing YouTube Subtitle Customizer');
  
  // Get current video ID
  currentVideoId = getYouTubeVideoId();
  log('Current video ID:', currentVideoId || 'No video ID found (might be homepage)');
  
  // Process video if we're on a video page
  if (currentVideoId) {
    setTimeout(() => {
      log('Processing video after short delay');
      processVideo();
      startVideoCheck();
    }, 1500); // Give YouTube a moment to set up the player
  } else {
    log('Not on a video page, waiting for navigation');
  }
  
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
    setTimeout(initialize, 1500);
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

// Initial check when YouTube's page has fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initialize();
    urlObserver.observe(document, { subtree: true, childList: true });
  });
} else {
  initialize();
  urlObserver.observe(document, { subtree: true, childList: true });
}

// Add a global debug function that users can call from the console
window.YTSubDebug = {
  showTest: showTestSubtitle,
  forceRefresh: forceRefresh,
  getInfo: () => debugInfo.join('\n'),
  toggleDebug: () => {
    debugMode = !debugMode;
    log('Debug mode toggled to:', debugMode);
    return debugMode;
  }
};

// Log that we've loaded
log('Content script loaded successfully');
