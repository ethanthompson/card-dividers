const SET_SYMBOLS = {};
let showSetIcons = true; // Default value
let lineStyle = 'dashed'; // Default value

// Paper size dimensions in mm
const PAPER_SIZES = {
    'letter': { width: 215.9, height: 279.4 },
    'legal': { width: 215.9, height: 355.6 },
    'tabloid': { width: 279.4, height: 431.8 },
    'a4': { width: 210, height: 297 },
    'a3': { width: 297, height: 420 },
    'a5': { width: 148, height: 210 }
};

// Box size presets
const BOX_SIZES = {
    'bcw-storage': {
        baseWidth: 94,
        baseHeight: 68,
        tabHeight: 14
    },
    'bcw-quickfold': {
        baseWidth: 77,
        baseHeight: 94,
        tabHeight: 9
    },
    'custom': {
        baseWidth: 94,
        baseHeight: 66,
        tabHeight: 14
    }
};

let currentBoxSize = 'bcw-storage'; // Default value

function updateCustomSizeVisibility() {
    const customFields = document.getElementById('customSizeFields');
    const isCustom = document.getElementById('boxSize').value === 'custom';
    customFields.style.display = isCustom ? 'block' : 'none';
}

function updateCustomSizeDimensions() {
    if (currentBoxSize === 'custom') {
        const width = parseInt(document.getElementById('customBaseWidth').value) || 94;
        const height = parseInt(document.getElementById('customBaseHeight').value) || 66;
        const tabHeight = parseInt(document.getElementById('customTabHeight').value) || 14;
        
        // Show/hide warning based on width
        const warning = document.getElementById('widthWarning');
        if (warning) {
            warning.style.display = width > 100 ? 'block' : 'none';
        }
        
        BOX_SIZES.custom.baseWidth = width;
        BOX_SIZES.custom.baseHeight = height;
        BOX_SIZES.custom.tabHeight = tabHeight;
    }
}

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
    // Get current box dimensions
    const dimensions = BOX_SIZES[currentBoxSize];
    
    // Define dimensions
    const baseWidth = dimensions.baseWidth;
    const baseHeight = dimensions.baseHeight;
    const tabWidth = baseWidth / 2;
    const tabHeight = dimensions.tabHeight;
    const totalHeight = baseHeight + tabHeight;
    
    // Scale icon and font size based on tab height
    const iconSize = Math.min(8, tabHeight * 0.57); // 8mm max, scaled by tab height ratio (8/14 ≈ 0.57)
    const defaultFontSize = Math.min(7, tabHeight * 0.5); // 7mm max, scaled by tab height ratio (7/14 = 0.5)
    const minFontSize = Math.min(2.5, tabHeight * 0.18); // 2.5mm max, scaled by tab height ratio (2.5/14 ≈ 0.18)
    
    // Calculate vertical center of tab
    const tabCenter = tabHeight / 2;
    const textOffset = 0.5; // Small offset to visually center the text
    
    // Get current line style from the dropdown
    const currentLineStyle = document.getElementById('lineStyle').value;
    
    // Only show set icon if it's enabled AND the text is a valid set code AND we have the symbol
    const isSetCode = text.length >= 2 && text.length <= 4 && /^[A-Z0-9]+$/.test(text);
    const shouldShowIcon = showSetIcons && isSetCode && SET_SYMBOLS[text];
    
    // Calculate available width for text
    const iconAndPadding = shouldShowIcon ? iconSize + 6 : 3;
    const availableWidth = tabWidth - iconAndPadding - 3; // 3mm padding from right edge
    
    // Calculate font size and line wrapping
    const maxCharsPerLine = 20; // Approximate max chars per line at default font size
    const minPadding = 1; // Minimum 1mm padding at top and bottom
    
    // Calculate initial font size based on text length
    const approxCharWidth = defaultFontSize * 0.6;
    let fontSize = defaultFontSize;
    
    // Determine if we need to wrap text and calculate final font size
    let lines = [text];
    if (text.length > maxCharsPerLine) {
        // Try to split at word boundaries
        const words = text.split(' ');
        lines = [];
        let currentLine = '';
        
        for (const word of words) {
            if (currentLine && (currentLine + ' ' + word).length > maxCharsPerLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = currentLine ? currentLine + ' ' + word : word;
            }
        }
        if (currentLine) {
            lines.push(currentLine);
        }
        
        // Calculate font size based on available height and width
        const maxLineLength = Math.max(...lines.map(line => line.length));
        const lineHeight = 1.2; // Line height multiplier
        const availableHeight = tabHeight - (2 * minPadding); // Ensure 1mm padding top and bottom
        
        // Calculate font size constraints
        const fontSizeByWidth = (availableWidth / maxLineLength) / 0.6;
        const fontSizeByHeight = availableHeight / (lines.length * lineHeight);
        
        fontSize = Math.min(
            defaultFontSize,
            fontSizeByWidth,
            fontSizeByHeight
        );
    } else if (text.length * approxCharWidth > availableWidth) {
        fontSize = Math.max(minFontSize, (availableWidth / text.length) / 0.6);
    }
    
    fontSize = Math.max(minFontSize, fontSize);
    const lineHeight = fontSize * 1.2;
    const totalTextHeight = lines.length * lineHeight;
    
    // Calculate vertical centering within the tab
    // Start at the top padding, then add half the remaining space
    const availableHeight = tabHeight - (2 * minPadding);
    const startY = minPadding + (availableHeight / 2);
    
    // For multi-line text, adjust the start position up by half the text block height
    const textBlockOffset = (lines.length - 1) * lineHeight / 2;
    
    // Create the basic SVG structure with proper viewBox
    const svg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg width="${baseWidth}mm" height="${totalHeight}mm" viewBox="0 0 ${baseWidth} ${totalHeight}" version="1.1" xmlns="http://www.w3.org/2000/svg">
    ${currentLineStyle !== 'none' ? `<g stroke="black" stroke-width="0.25" fill="none" ${currentLineStyle === 'dashed' ? 'stroke-dasharray="2,2"' : ''}>
        <!-- Base rectangle with split top line -->
        <path d="
            M 1 ${tabHeight} 
            L 1 ${baseHeight + tabHeight - 1} 
            L ${baseWidth-2} ${baseHeight + tabHeight - 1} 
            L ${baseWidth-2} ${tabHeight}
            ${isLeft 
                ? `M ${tabWidth} ${tabHeight} L ${baseWidth-2} ${tabHeight}` 
                : `M 1 ${tabHeight} L ${baseWidth-tabWidth} ${tabHeight}`
            }"
        />
        
        <!-- Tab outline (without bottom line) -->
        ${isLeft 
            ? `<path d="M 1 1 L ${tabWidth} 1 L ${tabWidth} ${tabHeight} M 1 1 L 1 ${tabHeight}" />`
            : `<path d="M ${baseWidth-2} 1 L ${baseWidth-tabWidth} 1 L ${baseWidth-tabWidth} ${tabHeight} M ${baseWidth-2} 1 L ${baseWidth-2} ${tabHeight}" />`
        }
    </g>` : ''}
    
    ${shouldShowIcon ? `
    <!-- Set Symbol -->
    <svg x="${isLeft ? 3 : baseWidth-tabWidth+3}" y="${startY - iconSize/2}" 
         width="${iconSize}" height="${iconSize}" 
         viewBox="0 0 100 100" 
         preserveAspectRatio="xMidYMid meet">
        ${SET_SYMBOLS[text]}
    </svg>
    ` : ''}
    
    <!-- Label Text -->
    ${lines.map((line, index) => `
    <text x="${shouldShowIcon ? (isLeft ? iconSize + 6 : baseWidth-tabWidth+iconSize + 6) : (isLeft ? 3 : baseWidth-tabWidth+3)}" 
          y="${startY - textBlockOffset + (index * lineHeight)}" 
          font-family="Calibri" 
          font-size="${fontSize}"
          font-weight="bold"
          text-anchor="start" 
          dominant-baseline="middle"
          letter-spacing="${fontSize > 5 ? 1 : 0}">
        ${line}
    </text>
    `).join('')}
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

function setButtonGenerating(generating) {
    const button = document.getElementById('generateButton');
    if (!button) return;

    if (generating) {
        button.disabled = true;
        // Create new spinner
        const spinner = document.createElement('span');
        spinner.className = 'spinner-border spinner-border-sm';
        spinner.setAttribute('role', 'status');
        spinner.setAttribute('aria-hidden', 'true');
        spinner.style.marginRight = '5px';
        
        // Clear existing content and add new spinner + text
        button.innerHTML = '';
        button.appendChild(spinner);
        button.appendChild(document.createTextNode('Generating...'));
    } else {
        button.disabled = false;
        button.innerHTML = 'Generate PDF';
    }
}

async function generatePDF() {
    // Update custom dimensions before generating
    updateCustomSizeDimensions();
    
    // Get current settings
    currentBoxSize = document.getElementById('boxSize').value;
    lineStyle = document.getElementById('lineStyle').value;
    showSetIcons = document.getElementById('showSetIcons').value === 'true';
    
    // Clear any cached set symbols if icons were previously hidden but are now shown
    if (showSetIcons) {
        Object.keys(SET_SYMBOLS).forEach(key => {
            delete SET_SYMBOLS[key];
        });
    }
    
    // Set button to generating state
    setButtonGenerating(true);

    try {
        const leftText = document.getElementById('left').value.split('\n').map(t => t.trim()).filter(t => t);
        const rightText = document.getElementById('right').value.split('\n').map(t => t.trim()).filter(t => t);
        
        // Only attempt to load set symbols for text that matches set code format
        const isSetCode = text => text.length >= 2 && text.length <= 4 && /^[A-Z0-9]+$/.test(text);
        
        // Preload only valid set codes if icons are enabled
        if (showSetIcons) {
            await Promise.all([...leftText, ...rightText]
                .filter(isSetCode)
                .map(loadSetSymbol));
        }
        
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
    } catch (error) {
        console.error('Error generating PDF:', error);
    } finally {
        // Reset button state
        setButtonGenerating(false);
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
            const dimensions = BOX_SIZES[currentBoxSize];
            canvas.width = Math.round(dimensions.baseWidth * 300 / 25.4);  // Convert mm to pixels at 300 DPI
            canvas.height = Math.round((dimensions.baseHeight + dimensions.tabHeight) * 300 / 25.4);
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
    
    // Get selected paper size
    const paperSizeKey = document.getElementById('paperSize').value;
    const paperSize = PAPER_SIZES[paperSizeKey];
    
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [paperSize.width, paperSize.height],
        compress: true
    });

    const margin = 6.35;  // 0.25 inches in mm
    const spacing = 2;    // 2mm spacing between dividers
    let x = margin;
    let y = margin;
    const pageWidth = paperSize.width;
    const pageHeight = paperSize.height;
    const dimensions = BOX_SIZES[currentBoxSize];
    const labelWidth = dimensions.baseWidth;
    const labelHeight = dimensions.baseHeight + dimensions.tabHeight;

    // Calculate usable width (page width minus margins)
    const usableWidth = pageWidth - (2 * margin);
    
    // Calculate how many dividers can fit in a row
    const dividerAndSpacing = labelWidth + spacing;
    const maxDividersPerRow = Math.floor((usableWidth + spacing) / dividerAndSpacing);
    
    // Process images in smaller batches
    const batchSize = 10;
    for (let i = 0; i < images.length; i += batchSize) {
        const batch = images.slice(i, i + batchSize);
        
        for (const {img} of batch) {
            // Check if we need to start a new row
            const currentPosition = x + labelWidth - margin;
            if (currentPosition > usableWidth) {
                x = margin;
                y += labelHeight + spacing;
            }
            
            // Check if we need a new page
            if (y + labelHeight > pageHeight - margin) {
                doc.addPage([paperSize.width, paperSize.height]);
                x = margin;
                y = margin;
            }

            try {
                const imgUrl = URL.createObjectURL(img);
                const imgData = await fetch(imgUrl).then(res => res.blob()).then(blob => blobToBase64(blob));
                doc.addImage(imgData, 'PNG', x, y, labelWidth, labelHeight, undefined, 'FAST');
                URL.revokeObjectURL(imgUrl);
            } catch (error) {
                console.error('Error adding image to PDF:', error);
                continue;
            }

            // Move x position for next divider
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
    const labelIndex = headers.findIndex(h => h.trim() === 'Label');
    
    if (setCodeIndex === -1 && labelIndex === -1) {
        alert('Could not find either "Set code" or "Label" column in CSV');
        return;
    }

    // Use set codes if available, otherwise use labels
    const useSetCodes = setCodeIndex !== -1;
    const columnIndex = useSetCodes ? setCodeIndex : labelIndex;
    
    // Get unique values
    const uniqueValues = new Set();
    for (let i = 1; i < lines.length; i++) {
        const columns = lines[i].split(',');
        if (columns[columnIndex]) {
            const value = columns[columnIndex].trim();
            
            if (useSetCodes) {
                // Only add valid set codes (2-4 uppercase letters/numbers)
                if (value.length >= 2 && 
                    value.length <= 4 && 
                    /^[A-Z0-9]+$/.test(value)) {
                    uniqueValues.add(value);
                }
            } else {
                // For labels, just add any non-empty value
                if (value) {
                    uniqueValues.add(value);
                }
            }
        }
    }

    const sortedValues = Array.from(uniqueValues).sort();
    
    // Split into left and right sides
    const leftValues = [];
    const rightValues = [];
    
    sortedValues.forEach((value, index) => {
        if (index % 2 === 0) {
            leftValues.push(value);
        } else {
            rightValues.push(value);
        }
    });

    // Fill textareas
    document.getElementById('left').value = leftValues.join('\n');
    document.getElementById('right').value = rightValues.join('\n');
    
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
    // Load saved settings or use defaults
    const savedShowIcons = localStorage.getItem('showSetIcons');
    const savedLineStyle = localStorage.getItem('lineStyle');
    const savedBoxSize = localStorage.getItem('boxSize');
    const savedPaperSize = localStorage.getItem('paperSize');
    const savedCustomDimensions = JSON.parse(localStorage.getItem('customDimensions') || 'null');
    
    showSetIcons = savedShowIcons === null ? true : savedShowIcons === 'true';
    lineStyle = savedLineStyle || 'dashed';
    currentBoxSize = savedBoxSize || 'bcw-storage';
    
    if (savedCustomDimensions) {
        BOX_SIZES.custom = savedCustomDimensions;
    }
    
    // Set initial states
    document.getElementById('showSetIcons').value = showSetIcons.toString();
    document.getElementById('lineStyle').value = lineStyle;
    document.getElementById('boxSize').value = currentBoxSize;
    document.getElementById('paperSize').value = savedPaperSize || 'letter';
    
    // Set custom dimension fields
    document.getElementById('customBaseWidth').value = BOX_SIZES.custom.baseWidth;
    document.getElementById('customBaseHeight').value = BOX_SIZES.custom.baseHeight;
    document.getElementById('customTabHeight').value = BOX_SIZES.custom.tabHeight;
    
    // Show/hide custom fields based on selection
    updateCustomSizeVisibility();
    
    // Add event listeners
    document.getElementById('showSetIcons').addEventListener('change', (e) => {
        showSetIcons = e.target.value === 'true';
        localStorage.setItem('showSetIcons', showSetIcons);
    });
    
    document.getElementById('lineStyle').addEventListener('change', (e) => {
        lineStyle = e.target.value;
        localStorage.setItem('lineStyle', lineStyle);
    });
    
    document.getElementById('boxSize').addEventListener('change', (e) => {
        currentBoxSize = e.target.value;
        localStorage.setItem('boxSize', currentBoxSize);
        updateCustomSizeVisibility();
    });
    
    document.getElementById('paperSize').addEventListener('change', (e) => {
        localStorage.setItem('paperSize', e.target.value);
    });
    
    // Add listeners for custom dimension fields
    ['customBaseWidth', 'customBaseHeight', 'customTabHeight'].forEach(id => {
        document.getElementById(id).addEventListener('change', (e) => {
            updateCustomSizeDimensions();
            localStorage.setItem('customDimensions', JSON.stringify(BOX_SIZES.custom));
        });
    });
}

// Call initialize when the page loads
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    initializeSettings();
});