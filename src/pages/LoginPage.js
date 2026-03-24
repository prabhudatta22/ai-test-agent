const { expect } = require('@playwright/test');

const baseURL = 'https://instance8.darwinbox.in/';
const loginUrl = `${baseURL}user/login`;
const credentials = {
    username: '60',
    password: 'tnBYZgjAQsEAZYsk1@'
};
class LoginPage {

    constructor(page) {
        this.page = page;

        //this.singleSignon = this.page.locator("xpath=.//*[@class='signinDarwin']");
        this.userId = this.page.locator("xpath=//*[@id='UserLogin_username']");
        this.password = this.page.locator("xpath=//*[@id='UserLogin_password']");
        this.loginButton = this.page.locator("xpath=//*[@name='login-submit']")

    }

    async loginToApp(page) {
        await this.goToApp(page);
         await page.fill('#UserLogin_username', credentials.username);
        await page.fill('#UserLogin_password', credentials.password);
        await page.click('[name="login-submit"]');
        await page.waitForTimeout(3000);
    }

    async goToApp(page) {
        //var url = testData[0].url;
        console.log('Loging in to>> ',baseURL);
        await this.page.goto(baseURL, { waitUntil: 'networkidle' }, { timeout: 30000 });
        //await this.page.waitForNavigation();
    }

    async navigateToModule(moduleName, page) {
    await page.locator('#stdDialog > div > div.main-wrapper > div.all-apps-wrapper > div.all-apps-icon-wrapper > div > dbx-svg-wrapper > svg').first().click();
    await page.getByRole('textbox', { name: 'All Apps' }).click();
    await page.getByRole('textbox', { name: 'All Apps' }).fill('vibe');
    await page.getByRole('link', { name: moduleName }).click();

}

}

module.exports = { LoginPage };