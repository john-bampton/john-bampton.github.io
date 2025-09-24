document.addEventListener('DOMContentLoaded', () => {
    // Define a set of random color palettes
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
        }
    ];

    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        const body = document.body;
        const savedTheme = localStorage.getItem('theme');
        let currentTheme = 'light'; // Default

        if (savedTheme) {
            currentTheme = savedTheme;
            if (currentTheme === 'random') {
                applyRandomTheme(body, randomPalettes);
            } else {
                body.classList.add(currentTheme);
            }
        } else {
            // Fallback to the user's system preference
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
            } else if (currentTheme === 'light') {
                currentTheme = 'random';
                body.classList.remove('light');
                applyRandomTheme(body, randomPalettes);
            } else { // It's 'random'
                currentTheme = 'dark';
                body.classList.remove('random');
                body.classList.add('dark');
                removeRandomTheme(body);
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
            button.textContent = '🎨'; // Paint palette for random
        } else {
            button.textContent = '🌙';
        }
    }

    // Helper function to apply random theme colors
    function applyRandomTheme(body, palettes) {
        body.classList.add('random');
        const randomPalette = palettes[Math.floor(Math.random() * palettes.length)];
        for (const [property, value] of Object.entries(randomPalette)) {
            body.style.setProperty(property, value);
        }
    }

    // Helper function to remove random theme styles
    function removeRandomTheme(body) {
        body.classList.remove('random');
        const randomPalette = randomPalettes[0]; // Use any palette to get property keys
        for (const property of Object.keys(randomPalette)) {
            body.style.removeProperty(property);
        }
    }
});
