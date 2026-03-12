/* frontend/js/charts.js */
// A simple script to render dummy charts drawing on a canvas using plain JS
// to simulate chart libraries without dependencies.

document.addEventListener('DOMContentLoaded', () => {
    const attendanceCanvas = document.getElementById('attendanceChart');
    const engagementCanvas = document.getElementById('engagementChart');

    if (attendanceCanvas) {
        setupResponsiveChart(attendanceCanvas, drawBarChart, [85, 92, 78, 95, 88], ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
    }

    if (engagementCanvas) {
        setupResponsiveChart(engagementCanvas, drawLineChart, [60, 65, 80, 75, 90, 85, 95], ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7']);
    }
});

function setupResponsiveChart(canvas, drawFn, data, labels) {
    const container = canvas.parentElement;
    
    const resizeAndDraw = () => {
        const rect = container.getBoundingClientRect();
        if(rect.width === 0) return; // Prevent drawing if hidden
        // Match internal resolution to actual size
        canvas.width = rect.width;
        canvas.height = rect.height || 300;
        drawFn(canvas, data, labels);
    };

    // Initial draw
    resizeAndDraw();

    // Redraw on resize
    const observer = new ResizeObserver(() => {
        resizeAndDraw();
    });
    observer.observe(container);
}

function drawBarChart(canvas, data, labels) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw axes
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw bars
    const maxVal = Math.max(...data, 100);
    const barWidth = (width - padding * 2) / data.length - 20;
    
    data.forEach((val, i) => {
        const barHeight = ((height - padding * 2) * val) / maxVal;
        const x = padding + 10 + i * (barWidth + 20);
        const y = height - padding - barHeight;
        
        // Gradient
        const gradient = ctx.createLinearGradient(0, y, 0, height - padding);
        gradient.addColorStop(0, '#3b82f6');
        gradient.addColorStop(1, '#60a5fa');
        
        ctx.fillStyle = gradient;
        
        // Rounded top rect
        const radius = 6;
        ctx.beginPath();
        ctx.moveTo(x, y + radius);
        ctx.lineTo(x, height - padding);
        ctx.lineTo(x + barWidth, height - padding);
        ctx.lineTo(x + barWidth, y + radius);
        ctx.quadraticCurveTo(x + barWidth, y, x + barWidth - radius, y);
        ctx.lineTo(x + radius, y);
        ctx.quadraticCurveTo(x, y, x, y + radius);
        ctx.fill();
        
        // Labels
        ctx.fillStyle = '#64748b';
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(labels[i], x + barWidth / 2, height - padding + 20);
    });
}

function drawLineChart(canvas, data, labels) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;
    
    ctx.clearRect(0, 0, width, height);
    
    // Draw horizontal grid lines
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = padding + (i * (height - padding * 2) / 4);
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
    }
    
    // Draw axes
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    const maxVal = Math.max(...data, 100);
    const xStep = (width - padding * 2) / (data.length - 1);
    
    // Draw line
    ctx.beginPath();
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    
    // Create fill path
    const fillPath = new Path2D();
    fillPath.moveTo(padding, height - padding);
    
    data.forEach((val, i) => {
        const x = padding + i * xStep;
        const y = height - padding - ((height - padding * 2) * val) / maxVal;
        
        if (i === 0) {
            ctx.moveTo(x, y);
            fillPath.lineTo(x, y);
        } else {
            // Smooth curve (Bezier)
            const prevX = padding + (i - 1) * xStep;
            const prevY = height - padding - ((height - padding * 2) * data[i - 1]) / maxVal;
            const cp1X = prevX + xStep / 2;
            const cp2X = x - xStep / 2;
            
            ctx.bezierCurveTo(cp1X, prevY, cp2X, y, x, y);
            fillPath.bezierCurveTo(cp1X, prevY, cp2X, y, x, y);
        }
        
        // Label
        ctx.fillStyle = '#64748b';
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'center';
        // Only show every other label if many points
        if (data.length <= 7 || i % 2 === 0) {
            ctx.fillText(labels[i], x, height - padding + 20);
        }
    });
    
    ctx.stroke();
    
    // Fill under line
    fillPath.lineTo(padding + (data.length - 1) * xStep, height - padding);
    fillPath.closePath();
    
    const fillGradient = ctx.createLinearGradient(0, padding, 0, height - padding);
    fillGradient.addColorStop(0, 'rgba(59, 130, 246, 0.2)');
    fillGradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
    
    ctx.fillStyle = fillGradient;
    ctx.fill(fillPath);
    
    // Draw points
    data.forEach((val, i) => {
        const x = padding + i * xStep;
        const y = height - padding - ((height - padding * 2) * val) / maxVal;
        
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.stroke();
    });
}
