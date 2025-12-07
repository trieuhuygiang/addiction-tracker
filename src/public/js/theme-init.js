// Theme initialization - must run before body renders to prevent flash
(function () {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
})();
