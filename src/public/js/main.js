// Mobile Menu Toggle
document.addEventListener('DOMContentLoaded', function () {
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('navMenu');

    if (hamburger) {
        hamburger.addEventListener('click', function () {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });

        // Close menu when clicking on a link
        const navLinks = navMenu.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', function () {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
    }

    // Close menu when clicking outside
    document.addEventListener('click', function (event) {
        const isClickInsideNav = navMenu && navMenu.contains(event.target);
        const isClickInsideHamburger = hamburger && hamburger.contains(event.target);

        if (!isClickInsideNav && !isClickInsideHamburger && navMenu && hamburger) {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
        }
    });

    // Load counter theme on page load
    loadCounterTheme();

    console.log('Purity Rewire Portal - Ready!');
});

// Load counter theme from server
function loadCounterTheme() {
    fetch('/api/counter-theme')
        .then(res => res.ok ? res.json() : Promise.reject())
        .then(data => {
            applyCounterTheme(data.counterTheme);
            localStorage.setItem('counterTheme', data.counterTheme);
        })
        .catch(() => {
            // Fallback to localStorage
            const savedTheme = localStorage.getItem('counterTheme') || 'ancient';
            applyCounterTheme(savedTheme);
        });
}

// Apply counter theme
function applyCounterTheme(theme) {
    const rewireClock = document.getElementById('rewiring-clock');
    if (rewireClock) {
        rewireClock.className = rewireClock.className.replace(/counter-theme-\w+/g, '');
        rewireClock.classList.add(`counter-theme-${theme}`);
    }
}

// Toggle counter theme
function toggleCounterTheme() {
    const themes = ['ancient', 'modern', 'neon', 'minimal', 'ocean', 'forest', 'fire'];
    const currentTheme = localStorage.getItem('counterTheme') || 'ancient';
    const currentIndex = themes.indexOf(currentTheme);
    const newTheme = themes[(currentIndex + 1) % themes.length];

    applyCounterTheme(newTheme);
    localStorage.setItem('counterTheme', newTheme);

    // Save to database
    fetch('/api/counter-theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: newTheme })
    }).catch(err => console.log('Could not save counter theme:', err));
}

