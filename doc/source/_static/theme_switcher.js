document.addEventListener('DOMContentLoaded', () => {
    // Define a set of random color palettes for the 'random' theme
    const randomPalettes = [
        // Palette 1
        {
            '--bg-color': '#f0e6f2',
            '--text-color': '#4a235a',
            '--link-color': '#8e44ad',
            '--caption-color': '#c0392b',
            '--header-color': '#4a235a',
            '--body-bg-color': '#f0e6f2',
            '--body-text-color': '#4a235a'
        },
        // Palette 2
        {
            '--bg-color': '#e8f8f5',
            '--text-color': '#117a65',
            '--link-color': '#1abc9c',
            '--caption-color': '#d35400',
            '--header-color': '#117a65',
            '--body-bg-color': '#e8f8f5',
            '--body-text-color': '#117a65'
        },
        // Palette 3
        {
            '--bg-color': '#fef9e7',
            '--text-color': '#b07e0c',
            '--link-color': '#f39c12',
            '--caption-color': '#2c3e50',
            '--header-color': '#b07e0c',
            '--body-bg-color': '#fef9e7',
            '--body-text-color': '#b07e0c'
        },
        // Palette 4
        {
            '--bg-color': '#e3f2fd',
            '--text-color': '#1565c0',
            '--link-color': '#2196f3',
            '--caption-color': '#d32f2f',
            '--header-color': '#1565c0',
            '--body-bg-color': '#e3f2fd',
            '--body-text-color': '#1565c0'
        },
        // Palette 5
        {
            '--bg-color': '#fce4ec',
            '--text-color': '#c2185b',
            '--link-color': '#e91e63',
            '--caption-color': '#00796b',
            '--header-color': '#c2185b',
            '--body-bg-color': '#fce4ec',
            '--body-text-color': '#c2185b'
        },
        // Palette 6
        {
            '--bg-color': '#f1f8e9',
            '--text-color': '#558b2f',
            '--link-color': '#8bc34a',
            '--caption-color': '#fbc02d',
            '--header-color': '#558b2f',
            '--body-bg-color': '#f1f8e9',
            '--body-text-color': '#558b2f'
        },
        // Palette 7
        {
            '--bg-color': '#e0f7fa',
            '--text-color': '#00838f',
            '--link-color': '#00bcd4',
            '--caption-color': '#e65100',
            '--header-color': '#00838f',
            '--body-bg-color': '#e0f7fa',
            '--body-text-color': '#00838f'
        },
        // Palette 8
        {
            '--bg-color': '#fff3e0',
            '--text-color': '#ef6c00',
            '--link-color': '#ff9800',
            '--caption-color': '#607d8b',
            '--header-color': '#ef6c00',
            '--body-bg-color': '#fff3e0',
            '--body-text-color': '#ef6c00'
        },
        // Palette 9
        {
            '--bg-color': '#e8eaf6',
            '--text-color': '#303f9f',
            '--link-color': '#5c6bc0',
            '--caption-color': '#cddc39',
            '--header-color': '#303f9f',
            '--body-bg-color': '#e8eaf6',
            '--body-text-color': '#303f9f'
        },
        // Palette 10
        {
            '--bg-color': '#eceff1',
            '--text-color': '#37474f',
            '--link-color': '#607d8b',
            '--caption-color': '#f44336',
            '--header-color': '#37474f',
            '--body-bg-color': '#eceff1',
            '--body-text-color': '#37474f'
        }
    ];

    // Select the theme toggle button and body
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;

    // Easter egg variables
    let matrixSequence = '';
    const matrixTrigger = 'matrix';
    let exitSequence = '';
    const exitTrigger = 'exit';
    let matrixIntervalId = null;

    if (themeToggle) {
        const savedTheme = localStorage.getItem('theme');
        const savedRandomIndex = localStorage.getItem('randomIndex');
        let currentTheme = 'light';

        // Initialize theme based on local storage or system preference
        if (savedTheme) {
            currentTheme = savedTheme;
            if (currentTheme === 'random' && savedRandomIndex !== null) {
                applyRandomTheme(body, randomPalettes, savedRandomIndex);
            } else {
                body.classList.add(currentTheme);
            }
        } else {
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                currentTheme = 'dark';
                body.classList.add(currentTheme);
            } else {
                body.classList.add(currentTheme);
            }
        }

        // Initial toggle button text update
        updateToggleText(themeToggle, currentTheme);

        // Add click event listener to the theme toggle button
        themeToggle.addEventListener('click', () => {
            if (currentTheme === 'dark') {
                currentTheme = 'light';
                body.classList.remove('dark');
                body.classList.add('light');
                removeRandomTheme(body);
                localStorage.removeItem('randomIndex');
            } else if (currentTheme === 'light') {
                currentTheme = 'random';
                body.classList.remove('light');
                const newRandomIndex = Math.floor(Math.random() * randomPalettes.length);
                applyRandomTheme(body, randomPalettes, newRandomIndex);
                localStorage.setItem('randomIndex', newRandomIndex);
            } else { // It's 'random'
                currentTheme = 'dark';
                body.classList.remove('random');
                body.classList.add('dark');
                removeRandomTheme(body);
                localStorage.removeItem('randomIndex');
            }
            localStorage.setItem('theme', currentTheme);
            updateToggleText(themeToggle, currentTheme);
        });
    }

    // Add keydown event listener for the Easter eggs
    document.addEventListener('keydown', (event) => {
        const key = event.key.toLowerCase();

        // Logic for the "matrix" egg
        matrixSequence += key;
        if (matrixSequence.length > matrixTrigger.length) {
            matrixSequence = matrixSequence.slice(-matrixTrigger.length);
        }
        if (matrixSequence === matrixTrigger) {
            activateMatrixAnimation();
        }

        // Logic for the "exit" egg
        exitSequence += key;
        if (exitSequence.length > exitTrigger.length) {
            exitSequence = exitSequence.slice(-exitTrigger.length);
        }
        if (exitSequence === exitTrigger) {
            deactivateMatrixAnimation();
        }
    });

    // --- Helper Functions ---

    // Helper function to update button text
    function updateToggleText(button, theme) {
        if (theme === 'dark') {
            button.textContent = '☀️';
        } else if (theme === 'light') {
            button.textContent = '🎨';
        } else {
            button.textContent = '🌙';
        }
    }

    // Helper function to apply random theme colors based on index
    function applyRandomTheme(body, palettes, index) {
        body.classList.add('random');
        const palette = palettes[index];
        for (const [property, value] of Object.entries(palette)) {
            body.style.setProperty(property, value);
        }
    }

    // Helper function to remove random theme styles
    function removeRandomTheme(body) {
        body.classList.remove('random');
        const randomPalette = randomPalettes[0];
        for (const property of Object.keys(randomPalette)) {
            body.style.removeProperty(property);
        }
    }

    // --- Easter Egg Functions ---

    function activateMatrixAnimation() {
        if (document.getElementById('matrix-canvas')) {
            return;
        }

        const canvas = document.createElement('canvas');
        canvas.id = 'matrix-canvas';
        document.body.appendChild(canvas);

        const context = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()_+-={}[]:";\'<>,.?/~`';
        const fontSize = 16;
        const columns = canvas.width / fontSize;
        const drops = Array(Math.floor(columns)).fill(1);

        function draw() {
            context.fillStyle = 'rgba(0, 0, 0, 0.05)';
            context.fillRect(0, 0, canvas.width, canvas.height);

            context.fillStyle = '#0F0';
            context.font = `${fontSize}px monospace`;

            for (let i = 0; i < drops.length; i++) {
                const text = characters.charAt(Math.floor(Math.random() * characters.length));
                context.fillText(text, i * fontSize, drops[i] * fontSize);

                if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                drops[i]++;
            }
        }

        matrixIntervalId = setInterval(draw, 33);

        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.zIndex = '9999';
        canvas.style.pointerEvents = 'none';
    }

    function deactivateMatrixAnimation() {
        const canvas = document.getElementById('matrix-canvas');
        if (canvas) {
            clearInterval(matrixIntervalId);
            canvas.remove();
        }
    }
});

function setRandomBackground() {
    // 2. Generate a random index based on the array length
    var randomIndex = Math.floor(Math.random() * 34);

    // 3. Get the randomly selected image URL
    var selectedImage = `_static/images/backgrounds/${randomIndex}.jpg`;

    // 4. Apply the background image to the <body> element
    document.body.style.backgroundImage = 'url("' + selectedImage + '")';

    // (Optional) Add CSS properties for better display
    document.body.style.backgroundRepeat = 'no-repeat';
    document.body.style.backgroundSize = 'cover'; // Ensure it covers the whole screen
    document.body.style.backgroundPosition = 'center center';
}

// Execute the function when the page loads
window.onload = setRandomBackground;
