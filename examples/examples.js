/* Collapsible code blocks for example pages */

document.addEventListener('DOMContentLoaded', () => {
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
