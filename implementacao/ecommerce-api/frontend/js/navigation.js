export function createNavigation(elements) {
    const setActiveView = (view) => {
        elements.views.forEach((section) => {
            section.classList.toggle("is-active", section.id === `view-${view}`);
        });

        elements.navLinks.forEach((link) => {
            link.classList.toggle("is-active", link.dataset.view === view);
        });
    };

    const bind = () => {
        elements.navLinks.forEach((link) => {
            link.addEventListener("click", (event) => {
                event.preventDefault();
                setActiveView(link.dataset.view);
            });
        });
    };

    return { setActiveView, bind };
}
