/* Shared navigation for example pages */

const NAV_CONFIG = {
    major: [
        { href: 'index.html', label: 'Home' },
        {
            label: 'Bar Charts',
            dropdown: [
                { href: 'barcharts.html', label: 'Basics' },
                { href: 'bar-groups.html', label: 'Groups & Stacks' },
                { href: 'bar-sizing.html', label: 'Sizing & Spacing' },
                { href: 'bar-negatives.html', label: 'Negative Values' },
            ]
        },
        { href: 'linecharts.html', label: 'Line Charts' },
        { href: 'bubblecharts.html', label: 'Bubble Charts' },
        {
            label: 'Pie Charts',
            dropdown: [
                { href: 'piecharts.html', label: 'Basics' },
                { href: 'donuts.html', label: 'Donuts' },
            ]
        },
        { href: 'funnelcharts.html', label: 'Funnel Charts' },
        { href: 'stagecharts.html', label: 'Stage Charts' },
    ],
    minor: [
        { href: 'axes.html', label: 'Axes' },
        { href: 'data-labels.html', label: 'Data Labels' },
        {
            label: 'Chart Colors',
            dropdown: [
                { href: 'palettes.html', label: 'Palettes' },
                { href: 'swatches.html', label: 'Swatches' },
                { href: 'colors.html', label: 'Element Colors' },
                { href: 'patterns.html', label: 'Patterns' },
            ]
        },
        {
            label: 'Text & Annotations',
            dropdown: [
                { href: 'titles.html', label: 'Titles' },
                { href: 'legends.html', label: 'Legends' },
                { href: 'typography.html', label: 'Typography' },
                { href: 'formatting.html', label: 'Formatting' },
            ]
        },
        { href: 'borders-and-padding.html', label: 'Borders & Padding' },
        { href: 'combo-charts.html', label: 'Combo Charts' },
        { href: 'interactive.html', label: 'Interactive' },
        { href: 'popups.html', label: 'Popups' },
        { href: 'logging.html', label: 'Logging' },
        { href: 'htmx-integration.html', label: 'htmx' },
        { href: 'accessibility.html', label: 'Accessibility' },
    ]
};

function generateNav() {
    const nav = document.querySelector('nav');
    if (!nav) return;

    // Detect if we're in root (index.html) or examples/ directory
    const path = window.location.pathname;
    const isRoot = path.endsWith('index.html') || path.endsWith('/') || path === '';
    const currentFile = path.split('/').pop() || 'index.html';

    // Generate href with correct relative path
    const getHref = (href) => {
        if (href === 'index.html') {
            return isRoot ? 'index.html' : '../index.html';
        }
        return isRoot ? `examples/${href}` : href;
    };

    // Check if link is current page
    const isCurrent = (href) => {
        if (href === 'index.html' && isRoot) return true;
        if (href === currentFile) return true;
        return false;
    };

    // Generate link HTML
    const linkHtml = (item) => {
        const href = getHref(item.href);
        const current = isCurrent(item.href) ? ' class="current"' : '';
        return `<a href="${href}"${current}>${item.label}</a>`;
    };

    // Generate dropdown HTML
    const dropdownHtml = (item) => {
        const links = item.dropdown.map(sub => {
            const href = getHref(sub.href);
            const current = isCurrent(sub.href) ? ' class="current"' : '';
            return `<a href="${href}"${current}>${sub.label}</a>`;
        }).join('\n                    ');

        return `<div class="nav-dropdown">
                <a href="#" class="nav-dropdown-toggle">${item.label} <span class="arrow">&#9662;</span></a>
                <div class="nav-dropdown-menu">
                    ${links}
                </div>
            </div>`;
    };

    // Build major nav (supports dropdowns)
    const majorHtml = NAV_CONFIG.major.map(item => {
        return item.dropdown ? dropdownHtml(item) : linkHtml(item);
    }).join('\n            ');

    // Build minor nav
    const minorHtml = NAV_CONFIG.minor.map(item => {
        return item.dropdown ? dropdownHtml(item) : linkHtml(item);
    }).join('\n            ');

    nav.innerHTML = `
        <div class="nav-major">
            ${majorHtml}
        </div>
        <div class="nav-minor">
            ${minorHtml}
        </div>
    `;
}

/* Collapsible code blocks for example pages */

document.addEventListener('DOMContentLoaded', () => {
    // Generate navigation
    generateNav();
    document.querySelectorAll('pre').forEach(pre => {
        const code = pre.querySelector('code');
        if (!code) return;

        // Only add toggle if code has multiple lines
        const lines = code.textContent.trim().split('\n');
        if (lines.length <= 1) return;

        // Wrap pre in a container for positioning
        const wrapper = document.createElement('div');
        wrapper.className = 'code-wrapper';
        pre.parentNode.insertBefore(wrapper, pre);
        wrapper.appendChild(pre);

        // Start collapsed
        pre.classList.add('collapsed');

        // Create toggle button
        const toggle = document.createElement('button');
        toggle.className = 'code-toggle';
        toggle.innerHTML = '<span class="arrow">▼</span> show';
        toggle.addEventListener('click', () => {
            const isCollapsed = pre.classList.toggle('collapsed');
            toggle.classList.toggle('expanded', !isCollapsed);
            toggle.innerHTML = isCollapsed
                ? '<span class="arrow">▼</span> show'
                : '<span class="arrow">▲</span> hide';
        });

        // Insert toggle inside wrapper
        wrapper.appendChild(toggle);
    });
});
