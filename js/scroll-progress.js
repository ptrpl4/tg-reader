let bar = null;
let ticking = false;

function update() {
    ticking = false;
    if (!bar) return;
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? Math.min(scrollTop / docHeight, 1) * 100 : 0;
    bar.style.width = `${pct}%`;
}

function onScroll() {
    if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
    }
}

export function initScrollProgress() {
    bar = document.getElementById("scrollProgress");
    if (!bar) return;
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
}

export function resetScrollProgress() {
    if (bar) bar.style.width = "0%";
}
