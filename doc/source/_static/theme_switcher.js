document.addEventListener('DOMContentLoaded', () => {
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

    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        const body = document.body;
        const savedTheme = localStorage.getItem('theme');
        const savedRandomIndex = localStorage.getItem('randomIndex');
        let currentTheme = 'light';

        if (savedTheme) {
            currentTheme = savedTheme;
            if (currentTheme === 'random' && savedRandomIndex !== null) {
                // Use the saved random palette index
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

        updateToggleText(themeToggle, currentTheme);

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
});