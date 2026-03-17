/* frontend/js/main.js */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Ripple Effect for Buttons
    createRippleEffect();

    // 2. Active state for sidebar navigation
    setActiveNavLink();
});

/**
 * Adds a ripple effect to elements with the .btn class
 */
function createRippleEffect() {
    const buttons = document.querySelectorAll('.btn');
    
    buttons.forEach(button => {
        // Ensure buttons have relative positioning and hidden overflow via CSS, 
        // but we can enforce it here too just in case.
        button.classList.add('ripple-container');

        button.addEventListener('click', function(e) {
            const x = e.clientX - e.target.getBoundingClientRect().left;
            const y = e.clientY - e.target.getBoundingClientRect().top;
            
            const ripple = document.createElement('span');
            ripple.classList.add('ripple');
            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;
            
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
}

/**
 * Highlights the current active navigation link based on the URL
 */
function setActiveNavLink() {
    const navLinks = document.querySelectorAll('.sidebar-nav a');
    const currentPath = window.location.pathname.split('/').pop();
    
    navLinks.forEach(link => {
        const linkPath = link.getAttribute('href');
        // If current path matches link href, or if we are on root/index and link is dashboard
        if (linkPath === currentPath || (currentPath === '' && linkPath === 'dashboard.html')) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

/**
 * Utility to toggle mobile sidebar
 */
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    if (sidebar) sidebar.classList.toggle('active');
    if (overlay) overlay.classList.toggle('active');
}
