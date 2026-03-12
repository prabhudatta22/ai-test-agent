const fs = require("fs");
const path = require("path");

const INPUT_FILE = 'output/ui-controls.json';
const OUTPUT_DIR = "./pages/";

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR);
}

function toCamelCase(text) {

    if (!text) return null;

    return text
        .replace(/[^\w\s]/gi, "")
        .split(" ")
        .map((word, index) => {
            if (index === 0) return word.toLowerCase();
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join("");
}

function sanitizeName(name) {

    if (!name) return null;

    name = name.replace(/[^\w]/g, "");

    if (/^\d/.test(name)) {
        name = "el" + name;
    }

    return name;
}

function generateLocator(control) {

    // Normalize empty strings to null to make logic consistent
    const normalized = {
        ...control,
        id: control.id || null,
        role: control.role || null,
        name: control.name || null,
        type: control.type || null,
        text: (control.text && control.text.trim()) ? control.text : null,
        ariaLabel: (control.ariaLabel && control.ariaLabel.trim()) ? control.ariaLabel : null,
        placeholder: (control.placeholder && control.placeholder.trim()) ? control.placeholder : null,
        selector: (control.selector && control.selector.trim()) ? control.selector : null,
        tag: control.tag || null,
    };

    // Prefer stable / unique selectors first
    if (normalized.id) {
        return `page.locator(${JSON.stringify(`#${normalized.id}`)})`;
    }

    if (normalized.ariaLabel) {
        return `page.getByLabel(${JSON.stringify(normalized.ariaLabel)})`;
    }

    if (normalized.placeholder) {
        return `page.getByPlaceholder(${JSON.stringify(normalized.placeholder)})`;
    }

    // If role + accessible name is available, use that
    if (normalized.role && (normalized.name || normalized.text)) {
        const accName = normalized.name || normalized.text;
        return `page.getByRole(${JSON.stringify(normalized.role)}, { name: ${JSON.stringify(accName)} })`;
    }

    // Use explicit selector (often unique) before falling back to plain text
    if (normalized.selector) {
        return `page.locator(${JSON.stringify(normalized.selector)})`;
    }

    if (normalized.text) {
        return `page.getByText(${JSON.stringify(normalized.text)})`;
    }

    return null;
}

function generateControlName(control) {

    let baseName =
        control.text ||
        control.id ||
        control.name ||
        control.placeholder ||
        control.tag ||
        "element";

    baseName = sanitizeName(baseName);

    return toCamelCase(baseName);
}

function generateClassName(url) {

    const parts = url.split("/").filter(Boolean);

    const pageName = parts[parts.length - 1] || "page";

    return (
        pageName.charAt(0).toUpperCase() +
        pageName.slice(1) +
        "Page"
    );
}

function removeDuplicateControls(controls) {

    const seen = new Set();

    return controls.filter(control => {

        // Remove only *true duplicates* (same identity), not controls that happen
        // to share the same visible text.
        const keyObj = {
            tag: control.tag || null,
            id: control.id || null,
            role: control.role || null,
            name: control.name || null,
            type: control.type || null,
            text: (control.text && control.text.trim()) ? control.text : null,
            ariaLabel: (control.ariaLabel && control.ariaLabel.trim()) ? control.ariaLabel : null,
            placeholder: (control.placeholder && control.placeholder.trim()) ? control.placeholder : null,
            selector: (control.selector && control.selector.trim()) ? control.selector : null,
        };

        // If we have nothing useful, skip
        if (!keyObj.id && !keyObj.selector && !keyObj.text && !keyObj.placeholder && !keyObj.ariaLabel && !keyObj.role) {
            return false;
        }

        const key = JSON.stringify(keyObj);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function generatePOM() {

    const raw = fs.readFileSync(INPUT_FILE);
    const data = JSON.parse(raw);

    data.forEach(pageData => {

        const className = generateClassName(pageData.page);

        let controls = removeDuplicateControls(pageData.controls);

        let content = "";

        content += `class ${className} {\n\n`;
        content += `  constructor(page) {\n`;
        content += `    this.page = page;\n\n`;

        content += `    this.controls = {};\n`;

        const usedNames = new Set();

        controls.forEach(control => {

            const locator = generateLocator(control);

            if (!locator) return;

            let name = generateControlName(control);

            if (!name) name = "element";

            let originalName = name;
            let counter = 1;

            while (usedNames.has(name)) {
                name = `${originalName}${counter}`;
                counter++;
            }

            usedNames.add(name);

            content += `    this.controls.${name} = ${locator};\n`;

        });

        content += `  }\n\n`;

        content += `  /**\n`;
        content += `   * Get a Playwright Locator by the generated control name.\n`;
        content += `   * @example page.locator('...') usage: await allPage.locator('createapost').click();\n`;
        content += `   */\n`;
        content += `  locator(name) {\n`;
        content += `    const loc = this.controls[name];\n`;
        content += `    if (!loc) {\n`;
        content += `      throw new Error(\`Unknown control: \${name}. Known: \${Object.keys(this.controls).join(', ')}\`);\n`;
        content += `    }\n`;
        content += `    return loc;\n`;
        content += `  }\n\n`;

        content += `  async click(name, options) {\n`;
        content += `    await this.locator(name).click(options);\n`;
        content += `  }\n\n`;

        content += `  async fill(name, value, options) {\n`;
        content += `    await this.locator(name).fill(value, options);\n`;
        content += `  }\n\n`;

        content += `  async type(name, value, options) {\n`;
        content += `    await this.locator(name).type(value, options);\n`;
        content += `  }\n\n`;

        content += `  async text(name) {\n`;
        content += `    return await this.locator(name).textContent();\n`;
        content += `  }\n\n`;

        content += `  async isVisible(name) {\n`;
        content += `    return await this.locator(name).isVisible();\n`;
        content += `  }\n\n`;

        content += `}\n\n`;
        content += `module.exports = ${className};\n`;

        const filePath = path.join(OUTPUT_DIR, `${className}.js`);

        fs.writeFileSync(filePath, content);

        console.log(`Generated: ${filePath}`);

    });
}

generatePOM();

module.exports = { generatePOM }; 