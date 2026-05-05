/**
 * Shared DOM helpers for shader control panels (matches .slider-group in style.css).
 */

export function createRangeControl(labelText, { id, min, max, step, value }) {
    const wrap = document.createElement('div');
    wrap.className = 'slider-group';
    const label = document.createElement('label');
    label.htmlFor = id;
    label.textContent = labelText;
    const input = document.createElement('input');
    input.type = 'range';
    input.id = id;
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(value);
    wrap.append(label, input);
    return { group: wrap, input };
}

export function createCheckboxControl(labelText, id, checked = false) {
    const wrap = document.createElement('div');
    wrap.className = 'slider-group';
    const label = document.createElement('label');
    label.htmlFor = id;
    label.textContent = labelText;
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = id;
    input.checked = checked;
    wrap.append(label, input);
    return { group: wrap, input };
}
