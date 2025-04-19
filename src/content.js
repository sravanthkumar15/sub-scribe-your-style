
// YouTube Subtitle Customizer - Content Script

// Configuration
const DEBUG = true; // Set to false in production
const SUBTITLE_CHECK_INTERVAL = 50; // ms (reduced for faster response)
const MAX_RETRIES = 50;
const POSITION_CHECK_INTERVAL = 250; // Check positioning more frequently

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
let currentVideoId = null;

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

// Extract YouTube video ID from URL
function getYouTubeVideoId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('v');
}

// Find YouTube subtitle container - expanded with multiple approaches
function findSubtitleContainer() {
  // The most common selectors YouTube uses
  const selectors = [
    '.ytp-caption-window-container',
    '.captions-text',
    '.caption-window',
    '.ytp-caption-segment'
  ];
  
  // Try multiple approaches
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    if (elements && elements.length > 0) {
      for (const element of elements) {
        if (element && element.textContent && element.textContent.trim() !== '') {
          log('Found subtitle container with selector:', selector, 'Text:', element.textContent);
          return element;
        }
      }
    }
  }
  
  // Alternative approach: look for any element containing caption text
  const allElements = document.querySelectorAll('*');
  for (const element of allElements) {
    if (element.classList && 
        (element.classList.contains('caption') || 
         element.classList.contains('subtitle') ||
         element.classList.toString().includes('caption') || 
         element.classList.toString().includes('subtitle'))) {
      if (element.textContent && element.textContent.trim() !== '') {
        log('Found subtitle element by class name search:', element.classList.toString(), 'Text:', element.textContent);
        return element;
      }
    }
  }
  
  return null;
}

// Check if a video is currently playing
function isVideoPlaying() {
  const video = document.querySelector('video');
  return video && !video.paused && !video.ended && video.readyState > 2;
}

// Create or update custom subtitle container
async function updateCustomSubtitles() {
  try {
    // Check if we're on a YouTube video page
    const videoId = getYouTubeVideoId();
    if (!videoId) {
      log('Not on a YouTube video page');
      return;
    }
    
    // Check if video ID changed (user navigated to a different video)
    if (currentVideoId !== videoId) {
      currentVideoId = videoId;
      // Reset everything when navigating to a new video
      resetCustomSubtitles();
    }
    
    const subtitleContainer = findSubtitleContainer();
    const videoContainer = document.querySelector('.html5-video-container') || document.querySelector('.html5-main-video');
    const video = document.querySelector('video');
    
    // Check if video is playing
    const playing = isVideoPlaying();
    if (!playing) {
      log('Video is not playing, skipping subtitle check');
      return;
    }
    
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
    
    // Skip if no text or video container
    if (!subtitleText) {
      log('No subtitle text found');
      return;
    }
    
    if (!videoContainer) {
      log('No video container found');
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
      
      // Add it to the video container for best positioning
      try {
        videoContainer.appendChild(customContainer);
        log('Created custom subtitle container in video container:', videoContainer);
      } catch (e) {
        // Fallback to document.body if videoContainer fails
        document.body.appendChild(customContainer);
        log('Error appending to video container, used body instead:', e);
      }
      
      // Start position checking interval
      if (!positionInterval) {
        positionInterval = setInterval(checkSubtitlePosition, POSITION_CHECK_INTERVAL);
      }
    }
    
    // Hide original subtitles
    hideOriginalSubtitles(subtitleContainer);
    
    // Convert opacity percentage to hex
    const opacityHex = Math.round(style.backgroundOpacity * 2.55)
      .toString(16)
      .padStart(2, '0');
      
    // Update subtitle content and styling
    try {
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
          box-shadow: 0px 2px 5px rgba(0,0,0,0.3);
        ">
          ${subtitleText}
        </div>
      `;
      
      log('Updated custom subtitles successfully');
    } catch (e) {
      log('Error updating custom subtitles:', e);
    }
  } catch (e) {
    log('Error in updateCustomSubtitles:', e);
  }
}

// Reset all subtitle customization
function resetCustomSubtitles() {
  log('Resetting subtitle customizations');
  if (customContainer) {
    customContainer.remove();
    customContainer = null;
  }
  retryCount = 0;
  lastSubtitleText = '';
  isOriginalSubtitleHidden = false;
}

// Hide original subtitles using multiple approaches
function hideOriginalSubtitles(subtitleContainer) {
  try {
    if (subtitleContainer) {
      // First, hide the specific container we found
      subtitleContainer.style.opacity = '0';
      subtitleContainer.style.visibility = 'hidden';
      subtitleContainer.style.display = 'none';
    }
    
    // Then try multiple approaches to hide all possible caption elements
    const selectors = [
      '.ytp-caption-window-container',
      '.caption-window',
      '.captions-text',
      '.ytp-caption-segment',
      '.ytp-caption-window',
      '[class*="caption"]',
      '[class*="subtitle"]'
    ];
    
    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        // Don't hide our custom container
        if (element.id !== 'youtube-subtitle-customizer') {
          element.style.opacity = '0';
          element.style.visibility = 'hidden';
        }
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
        }
        /* Don't hide our custom container */
        #youtube-subtitle-customizer {
          opacity: 1 !important;
          visibility: visible !important;
          display: flex !important;
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
  
  try {
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
    customContainer.style.visibility = 'visible';
    customContainer.style.opacity = '1';
    
    // Force a repaint to ensure visibility
    customContainer.style.transform = 'translateZ(0)';
    
    log('Updated subtitle position. Fullscreen:', isFullscreen, 'Theater:', isTheaterMode);
  } catch (e) {
    log('Error checking subtitle position:', e);
  }
}

// Initialize extension
function initialize() {
  log('Initializing YouTube Subtitle Customizer');
  
  // Reset state
  resetCustomSubtitles();
  
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
    } else if (request.type === 'FORCE_REFRESH') {
      // Added a force refresh command
      resetCustomSubtitles();
      setTimeout(updateCustomSubtitles, 100);
      sendResponse({ success: true });
    }
  });
  
  log('Message listener set up successfully');
  log('Extension is active');
}

// Handle page navigation (for YouTube's SPA behavior)
const handleNavigation = () => {
  log('URL changed, resetting subtitle customizer');
  resetCustomSubtitles();
  
  // Clear intervals
  clearInterval(checkInterval);
  clearInterval(positionInterval);
  
  // Reset variables
  retryCount = 0;
  isOriginalSubtitleHidden = false;
  lastSubtitleText = '';
  currentVideoId = getYouTubeVideoId();
  
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

// Watch for fullscreen changes
document.addEventListener('fullscreenchange', () => {
  log('Fullscreen state changed');
  checkSubtitlePosition();
});

// Observe DOM for subtitle related changes
const subtitleObserver = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.type === 'childList' || mutation.type === 'characterData') {
      // Force check for new subtitles when DOM changes
      updateCustomSubtitles();
      break;
    }
  }
});

// Start observing the document for subtitle-related changes
function startSubtitleObserver() {
  subtitleObserver.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
}

// Run the initializer when the page is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initialize();
    observer.observe(document, { subtree: true, childList: true });
    startSubtitleObserver();
  });
} else {
  initialize();
  observer.observe(document, { subtree: true, childList: true });
  startSubtitleObserver();
}

// Initial check
setTimeout(updateCustomSubtitles, 500);
