const SET_SYMBOLS = {};
let showSetIcons = true; // Default value

async function loadSetSymbol(setCode) {
    if (SET_SYMBOLS[setCode]) {
        return SET_SYMBOLS[setCode];
    }

    try {
        const response = await fetch(`/assets/sets/${setCode.toLowerCase()}.svg`);
        if (!response.ok) {
            console.warn(`Could not load symbol for set ${setCode}`);
            return null;
        }
        const svgText = await response.text();
        // Remove any width/height attributes from the SVG to allow scaling
        const cleanedSvg = svgText.replace(/(width|height)="[^"]*"/g, '');
        SET_SYMBOLS[setCode] = cleanedSvg;
        return cleanedSvg;
    } catch (error) {
        console.error(`Error loading set symbol for ${setCode}:`, error);
        return null;
    }
}

function generateDividerSVG(text, isLeft) {
    // Define dimensions
    const baseWidth = 92;
    const baseHeight = 66;
    const tabWidth = baseWidth / 2;
    const tabHeight = 14;
    const totalHeight = baseHeight + tabHeight;
    const iconSize = 8; // 8mm for set symbols
    
    // Calculate vertical center of tab
    const tabCenter = tabHeight / 2;
    const textOffset = 0.5; // Small offset to visually center the text
    
    // Create the basic SVG structure with proper viewBox
    const svg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg width="${baseWidth}mm" height="${totalHeight}mm" viewBox="0 0 ${baseWidth} ${totalHeight}" version="1.1" xmlns="http://www.w3.org/2000/svg">
    <g stroke="black" stroke-width="0.25" fill="none" stroke-dasharray="2,2">
        <!-- Base rectangle -->
        <rect x="1" y="${tabHeight}" width="${baseWidth-2}" height="${baseHeight-1}" />
        
        <!-- Tab outline (without bottom line) -->
        ${isLeft 
            ? `<path d="M 1 1 L ${tabWidth} 1 L ${tabWidth} ${tabHeight} M 1 1 L 1 ${tabHeight}" />`
            : `<path d="M ${baseWidth-1} 1 L ${baseWidth-tabWidth} 1 L ${baseWidth-tabWidth} ${tabHeight} M ${baseWidth-1} 1 L ${baseWidth-1} ${tabHeight}" />`
        }
    </g>
    
    ${(showSetIcons && SET_SYMBOLS[text]) ? `
    <!-- Set Symbol -->
    <svg x="${isLeft ? 3 : baseWidth-tabWidth+3}" y="${tabCenter - iconSize/2}" 
         width="${iconSize}" height="${iconSize}" 
         viewBox="0 0 100 100" 
         preserveAspectRatio="xMidYMid meet">
        ${SET_SYMBOLS[text]}
    </svg>
    ` : ''}
    
    <!-- Label Text -->
    <text x="${(showSetIcons && SET_SYMBOLS[text]) ? (isLeft ? iconSize + 6 : baseWidth-tabWidth+iconSize + 6) : (isLeft ? 6 : baseWidth-tabWidth+6)}" y="${tabCenter + textOffset}" 
          font-family="Calibri" 
          font-size="7"
          font-weight="bold"
          text-anchor="start" 
          dominant-baseline="middle"
          letter-spacing="1">
        ${text}
    </text>
</svg>`;

    return svg;
}

// Helper function to get the correct Unicode code point for a set code
function getSetSymbolCode(setCode) {
    // This is a simplified mapping. You might need to add more mappings.
    const setCodeMap = {
        'DMR': 0x64, // Example mapping
        'MH2': 0x6D,
        // Add more mappings as needed
    };
    return setCodeMap[setCode] || 0x00; // Default to a basic symbol if not found
}

async function generatePDF() {
    const button = document.getElementById('generateButton');
    const spinner = document.getElementById('generateSpinner');
    
    // Disable button and show spinner
    button.disabled = true;
    spinner.classList.remove('d-none');
    button.textContent = ' Generating...';
    button.prepend(spinner);

    try {
        const leftText = document.getElementById('left').value.split('\n').map(t => t.trim()).filter(t => t);
        const rightText = document.getElementById('right').value.split('\n').map(t => t.trim()).filter(t => t);
        
        // Preload all set symbols
        await Promise.all([...leftText, ...rightText].map(loadSetSymbol));
        
        const images = [];

        // Generate left side dividers
        for (const text of leftText) {
            const svgData = generateDividerSVG(text, true);
            const img = await convertSvgToPng(svgData);
            images.push({img, isLeft: true});
        }

        // Generate right side dividers
        for (const text of rightText) {
            const svgData = generateDividerSVG(text, false);
            const img = await convertSvgToPng(svgData);
            images.push({img, isLeft: false});
        }

        await createPDF(images);  // Wait for PDF creation to complete
        
        // Re-enable button and hide spinner only after PDF is created
        button.disabled = false;
        spinner.classList.add('d-none');
        button.textContent = 'Generate PDF';
    } catch (error) {
        console.error('Error generating PDF:', error);
        // Re-enable button and hide spinner on error
        button.disabled = false;
        spinner.classList.add('d-none');
        button.textContent = 'Generate PDF';
    }
}

function convertSvgToPng(svgData) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(svgBlob);

        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = Math.round(92 * 300 / 25.4);  // Updated width
            canvas.height = Math.round(80 * 300 / 25.4);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(blob => {
                URL.revokeObjectURL(url);
                resolve(blob);
            }, 'image/png', 0.8);
        };

        img.onerror = (err) => {
            console.error('Error loading SVG:', err);
            reject(err);
        };

        img.src = url;
    });
}

async function createPDF(images) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter',
        compress: true  // Enable compression
    });

    const margin = 12.7;
    const spacing = 5;
    let x = margin;
    let y = margin;
    const pageWidth = 215.9;
    const pageHeight = 279.4;
    const labelWidth = 92;    // Updated width to 92mm
    const labelHeight = 80;

    // Process images in smaller batches
    const batchSize = 10;
    for (let i = 0; i < images.length; i += batchSize) {
        const batch = images.slice(i, i + batchSize);
        
        for (const {img} of batch) {
            // Check if we need to start a new row
            if (x + labelWidth > pageWidth - margin) {
                x = margin;
                y += labelHeight + spacing;
            }
            
            // Check if we need a new page
            if (y + labelHeight > pageHeight - margin) {
                doc.addPage();
                x = margin;
                y = margin;
            }

            const imgUrl = URL.createObjectURL(img);
            const imgData = await fetch(imgUrl).then(res => res.blob()).then(blob => blobToBase64(blob));
            
            try {
                doc.addImage(imgData, 'PNG', x, y, labelWidth, labelHeight, undefined, 'FAST');
            } catch (error) {
                console.error('Error adding image to PDF:', error);
                // Continue with next image
                continue;
            } finally {
                URL.revokeObjectURL(imgUrl);
            }

            x += labelWidth + spacing;
        }
    }
    
    try {
        doc.save('labels.pdf');
    } catch (error) {
        console.error('Error saving PDF:', error);
        alert('Error generating PDF. Try generating fewer labels at once.');
    }
}

function blobToBase64(blob) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(blob);
    });
}

function handleCSVUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            processCSV(e.target.result);
        };
        reader.readAsText(file);
    }
}

function updateCounters() {
    const leftText = document.getElementById('left').value.split('\n').map(t => t.trim()).filter(t => t);
    const rightText = document.getElementById('right').value.split('\n').map(t => t.trim()).filter(t => t);
    
    document.getElementById('leftCount').textContent = `${leftText.length} Dividers`;
    document.getElementById('rightCount').textContent = `${rightText.length} Dividers`;
}

function processCSV(csvText) {
    // Parse CSV to array of objects
    const lines = csvText.split('\n');
    const headers = lines[0].split(',');
    const setCodeIndex = headers.findIndex(h => h.trim() === 'Set code');
    
    if (setCodeIndex === -1) {
        alert('Could not find "Set code" column in CSV');
        return;
    }

    // Get unique set codes and validate format
    const setCodes = new Set();
    for (let i = 1; i < lines.length; i++) {
        const columns = lines[i].split(',');
        if (columns[setCodeIndex]) {
            const setCode = columns[setCodeIndex].trim();
            
            // Only add valid set codes (2-4 uppercase letters/numbers)
            if (setCode.length >= 2 && 
                setCode.length <= 4 && 
                /^[A-Z0-9]+$/.test(setCode)) {
                setCodes.add(setCode);
            }
        }
    }

    const sortedCodes = Array.from(setCodes).sort();
    
    // Split into left and right sides
    const leftCodes = [];
    const rightCodes = [];
    
    sortedCodes.forEach((code, index) => {
        if (index % 2 === 0) {
            leftCodes.push(code);
        } else {
            rightCodes.push(code);
        }
    });

    // Fill textareas
    document.getElementById('left').value = leftCodes.join('\n');
    document.getElementById('right').value = rightCodes.join('\n');
    
    // Update the counters
    updateCounters();
}

function initializeTheme() {
    // Check for saved theme preference or default to system
    const savedTheme = localStorage.getItem('theme') || 'system';
    document.querySelector(`#theme-${savedTheme}`).checked = true;
    
    // Apply the theme
    applyTheme(savedTheme);
    
    // Add event listeners to theme toggles
    document.querySelectorAll('input[name="theme"]').forEach(input => {
        input.addEventListener('change', (e) => {
            const newTheme = e.target.value;
            localStorage.setItem('theme', newTheme);
            applyTheme(newTheme);
        });
    });
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (localStorage.getItem('theme') === 'system') {
            applyTheme('system');
        }
    });
}

function applyTheme(theme) {
    const isDark = theme === 'dark' || 
        (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    document.documentElement.setAttribute('data-bs-theme', isDark ? 'dark' : 'light');
}

function initializeSettings() {
    // Load saved setting or default to true
    const savedShowIcons = localStorage.getItem('showSetIcons');
    showSetIcons = savedShowIcons === null ? true : savedShowIcons === 'true';
    
    // Set checkbox state
    document.getElementById('showSetIcons').checked = showSetIcons;
    
    // Add event listener
    document.getElementById('showSetIcons').addEventListener('change', (e) => {
        showSetIcons = e.target.checked;
        localStorage.setItem('showSetIcons', showSetIcons);
    });
}

// Call initialize when the page loads
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    initializeSettings();
});