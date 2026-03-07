class CreatePostPage {
  constructor(page) {
    this.page = page;
    this.self = page.getByText('Self');
    this.createPostHeader = page.locator('div.create-post-header.ptr.cursor-pointer.sds-bg-primary-negative.ng-tns-c217-3');
    this.newPostCard = page.locator("div > div > post-templates > div > div:nth-child(1) > img");
    this.postTextArea = page.locator("div > quill-editor > div.ng-star-inserted.ql-container.ql-snow > div.ql-editor.ql-blank");
    this.postButton = page.locator('#dbx-overflow-span');
    this.audienceDropdown = page.getByRole('button', { name: /audience/i });
    this.audienceOptions = page.locator('div[role="listbox"] >> div[role="option"]');
    this.allowCommentsToggle = page.getByLabel('Allow Comments and Replies');
    this.postOnBehalfToggle = page.getByLabel('Post on Behalf of Company');
    this.templateSelector = page.locator('post-templates');
    this.urlInput = page.getByLabel(/url/i);
    this.pictureUploadInput = page.locator('input[type="file"]');
    this.posterTextInput = page.locator('textarea[placeholder*="poster text"], input[placeholder*="poster text"]');
    this.previewButton = page.getByRole('button', { name: /preview/i });
    this.previewContent = page.locator('div.preview-content');
    this.scheduledPostsList = page.locator('div.scheduled-posts-list');
    this.editScheduledPostButton = page.getByRole('button', { name: /edit scheduled post/i });
    this.cancelScheduledPostButton = page.getByRole('button', { name: /cancel scheduled post/i });
    this.errorMessage = page.locator('div.error-message');
    this.emojiButton = page.getByRole('button', { name: /emoji/i });
    this.emojiPicker = page.locator('div.emoji-picker');
    this.audienceQuickSuggestions = page.locator('div.audience-quick-suggestions');
    this.hashtagLink = page.locator('a.hashtag');
    this.nudgeExploreTemplates = page.getByText('Explore templates');
    this.nudgeLastContributed = page.getByText(/days since you last contributed/i);
  }

  async navigateToCreatePost(urlPath) {
  await this.page.waitForTimeout(20000);
    await this.page.locator('#stdDialog > div > div.main-wrapper > div.all-apps-wrapper > div.all-apps-icon-wrapper > div').click();
    await this.page.getByRole('textbox', { name: 'All Apps' }).click();
    await this.page.getByRole('textbox', { name: 'All Apps' }).fill('Vibe');
    await this.page.getByRole('link', { name: 'BETA VIBE' }).click();

  }

  async login(username, password) {
    await this.page.goto(process.env.BASE_URL + '/login');
    await this.page.getByLabel('Username').fill(username);
    await this.page.getByLabel('Password').fill(password);
    await this.page.getByRole('button', { name: 'Login' }).click();
    await this.page.waitForURL('**/dashboard/overview');
  }

  async openCreatePostFromMainFeed() {
     await this.page.waitForTimeout(20000);
    await this.self.click();
    await this.createPostHeader.click();
  }

  async openCreatePostFromGroup() {
    await this.page.goto(`${process.env.BASE_URL}/vibe/group/create-post`);
  }

  async selectAudience(audienceName) {
    await this.audienceDropdown.click();
    await this.page.getByRole('option', { name: audienceName }).click();
  }

  async isAudienceSelectionDisabled() {
    return await this.audienceDropdown.isDisabled();
  }

  async toggleAllowComments(shouldEnable) {
    const isChecked = await this.allowCommentsToggle.isChecked();
    if (isChecked !== shouldEnable) {
      await this.allowCommentsToggle.click();
    }
  }

  async togglePostOnBehalf(shouldEnable) {
    const isChecked = await this.postOnBehalfToggle.isChecked();
    if (isChecked !== shouldEnable) {
      await this.postOnBehalfToggle.click();
    }
  }

  async selectTemplate(templateName) {
    await this.page.getByRole('button', { name: /select template/i }).click();
    await this.page.getByRole('option', { name: templateName }).click();
  }

  async fillGoodReadsUrl(url) {
    await this.urlInput.fill(url);
  }

  async uploadPicture(filePath) {
    await this.pictureUploadInput.setInputFiles(filePath);
  }

  async fillPosterText(text) {
    await this.posterTextInput.fill(text);
  }

  async clickPostButton() {
    await this.postButton.click();
  }

  async isPostButtonEnabled() {
    return await this.postButton.isEnabled();
  }

  async clickPreviewButton() {
    await this.previewButton.click();
  }

  async getPreviewContent() {
    return await this.previewContent.textContent();
  }

  async uploadAttachment(filePath) {
    await this.pictureUploadInput.setInputFiles(filePath);
  }

  async getErrorMessage() {
    return await this.errorMessage.textContent();
  }

  async openAudienceSelection() {
    await this.audienceDropdown.click();
  }

  async getAudienceQuickSuggestions() {
    return await this.audienceQuickSuggestions.allTextContents();
  }

  async clickHashtag() {
    await this.hashtagLink.first().click();
  }

  async getHashtagText() {
    return await this.hashtagLink.first().textContent();
  }

  async openScheduledPosts() {
    await this.page.goto(`${process.env.BASE_URL}/vibe/scheduled-posts`);
  }

  async createScheduledPost(dateTime) {
    // Placeholder for scheduling post with dateTime
  }

  async editScheduledPost() {
    await this.editScheduledPostButton.click();
  }

  async cancelScheduledPost() {
    await this.cancelScheduledPostButton.click();
  }

  async isAllowCommentsToggleVisible() {
    return await this.allowCommentsToggle.isVisible();
  }

  async isPostOnBehalfToggleVisible() {
    return await this.postOnBehalfToggle.isVisible();
  }

  async isEmojiSelectionAvailable() {
    return await this.emojiButton.isVisible();
  }

  async openEmojiPicker() {
    await this.emojiButton.click();
  }

  async selectEmoji(emojiName) {
    await this.page.getByRole('button', { name: emojiName }).click();
  }

  async isNudgeExploreTemplatesVisible() {
    return await this.nudgeExploreTemplates.isVisible();
  }

  async isNudgeLastContributedVisible() {
    return await this.nudgeLastContributed.isVisible();
  }
}

module.exports = { CreatePostPage };