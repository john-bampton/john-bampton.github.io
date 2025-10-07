// =======================================================
// 1. UTILITY AND HELPER FUNCTIONS
// =======================================================

const IMAGE_PATH_PREFIX = '_static/images/backgrounds/';
const MAX_IMAGES = 62; // Images are 0.jpg through 61.jpg (62 total)

/**
 * Returns a random integer between 0 (inclusive) and 61 (inclusive).
 * @returns {number} - A random image index from the available range.
 */
function getRandomImageIndex() {
    return Math.floor(Math.random() * MAX_IMAGES);
}

/**
 * Helper function to construct the correct image file path.
 * @param {number} index - The image number (0 to 61).
 * @returns {string} The relative image path (e.g., '_static/images/backgrounds/0.jpg').
 */
function getImageFilename(index) {
    return `${IMAGE_PATH_PREFIX}${index}.jpg`;
}

/**
 * Generates a random RGB color string with a specified opacity.
 * @param {number} opacity - The alpha value (0 to 1).
 * @returns {string} - An rgba color string.
 */
function getRandomRGBAColor(opacity) {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Sets random CSS variables for the Random theme's colors.
 */
function setRandomThemeColors() {
    // Determines if text should be light or dark based on a coin flip
    const isDarkBackground = Math.random() < 0.5;

    // Use high opacity (0.95) for content backgrounds
    const contentBg = getRandomRGBAColor(0.95);
    const sidebarBg = getRandomRGBAColor(0.95);

    // Set text color for contrast
    const textColor = isDarkBackground ? '#f0f0f0' : '#333333';

    document.documentElement.style.setProperty('--random-content-bg', contentBg);
    document.documentElement.style.setProperty('--random-sidebar-bg', sidebarBg);
    document.documentElement.style.setProperty('--random-text-color', textColor);
}

/**
 * Removes random CSS variables.
 */
function removeRandomThemeColors() {
    document.documentElement.style.removeProperty('--random-content-bg');
    document.documentElement.style.removeProperty('--random-sidebar-bg');
    document.documentElement.style.removeProperty('--random-text-color');
}

/**
 * Simplifies the text content of image selection links (buttons).
 * Changes text from "Image 0" to "0".
 */
function simplifyImageLinkText() {
    // Select only the image links, ignoring the top control buttons
    const links = document.querySelectorAll('#image-links-container a[data-imagepath]');
    const regex = /Image\s*(\d+)/i;

    links.forEach(link => {
        const originalText = link.textContent.trim();
        const match = originalText.match(regex);

        if (match) {
            const imageNumber = match[1];
            link.textContent = imageNumber;
        }
    });
}

// =======================================================
// 2. THEME AND BACKGROUND LOGIC
// =======================================================

/**
 * Applies the selected theme and background image, updating both UI and local storage.
 * This is the primary state setter for the application.
 * @param {string} themeName - 'light', 'dark', or 'random'.
 * @param {string | null} imagePath - The full path to the background image.
 */
function applyTheme(themeName, imagePath) {
    const body = document.body;
    const layoutWrapper = document.getElementById('main-layout-wrapper');
    const imageLinks = document.querySelectorAll('#image-links-container a');
    const themeCycleBtn = document.getElementById('theme-cycle-btn');

    // 1. Update Theme Class and Colors
    body.className = '';
    body.classList.add(themeName);

    if (themeName === 'random') {
        setRandomThemeColors();
    } else {
        removeRandomThemeColors();
    }

    // 2. Set Background Image
    if (imagePath) {
        // Use 'url()' wrapper when setting the style property
        layoutWrapper.style.backgroundImage = `url('${imagePath}')`;
        layoutWrapper.setAttribute('data-current-image', imagePath);
        localStorage.setItem('currentBackground', imagePath);
    } else {
        layoutWrapper.style.backgroundImage = 'none';
        layoutWrapper.removeAttribute('data-current-image');
        localStorage.removeItem('currentBackground');
    }

    // 3. Update Theme Button Text
    if (themeCycleBtn) {
        if (themeName === 'light') {
            themeCycleBtn.textContent = 'Theme: Light ☀️';
        } else if (themeName === 'dark') {
            themeCycleBtn.textContent = 'Theme: Dark 🌙';
        } else if (themeName === 'random') {
             themeCycleBtn.textContent = 'Theme: Random 🎨';
        }
    }

    // 4. Update Active Link Styling
    imageLinks.forEach(a => {
        a.classList.remove('active-bg');
        // The imagePath saved in localStorage does *not* include url() wrapper, matching the dataset
        if (imagePath && a.dataset.imagepath === imagePath) {
             a.classList.add('active-bg');
        }
    });

    // 5. Save state
    localStorage.setItem('currentTheme', themeName);
}

/**
 * Updates only the background image and active link, preserving the current theme and gallery state.
 * Used exclusively when in Gallery Mode or when switching images without forcing a theme reset.
 * @param {string} imagePath - The full path to the background image.
 */
function applyImageChangeOnly(imagePath) {
    const layoutWrapper = document.getElementById('main-layout-wrapper');
    const imageLinks = document.querySelectorAll('#image-links-container a');

    // 1. Set Background Image and save it
    layoutWrapper.style.backgroundImage = `url('${imagePath}')`;
    layoutWrapper.setAttribute('data-current-image', imagePath);
    localStorage.setItem('currentBackground', imagePath);

    // 2. Update Active Link Styling
    imageLinks.forEach(a => {
        a.classList.remove('active-bg');
        if (imagePath && a.dataset.imagepath === imagePath) {
             a.classList.add('active-bg');
        }
    });
}

/**
 * Cycles through the three themes: Light, Dark, Random.
 */
function cycleTheme() {
    const currentTheme = localStorage.getItem('currentTheme') || 'light';
    const currentBackground = localStorage.getItem('currentBackground');
    let newTheme;
    let newImagePath = currentBackground;

    // Fix: If in Gallery Mode, turning the theme toggle MUST turn Gallery Mode OFF.
    const body = document.body;
    const galleryBtn = document.getElementById('gallery-toggle-btn');
    if (body.classList.contains('background-visible')) {
        body.classList.remove('background-visible');
        localStorage.setItem('galleryMode', 'off');
        if (galleryBtn) galleryBtn.textContent = 'Gallery: Off 📜';
    }

    // Theme cycling logic
    if (currentTheme === 'light') {
        newTheme = 'dark';
    } else if (currentTheme === 'dark') {
        newTheme = 'random';
        // Random theme always gets a new random background
        newImagePath = getImageFilename(getRandomImageIndex());
    } else { // Current is 'random'
        newTheme = 'light';
    }

    applyTheme(newTheme, newImagePath);
}


/**
 * Toggles "Gallery Mode" which hides content and only shows the background.
 */
function toggleGalleryMode() {
    const body = document.body;
    const galleryBtn = document.getElementById('gallery-toggle-btn');
    const isVisible = !body.classList.contains('background-visible');

    if (isVisible) {
        body.classList.add('background-visible');
        if (galleryBtn) galleryBtn.textContent = 'Gallery: On 🖼️';
    } else {
        body.classList.remove('background-visible');
        if (galleryBtn) galleryBtn.textContent = 'Gallery: Off 📜';
    }

    localStorage.setItem('galleryMode', isVisible ? 'on' : 'off');
}

/**
 * Initializes the control buttons (theme/gallery toggles and image selection).
 * This dynamically builds the `#image-links-container` content.
 */
function initializeControls() {
    const container = document.getElementById('image-links-container');
    if (!container) return;

    // --- 1. Add Theme Cycle Button ---
    const themeCycleBtn = document.createElement('a');
    themeCycleBtn.id = 'theme-cycle-btn';
    themeCycleBtn.href = 'javascript:void(0)';
    themeCycleBtn.textContent = 'Theme: Initial'; // Updated in loadState
    themeCycleBtn.onclick = cycleTheme;
    container.appendChild(themeCycleBtn);

    // --- 2. Add Gallery Toggle Button ---
    const galleryToggleBtn = document.createElement('a');
    galleryToggleBtn.id = 'gallery-toggle-btn';
    galleryToggleBtn.href = 'javascript:void(0)';
    galleryToggleBtn.textContent = 'Gallery: Off 📜'; // Updated in loadState
    galleryToggleBtn.onclick = toggleGalleryMode;
    container.appendChild(galleryToggleBtn);

    // --- 3. Add Image Links (0 to 61) ---
    for (let i = 0; i < MAX_IMAGES; i++) {
        const link = document.createElement('a');

        const imagePath = getImageFilename(i);

        link.href = 'javascript:void(0)';
        link.textContent = `Image ${i}`;
        // The dataset key stores the image path *without* the url() wrapper
        link.dataset.imagepath = imagePath;

        link.onclick = (event) => {
            event.preventDefault();

            const currentTheme = localStorage.getItem('currentTheme') || 'light';
            const body = document.body;

            // If Gallery is ON, use the dedicated image changer function
            if (body.classList.contains('background-visible')) {
                applyImageChangeOnly(imagePath);
            } else {
                // If content is visible, maintain the current theme state
                // and apply the new image.
                applyTheme(currentTheme, imagePath);
            }
        };
        container.appendChild(link);
    }

    // --- 4. Simplify the link text (Changes "Image 0" to "0")
    simplifyImageLinkText();
}

/**
 * Loads the saved state from localStorage and applies it to the UI.
 */
function loadState() {
    const currentTheme = localStorage.getItem('currentTheme') || 'light';
    let initialImagePath = localStorage.getItem('currentBackground');
    const galleryMode = localStorage.getItem('galleryMode'); // 'on' or 'off'

    // --- 1. Determine Initial Image Path ---
    if (currentTheme === 'random') {
        // FIX IMPLEMENTED: Always randomize the image path if the theme is 'random',
        // regardless of the gallery mode state. This ensures a new background
        // and new random colors on every page reload for the 'random' theme.
        initialImagePath = getImageFilename(getRandomImageIndex());
    } else if (!initialImagePath) {
         // Default to the first image (0.jpg) if no background is saved
         initialImagePath = getImageFilename(0);
    }

    // Apply saved theme and the determined image path.
    // This handles theme class, color variables, and background image style.
    applyTheme(currentTheme, initialImagePath);

    // --- 2. Apply Gallery Mode ---
    // This must happen AFTER applyTheme, as it relies on the button being present.
    if (galleryMode === 'on') {
        const body = document.body;
        const galleryBtn = document.getElementById('gallery-toggle-btn');
        body.classList.add('background-visible');
        if (galleryBtn) galleryBtn.textContent = 'Gallery: On 🖼️';
    }
}

// =======================================================
// 3. INITIALIZATION
// =======================================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. Build the dynamic controls (buttons)
    initializeControls();

    // 2. Load the stored state (theme, image, gallery mode)
    loadState();
});