const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1080;
const DISPLAY_WIDTH = 540;
let SCALE = DISPLAY_WIDTH / CANVAS_WIDTH; // Se actualiza dinámicamente
const OVERLAY_PATH = './elementos/modelo-gazzetta.png';

let flyerData = {
    backgroundImage: null,
    backgroundZoom: 1,        // 0.5 a 2
    backgroundOffsetX: 0,     // en píxeles
    backgroundOffsetY: 0,
    textElements: []
};

let draggingElement = null;
let dragOffset = { x: 0, y: 0 };
let textIdCounter = 0;
let editingTextId = null;

// DOM
const canvas = document.getElementById('canvas');
const bgImage = document.getElementById('bgImage');
const clearBgImageBtn = document.getElementById('clearBgImage');
const textInput = document.getElementById('textInput');
const addTextBtn = document.getElementById('addTextBtn');
const downloadBtn = document.getElementById('downloadBtn');
const resetBtn = document.getElementById('resetBtn');

// INIT
document.addEventListener('DOMContentLoaded', () => {
    updateScale();
    initEvents();
    renderCanvas();
    
    // Recalcular SCALE cuando cambia el tamaño de la ventana
    window.addEventListener('resize', () => {
        updateScale();
        renderCanvas();
    });
});

// Actualiza SCALE basado en el ancho real del canvas HTML
function updateScale() {
    const canvasElement = document.getElementById('canvas');
    if (canvasElement) {
        const realWidth = canvasElement.offsetWidth;
        SCALE = realWidth / CANVAS_WIDTH;
    }
}

// ---------------- EVENTS ----------------
function initEvents() {
    bgImage.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            flyerData.backgroundImage = ev.target.result;
            flyerData.backgroundZoom = 100;
            flyerData.backgroundOffsetX = 0;
            flyerData.backgroundOffsetY = 0;
            document.getElementById('bgControls').classList.remove('hidden');
            renderCanvas();
        };
        reader.readAsDataURL(file);
    };

    clearBgImageBtn.onclick = () => {
        flyerData.backgroundImage = null;
        bgImage.value = '';
        document.getElementById('bgControls').classList.add('hidden');
        renderCanvas();
    };
    
    // Controles de zoom y posición
    document.getElementById('bgZoom').oninput = e => {
        flyerData.backgroundZoom = parseInt(e.target.value);
        document.getElementById('zoomValue').textContent = e.target.value + '%';
        renderCanvas();
    };
    
    document.getElementById('bgOffsetX').oninput = e => {
        flyerData.backgroundOffsetX = parseInt(e.target.value) || 0;
        document.getElementById('offsetXValue').textContent = e.target.value;
        renderCanvas();
    };
    
    document.getElementById('bgOffsetY').oninput = e => {
        flyerData.backgroundOffsetY = parseInt(e.target.value) || 0;
        document.getElementById('offsetYValue').textContent = e.target.value;
        renderCanvas();
    };
    
    document.getElementById('resetBgBtn').onclick = () => {
        flyerData.backgroundZoom = 100;
        flyerData.backgroundOffsetX = 0;
        flyerData.backgroundOffsetY = 0;
        document.getElementById('bgZoom').value = 100;
        document.getElementById('bgOffsetX').value = 0;
        document.getElementById('bgOffsetY').value = 0;
        document.getElementById('zoomValue').textContent = '100%';
        document.getElementById('offsetXValue').textContent = '0';
        document.getElementById('offsetYValue').textContent = '0';
        renderCanvas();
    };

    addTextBtn.onclick = addText;
    textInput.onkeydown = e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addText();
        }
    };

    downloadBtn.onclick = downloadFlyer;
    resetBtn.onclick = resetFlyer;

    // Mouse events
    canvas.addEventListener('mousedown', startDrag);
    canvas.addEventListener('mousemove', drag);
    canvas.addEventListener('mouseup', endDrag);
    canvas.addEventListener('mouseleave', endDrag);

    // Touch events para móvil
    canvas.addEventListener('touchstart', handleTouchStart, false);
    canvas.addEventListener('touchmove', handleTouchMove, false);
    canvas.addEventListener('touchend', endDrag, false);
}

// ---------------- ADD TEXT ----------------
function addText() {
    const text = textInput.value.trim();
    if (!text) return;

    flyerData.textElements.push({
        id: `text-${textIdCounter++}`,
        text,
        fontSize: 42,
        x: CANVAS_WIDTH / 2,
        y: CANVAS_HEIGHT * 0.75,
        width: CANVAS_WIDTH * 0.8   // TEXTBOX REAL
    });

    textInput.value = '';
    renderCanvas();
}

// ---------------- RENDER ----------------
function renderCanvas() {
    canvas.innerHTML = '';

    // ===== FONDO (IMAGEN + DEGRADADO) =====
    if (flyerData.backgroundImage) {
        const bg = document.createElement('div');
        bg.style.position = 'absolute';
        bg.style.inset = 0;
        bg.style.backgroundImage = `url('${flyerData.backgroundImage}')`;
        bg.style.backgroundSize = (flyerData.backgroundZoom) + '%';
        bg.style.backgroundPosition = `calc(50% + ${flyerData.backgroundOffsetX}px) calc(50% + ${flyerData.backgroundOffsetY}px)`;
        bg.style.backgroundRepeat = 'no-repeat';
        bg.style.zIndex = '1';

        const gradient = document.createElement('div');
        gradient.style.position = 'absolute';
        gradient.style.bottom = 0;
        gradient.style.left = 0;
        gradient.style.width = '100%';
        gradient.style.height = '35%';
        gradient.style.background =
            'linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0))';
        gradient.style.pointerEvents = 'none';

        bg.appendChild(gradient);
        canvas.appendChild(bg);
    }

    // ===== TEXTOS =====
    flyerData.textElements.forEach(el => {
        const div = document.createElement('div');
        div.className = 'text-element';
        div.textContent = el.text;

        div.style.position = 'absolute';
        div.style.left = el.x * SCALE + 'px';
        div.style.top = el.y * SCALE + 'px';
        div.style.transform = 'translate(-50%, -50%)';
        div.style.width = el.width * SCALE + 'px';
        div.style.fontSize = el.fontSize * SCALE + 'px';
        div.style.color = '#fff';
        div.style.textAlign = 'center';
        div.style.lineHeight = '1.2';
        div.style.zIndex = '5';

        div.dataset.id = el.id;

        // ✏️ EDICIÓN DIRECTA
        div.ondblclick = e => {
            e.stopPropagation();
            editingTextId = el.id;

            div.contentEditable = true;
            div.classList.add('editable');
            div.focus();

            div.onblur = () => {
                div.contentEditable = false;
                div.classList.remove('editable');
                editingTextId = null;

                el.text = div.textContent.trim();
                if (!el.text) {
                    flyerData.textElements =
                        flyerData.textElements.filter(t => t.id !== el.id);
                }
                renderCanvas();
            };

            div.onkeydown = ev => {
                if (ev.key === 'Enter') {
                    ev.preventDefault();
                    div.blur();
                }
                if (ev.key === 'Escape') {
                    div.textContent = el.text;
                    div.blur();
                }
            };
        };

        canvas.appendChild(div);
    });

    // ===== OVERLAY =====
    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.inset = 0;
    overlay.style.backgroundImage = `url('${OVERLAY_PATH}')`;
    overlay.style.backgroundSize = 'contain';
    overlay.style.backgroundRepeat = 'no-repeat';
    overlay.style.backgroundPosition = 'center';
    overlay.style.pointerEvents = 'none';
    overlay.style.zIndex = '10';
    canvas.appendChild(overlay);
}

// ---------------- DRAG (CORREGIDO) ----------------
function startDrag(e) {
    if (editingTextId) return;

    const el = e.target.closest('.text-element');
    if (!el) return;

    draggingElement = el;

    const rect = el.getBoundingClientRect();
    dragOffset.x = e.clientX - (rect.left + rect.width / 2);
    dragOffset.y = e.clientY - (rect.top + rect.height / 2);
}

function drag(e) {
    if (!draggingElement) return;

    const canvasRect = canvas.getBoundingClientRect();

    draggingElement.style.left =
        (e.clientX - canvasRect.left - dragOffset.x) + 'px';
    draggingElement.style.top =
        (e.clientY - canvasRect.top - dragOffset.y) + 'px';
}

// Touch handlers para móvil
function handleTouchStart(e) {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    
    const el = e.target.closest('.text-element');
    if (!el || editingTextId) return;
    
    e.preventDefault();
    draggingElement = el;
    
    const rect = el.getBoundingClientRect();
    dragOffset.x = touch.clientX - (rect.left + rect.width / 2);
    dragOffset.y = touch.clientY - (rect.top + rect.height / 2);
}

function handleTouchMove(e) {
    if (!draggingElement || e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    const canvasRect = canvas.getBoundingClientRect();
    
    e.preventDefault();
    draggingElement.style.left =
        (touch.clientX - canvasRect.left - dragOffset.x) + 'px';
    draggingElement.style.top =
        (touch.clientY - canvasRect.top - dragOffset.y) + 'px';
}

function endDrag() {
    if (!draggingElement) return;

    const id = draggingElement.dataset.id;
    const x = parseFloat(draggingElement.style.left) / SCALE;
    const y = parseFloat(draggingElement.style.top) / SCALE;

    const el = flyerData.textElements.find(t => t.id === id);
    if (el) {
        el.x = x;
        el.y = y;
    }

    draggingElement = null;
}

// ---------------- EXPORT (PIXEL PERFECT) ----------------
async function downloadFlyer() {
    try {
        downloadBtn.disabled = true;
        downloadBtn.textContent = 'Generando...';

        const exportDiv = document.createElement('div');
        exportDiv.style.width = CANVAS_WIDTH + 'px';
        exportDiv.style.height = CANVAS_HEIGHT + 'px';
        exportDiv.style.position = 'relative';
        exportDiv.style.backgroundColor = '#000';

        // Fondo + degradado
        if (flyerData.backgroundImage) {
            const bg = document.createElement('div');
            bg.style.position = 'absolute';
            bg.style.inset = 0;
            bg.style.backgroundImage = `url('${flyerData.backgroundImage}')`;
            bg.style.backgroundSize = (flyerData.backgroundZoom) + '%';
            bg.style.backgroundPosition = `calc(50% + ${flyerData.backgroundOffsetX}px) calc(50% + ${flyerData.backgroundOffsetY}px)`;
            bg.style.backgroundRepeat = 'no-repeat';

            const gradient = document.createElement('div');
            gradient.style.position = 'absolute';
            gradient.style.bottom = 0;
            gradient.style.left = 0;
            gradient.style.width = '100%';
            gradient.style.height = '35%';
            gradient.style.background =
                'linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0))';

            bg.appendChild(gradient);
            exportDiv.appendChild(bg);
        }

        // Textos (con LEMONMILK)
        flyerData.textElements.forEach(el => {
            const t = document.createElement('div');
            t.textContent = el.text;
            t.style.position = 'absolute';
            t.style.left = el.x + 'px';
            t.style.top = el.y + 'px';
            t.style.transform = 'translate(-50%, -50%)';
            t.style.width = el.width + 'px';
            t.style.fontSize = el.fontSize + 'px';
            t.style.fontFamily = '"LEMONMILK", Arial, sans-serif';
            t.style.color = '#fff';
            t.style.textAlign = 'center';
            t.style.lineHeight = '1.2';
            t.style.whiteSpace = 'pre-wrap';
            t.style.wordWrap = 'break-word';

            exportDiv.appendChild(t);
        });

        // Overlay (plantilla)
        const overlay = document.createElement('div');
        overlay.style.position = 'absolute';
        overlay.style.inset = 0;
        overlay.style.backgroundImage = `url('${OVERLAY_PATH}')`;
        overlay.style.backgroundSize = 'contain';
        overlay.style.backgroundRepeat = 'no-repeat';
        overlay.style.backgroundPosition = 'center';
        overlay.style.pointerEvents = 'none';
        overlay.style.zIndex = '10';
        exportDiv.appendChild(overlay);

        document.body.appendChild(exportDiv);
        
        const img = await html2canvas(exportDiv, {
            allowTaint: true,
            backgroundColor: '#000',
            scale: 1,
            logging: false
        });
        
        document.body.removeChild(exportDiv);

        const link = document.createElement('a');
        link.href = img.toDataURL('image/png');
        link.download = 'flyer.png';
        link.click();

        downloadBtn.disabled = false;
        downloadBtn.textContent = 'Descargar';
    } catch (error) {
        console.error('Error al descargar:', error);
        downloadBtn.disabled = false;
        downloadBtn.textContent = 'Descargar';
    }
}

// ---------------- RESET ----------------
function resetFlyer() {
    if (!confirm('¿Limpiar todo?')) return;
    flyerData = { 
        backgroundImage: null, 
        backgroundZoom: 100,
        backgroundOffsetX: 0,
        backgroundOffsetY: 0,
        textElements: [] 
    };
    bgImage.value = '';
    textInput.value = '';
    document.getElementById('bgControls').classList.add('hidden');
    renderCanvas();
}