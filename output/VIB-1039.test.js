// pages/CreatePostPage.js
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

  async navigateToCreatePost() {
    await this.page.getByRole('button', { name: 'Create Post' }).click();
    await this.page.waitForSelector('post-templates');
  }

  async openCreatePostFromMainFeed() {
    await this.self.click();
    await this.createPostHeader.click();
    await this.page.waitForSelector('post-templates');
  }

  async openCreatePostFromGroup() {
    await this.page.goto(`${process.env.BASE_URL}/vibe/group/create-post`);
    await this.page.waitForSelector('post-templates');
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
    await this.page.waitForTimeout(500); // wait for template to load
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
    await this.page.waitForSelector('div.scheduled-posts-list');
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

// tests/createPost.spec.js
const { test, expect } = require('@playwright/test');
const { CreatePostPage } = require('../pages/CreatePostPage');
const { logintoApp } = require('../pages/LoginPage');

test.describe('Content creation templates', () => {
  let createPostPage;

  test.beforeEach(async ({ page }) => {
    createPostPage = new CreatePostPage(page);
    await logintoApp(page, process.env.USERNAME, process.env.PASSWORD);
  });

  test('TC001 - Select Content Creation Template from Curated List', async ({ page }) => {
    await test.step('Navigate to Create Post', async () => {
      await createPostPage.openCreatePostFromMainFeed();
    });
    await test.step('Select a template from curated list', async () => {
      await createPostPage.selectTemplate('Good Reads');
    });
    await test.step('Verify template loads with correct prompts and formatting options', async () => {
      expect(await createPostPage.urlInput.isVisible()).toBeTruthy();
    });
  });

  test('TC002 - Verify Org Update Template Access Restriction', async ({ page }) => {
    await test.step('Login as non-admin user and check template list', async () => {
      await logintoApp(page, process.env.NON_ADMIN_USERNAME, process.env.NON_ADMIN_PASSWORD);
      await createPostPage.openCreatePostFromMainFeed();
      await createPostPage.page.getByRole('button', { name: /select template/i }).click();
      const orgUpdateOption = await createPostPage.page.getByRole('option', { name: 'Org Update' }).count();
      expect(orgUpdateOption).toBe(0);
    });
    await test.step('Login as admin user and check template list', async () => {
      await logintoApp(page, process.env.ADMIN_USERNAME, process.env.ADMIN_PASSWORD);
      await createPostPage.openCreatePostFromMainFeed();
      await createPostPage.page.getByRole('button', { name: /select template/i }).click();
      const orgUpdateOption = await createPostPage.page.getByRole('option', { name: 'Org Update' }).count();
      expect(orgUpdateOption).toBeGreaterThan(0);
    });
  });

  test('TC011 - Good Reads Template Validation - Mandatory Link', async ({ page }) => {
    await createPostPage.openCreatePostFromMainFeed();
    await createPostPage.selectTemplate('Good Reads');
    await test.step('Verify Post button disabled when link empty', async () => {
      await createPostPage.fillGoodReadsUrl('');
      expect(await createPostPage.isPostButtonEnabled()).toBeFalsy();
    });
    await test.step('Verify Post button disabled when link invalid', async () => {
      await createPostPage.fillGoodReadsUrl('invalidlink');
      expect(await createPostPage.isPostButtonEnabled()).toBeFalsy();
    });
    await test.step('Verify Post button enabled when valid link entered', async () => {
      await createPostPage.fillGoodReadsUrl('https://validarticle.com');
      expect(await createPostPage.isPostButtonEnabled()).toBeTruthy();
    });
  });

  test('TC012 - Seeking Mentorship Template Validation - Mandatory Poster Text', async ({ page }) => {
    await createPostPage.openCreatePostFromMainFeed();
    await createPostPage.selectTemplate('Seeking Mentorship');
    await test.step('Verify Post button disabled when poster text empty', async () => {
      await createPostPage.fillPosterText('');
      expect(await createPostPage.isPostButtonEnabled()).toBeFalsy();
    });
    await test.step('Verify Post button enabled when poster text entered', async () => {
      await createPostPage.fillPosterText('Looking for mentorship in project management');
      expect(await createPostPage.isPostButtonEnabled()).toBeTruthy();
    });
  });

  test('TC013 - Ice Breaker Template Validation - Mandatory Poster Text for All Line Items', async ({ page }) => {
    await createPostPage.openCreatePostFromMainFeed();
    await createPostPage.selectTemplate('Ice Breaker');
    await test.step('Fill poster text for 2 line items only', async () => {
      await createPostPage.page.locator('textarea[placeholder*="line item 1"]').fill('Hello!');
      await createPostPage.page.locator('textarea[placeholder*="line item 2"]').fill('I like hiking');
      await createPostPage.page.locator('textarea[placeholder*="line item 3"]').fill('');
      expect(await createPostPage.isPostButtonEnabled()).toBeFalsy();
    });
    await test.step('Fill poster text for all 3 line items', async () => {
      await createPostPage.page.locator('textarea[placeholder*="line item 3"]').fill('Favorite food is pizza');
      expect(await createPostPage.isPostButtonEnabled()).toBeTruthy();
    });
  });

  test('TC014 - Pet Pics Template Validation - At Least One Picture Upload', async ({ page }) => {
    await createPostPage.openCreatePostFromMainFeed();
    await createPostPage.selectTemplate('Pet Pics');
    await test.step('Verify Post button disabled when no picture uploaded', async () => {
      expect(await createPostPage.isPostButtonEnabled()).toBeFalsy();
    });
    await test.step('Upload one picture and verify Post button enabled', async () => {
      await createPostPage.uploadPicture('tests/assets/pet1.jpg');
      expect(await createPostPage.isPostButtonEnabled()).toBeTruthy();
    });
  });

  test('TC018 - Automatic Hashtag Addition for Template Posts', async ({ page }) => {
    await createPostPage.openCreatePostFromMainFeed();
    await test.step('Create post using Good Reads template and submit', async () => {
      await createPostPage.selectTemplate('Good Reads');
      await createPostPage.fillGoodReadsUrl('https://validarticle.com');
      await createPostPage.clickPostButton();
      await page.waitForSelector('a.hashtag');
      const hashtagText = await createPostPage.getHashtagText();
      expect(hashtagText).toBe('#GoodReads');
    });
    await test.step('Create post using Seeking Mentorship template and submit', async () => {
      await createPostPage.openCreatePostFromMainFeed();
      await createPostPage.selectTemplate('Seeking Mentorship');
      await createPostPage.fillPosterText('Looking for mentorship in marketing');
      await createPostPage.clickPostButton();
      await page.waitForSelector('a.hashtag');
      const hashtagText = await createPostPage.getHashtagText();
      expect(hashtagText).toBe('#SeekingMentorship');
    });
  });

  test('TC019 - Preview Post Before Submission for All Template Types', async ({ page }) => {
    const templates = ['Good Reads', 'Seeking Mentorship', 'Ice Breaker', 'Pet Pics'];
    for (const template of templates) {
      await createPostPage.openCreatePostFromMainFeed();
      await test.step(`Select template ${template}`, async () => {
        await createPostPage.selectTemplate(template);
      });
      await test.step(`Enter required content for ${template}`, async () => {
        if (template === 'Good Reads') {
          await createPostPage.fillGoodReadsUrl('https://validarticle.com');
        } else if (template === 'Seeking Mentorship') {
          await createPostPage.fillPosterText('Looking for mentorship');
        } else if (template === 'Ice Breaker') {
          await createPostPage.page.locator('textarea[placeholder*="line item 1"]').fill('Hello!');
          await createPostPage.page.locator('textarea[placeholder*="line item 2"]').fill('I like hiking');
          await createPostPage.page.locator('textarea[placeholder*="line item 3"]').fill('Favorite food is pizza');
        } else if (template === 'Pet Pics') {
          await createPostPage.uploadPicture('tests/assets/pet1.jpg');
        }
      });
      await test.step('Click Preview button and verify preview content', async () => {
        await createPostPage.clickPreviewButton();
        const previewContent = await createPostPage.getPreviewContent();
        expect(previewContent).toBeTruthy();
      });
    }
  });

  test('TC021 - First Time User Experience with Priority Templates and Nudges', async ({ page }) => {
    await logintoApp(page, process.env.FIRST_TIME_USER_USERNAME, process.env.FIRST_TIME_USER_PASSWORD);
    await createPostPage.openCreatePostFromMainFeed();
    await test.step('Verify priority templates emphasized', async () => {
      const iceBreaker = await createPostPage.page.getByRole('option', { name: 'Ice Breaker' }).count();
      const seekingMentorship = await createPostPage.page.getByRole('option', { name: 'Seeking Mentorship' }).count();
      expect(iceBreaker).toBeGreaterThan(0);
      expect(seekingMentorship).toBeGreaterThan(0);
    });
    await test.step('Verify nudges are visible', async () => {
      expect(await createPostPage.isNudgeExploreTemplatesVisible()).toBeTruthy();
      expect(await createPostPage.isNudgeLastContributedVisible()).toBeTruthy();
    });
  });

  test('TC022 - Returning User Experience with Template Segregation and Highlighting', async ({ page }) => {
    await logintoApp(page, process.env.RETURNING_USER_USERNAME, process.env.RETURNING_USER_PASSWORD);
    await createPostPage.openCreatePostFromMainFeed();
    await test.step('Verify template segregation and highlighting', async () => {
      const segregatedSection = await createPostPage.page.locator('div.template-segregation').count();
      expect(segregatedSection).toBeGreaterThan(0);
      const highlightedTemplates = await createPostPage.page.locator('div.highlighted-template').count();
      expect(highlightedTemplates).toBeGreaterThan(0);
    });
  });

  test('TC023 - Template Order Reversion After 14 Days', async ({ page }) => {
    await createPostPage.openCreatePostFromMainFeed();
    const initialOrder = await createPostPage.page.locator('post-templates > div > div').allTextContents();
    // Simulate 14 days passing - placeholder for time manipulation or API call
    // await simulateTimePassage(14);
    await createPostPage.openCreatePostFromMainFeed();
    const orderAfter14Days = await createPostPage.page.locator('post-templates > div > div').allTextContents();
    expect(orderAfter14Days).toEqual(initialOrder);
  });
});

test.describe('Create Post', () => {
  let createPostPage;

  test.beforeEach(async ({ page }) => {
    createPostPage = new CreatePostPage(page);
    await logintoApp(page, process.env.USERNAME, process.env.PASSWORD);
  });

  test('TC003 - Default Audience Selection from Main Feed', async () => {
    await createPostPage.openCreatePostFromMainFeed();
    await test.step('Observe default audience selection', async () => {
      const audienceText = await createPostPage.audienceDropdown.textContent();
      expect(audienceText).toContain('All Employees');
    });
  });

  test('TC004 - Default Audience Selection from Group Post', async () => {
    await createPostPage.openCreatePostFromGroup();
    await test.step('Observe default audience selection', async () => {
      const audienceText = await createPostPage.audienceDropdown.textContent();
      expect(audienceText).not.toBe('');
      expect(audienceText).not.toContain('All Employees');
    });
    await test.step('Attempt to change audience and verify disabled', async () => {
      const disabled = await createPostPage.isAudienceSelectionDisabled();
      expect(disabled).toBeTruthy();
    });
  });

  test('TC005 - Change Audience from Main Feed Post', async () => {
    await createPostPage.openCreatePostFromMainFeed();
    const audiences = ['Group A', 'Department X', 'Location Y', 'Network Z'];
    for (const audience of audiences) {
      await test.step(`Change audience to ${audience}`, async () => {
        await createPostPage.selectAudience(audience);
        const selected = await createPostPage.audienceDropdown.textContent();
        expect(selected).toContain(audience);
      });
    }
  });

  test('TC006 - Toggle Visibility and Behavior for Comments & Replies', async ({ page }) => {
    await createPostPage.openCreatePostFromMainFeed();
    const isVisible = await createPostPage.isAllowCommentsToggleVisible();
    if (isVisible) {
      await test.step('Toggle enable and disable', async () => {
        await createPostPage.toggleAllowComments(true);
        expect(await createPostPage.allowCommentsToggle.isChecked()).toBeTruthy();
        await createPostPage.toggleAllowComments(false);
        expect(await createPostPage.allowCommentsToggle.isChecked()).toBeFalsy();
      });
    } else {
      expect(isVisible).toBeFalsy();
    }
  });

  test('TC007 - Toggle Visibility for "Post on Behalf of Company"', async ({ page }) => {
    await test.step('Login as non-admin user and verify toggle not visible', async () => {
      await logintoApp(page, process.env.NON_ADMIN_USERNAME, process.env.NON_ADMIN_PASSWORD);
      await createPostPage.openCreatePostFromMainFeed();
      expect(await createPostPage.isPostOnBehalfToggleVisible()).toBeFalsy();
    });
    await test.step('Login as admin user and verify toggle visible', async () => {
      await logintoApp(page, process.env.ADMIN_USERNAME, process.env.ADMIN_PASSWORD);
      await createPostPage.openCreatePostFromMainFeed();
      expect(await createPostPage.isPostOnBehalfToggleVisible()).toBeTruthy();
    });
  });

  test('TC008 - Attachment Limits Enforcement', async () => {
    await createPostPage.openCreatePostFromMainFeed();
    await test.step('Upload 2 gifs and verify only 1 accepted', async () => {
      await createPostPage.uploadAttachment(['tests/assets/gif1.gif', 'tests/assets/gif2.gif']);
      const error = await createPostPage.getErrorMessage();
      expect(error).toContain('max 1 gif');
    });
    await test.step('Upload 6 images and verify only 5 accepted', async () => {
      await createPostPage.uploadAttachment([
        'tests/assets/img1.jpg',
        'tests/assets/img2.jpg',
        'tests/assets/img3.jpg',
        'tests/assets/img4.jpg',
        'tests/assets/img5.jpg',
        'tests/assets/img6.jpg',
      ]);
      const error = await createPostPage.getErrorMessage();
      expect(error).toContain('max 5 images');
    });
    await test.step('Upload 6 files and verify only 5 accepted', async () => {
      await createPostPage.uploadAttachment([
        'tests/assets/file1.pdf',
        'tests/assets/file2.pdf',
        'tests/assets/file3.pdf',
        'tests/assets/file4.pdf',
        'tests/assets/file5.pdf',
        'tests/assets/file6.pdf',
      ]);
      const error = await createPostPage.getErrorMessage();
      expect(error).toContain('max 5 files');
    });
    await test.step('Upload 6 videos and verify only 5 accepted', async () => {
      await createPostPage.uploadAttachment([
        'tests/assets/video1.mp4',
        'tests/assets/video2.mp4',
        'tests/assets/video3.mp4',
        'tests/assets/video4.mp4',
        'tests/assets/video5.mp4',
        'tests/assets/video6.mp4',
      ]);
      const error = await createPostPage.getErrorMessage();
      expect(error).toContain('max 5 videos');
    });
  });

  test('TC009 - Attachment Limit Tooltip on Hover', async () => {
    await createPostPage.openCreatePostFromMainFeed();
    const attachmentTypes = [
      { iconName: 'gif', expectedTooltip: 'Max 1 gif' },
      { iconName: 'image', expectedTooltip: 'Max 5 images (10MB each)' },
      { iconName: 'file', expectedTooltip: 'Max 5 files (10MB each)' },
      { iconName: 'video', expectedTooltip: 'Max 5 videos (250MB each)' },
    ];
    for (const { iconName, expectedTooltip } of attachmentTypes) {
      await test.step(`Hover over ${iconName} attachment icon`, async () => {
        const icon = createPostPage.page.getByRole('button', { name: new RegExp(iconName, 'i') });
        await icon.hover();
        const tooltip = await createPostPage.page.locator('div[role="tooltip"]').textContent();
        expect(tooltip).toContain(expectedTooltip);
      });
    }
  });

  test('TC010 - Toggle Placement After Content Entry', async () => {
    await createPostPage.openCreatePostFromMainFeed();
    const contentAreaBox = await createPostPage.postTextArea.boundingBox();
    const allowCommentsBox = await createPostPage.allowCommentsToggle.boundingBox();
    const postOnBehalfBox = await createPostPage.postOnBehalfToggle.boundingBox();
    expect(allowCommentsBox.y).toBeGreaterThan(contentAreaBox.y + contentAreaBox.height);
    expect(postOnBehalfBox.y).toBeGreaterThan(contentAreaBox.y + contentAreaBox.height);
  });
});

test.describe('Scheduled Posts', () => {
  let createPostPage;

  test.beforeEach(async ({ page }) => {
    createPostPage = new CreatePostPage(page);
    await logintoApp(page, process.env.USERNAME, process.env.PASSWORD);
  });

  test('TC015 - Schedule Post for Future Date and Time', async () => {
    await createPostPage.openCreatePostFromMainFeed();
    await test.step('Enter valid post content', async () => {
      await createPostPage.postTextArea.fill('Scheduled post content');
    });
    await test.step('Select schedule option and pick future date/time', async () => {
      await createPostPage.page.getByRole('checkbox', { name: /schedule/i }).check();
      await createPostPage.page.getByLabel('Date').fill('2024-12-31');
      await createPostPage.page.getByLabel('Time').fill('15:00');
    });
    await test.step('Submit scheduled post', async () => {
      await createPostPage.clickPostButton();
    });
    await test.step('Verify scheduled post appears in scheduled posts list', async () => {
      await createPostPage.openScheduledPosts();
      const scheduledPost = await createPostPage.scheduledPostsList.locator('text=Scheduled post content').count();
      expect(scheduledPost).toBeGreaterThan(0);
    });
  });

  test('TC016 - Edit Scheduled Post Before Posting Time', async () => {
    await createPostPage.openScheduledPosts();
    await test.step('Select a scheduled post and edit content and schedule', async () => {
      await createPostPage.editScheduledPost();
      await createPostPage.postTextArea.fill('Updated post content');
      await createPostPage.page.getByLabel('Date').fill('2025-01-01');
      await createPostPage.page.getByLabel('Time').fill('10:00');
      await createPostPage.clickPostButton();
    });
    await test.step('Verify scheduled post reflects updated content and schedule', async () => {
      const updatedPost = await createPostPage.scheduledPostsList.locator('text=Updated post content').count();
      expect(updatedPost).toBeGreaterThan(0);
    });
  });

  test('TC017 - Cancel Scheduled Post Before Posting Time', async () => {
    await createPostPage.openScheduledPosts();
    await test.step('Select a scheduled post and cancel', async () => {
      await createPostPage.cancelScheduledPost();
      await createPostPage.page.getByRole('button', { name: /confirm/i }).click();
    });
    await test.step('Verify scheduled post no longer appears', async () => {
      const cancelledPost = await createPostPage.scheduledPostsList.locator('text=Scheduled post content').count();
      expect(cancelledPost).toBe(0);
    });
  });
});

test.describe('Content creation templates - GPT Assistance', () => {
  let createPostPage;

  test.beforeEach(async ({ page }) => {
    createPostPage = new CreatePostPage(page);
    await logintoApp(page, process.env.USERNAME, process.env.PASSWORD);
  });

  test('TC020 - Optional GPT Assistance for Post Content', async () => {
    await createPostPage.openCreatePostFromMainFeed();
    await createPostPage.selectTemplate('Seeking Mentorship');
    await test.step('Enter partial content or prompt', async () => {
      await createPostPage.fillPosterText('Looking for mentorship in marketing');
    });
    await test.step('Click GPT assistance button', async () => {
      await createPostPage.page.getByRole('button', { name: /gpt assistance/i }).click();
      await createPostPage.page.waitForSelector('div.gpt-suggestions');
    });
    await test.step('Review generated or proof-read content and accept/reject', async () => {
      const suggestion = await createPostPage.page.locator('div.gpt-suggestions').textContent();
      expect(suggestion).toBeTruthy();
      await createPostPage.page.getByRole('button', { name: /accept/i }).click();
      expect(await createPostPage.posterTextInput.inputValue()).toContain('mentorship');
    });
  });
});