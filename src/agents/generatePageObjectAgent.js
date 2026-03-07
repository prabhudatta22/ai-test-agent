const fs = require('fs');
const locators = require('../rules/vibe/locator.json');

function capitalize(str){
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function buildShadowLocator(shadowArray){

    let locator = `this.page.locator('${shadowArray[0]}')`;

    for(let i = 1; i < shadowArray.length; i++){
        locator += `.locator('${shadowArray[i]}')`;
    }

    return locator;
}

function generateLocator(name, config){

    const varName = `get${capitalize(name)}`;

    // Shadow DOM Support
    if(config.shadow && Array.isArray(config.shadow)){
        const shadowLocator = buildShadowLocator(config.shadow);
        return `        this.${varName} = ${shadowLocator};`;
    }

    if(config.id){
        return `        this.${varName} = this.page.locator('#${config.id}');`;
    }

    if(config.selector && config.xpath){
        return `        this.${varName} = this.page.locator('${config.selector}')
            .or(this.page.locator('xpath=${config.xpath}'));`;
    }

    if(config.xpath){
        return `        this.${varName} = this.page.locator('xpath=${config.xpath}');`;
    }

    if(config.selector){
        return `        this.${varName} = this.page.locator('${config.selector}');`;
    }

    return '';
}

function generateClass(locators){

    let locatorLines = '';

    for(const [name, config] of Object.entries(locators)){
        locatorLines += generateLocator(name, config) + '\n';
    }

    return `
export class GeneratedPageObject {
    constructor(page) {
        this.page = page;

${locatorLines}
    }
}
`;
}

//const classContent = generateClass(locators);

// Optional file write
// fs.writeFileSync('GeneratedPageObject.js', classContent);

//module.exports = { generateClass, generateLocator };

module.exports = {generateClass, generateLocator, buildShadowLocator };