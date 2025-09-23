document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) { // Add this check to prevent errors if the element isn't found
        const body = document.body;

        // Check for a saved theme preference in local storage
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            body.classList.add(savedTheme);
        } else {
            // Fallback to the user's system preference
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                body.classList.add('dark');
            } else {
                body.classList.add('light');
            }
        }

        // Set the initial state of the toggle button
        themeToggle.textContent = body.classList.contains('dark') ? '☀️' : '🌙';

        // Add click event listener to the toggle button
        themeToggle.addEventListener('click', () => {
            if (body.classList.contains('dark')) {
                body.classList.remove('dark');
                body.classList.add('light');
                localStorage.setItem('theme', 'light');
                themeToggle.textContent = '🌙';
            } else {
                body.classList.remove('light');
                body.classList.add('dark');
                localStorage.setItem('theme', 'dark');
                themeToggle.textContent = '☀️';
            }
        });
    }
});