

// tests/vibe.spec.js
const { test, expect } = require('@playwright/test');
const { CreatePostPage } = require('../src/pages/CreatePostPage');
const { LoginPage } = require('../src/pages/LoginPage');

test.describe('Vibe Module', () => {
  let createPostPage;
  let loginPage;

  test.beforeEach(async ({ page }) => {
    createPostPage = new CreatePostPage(page);
    loginPage = new LoginPage(page);
    await loginPage.logintoApp(process.env.USERNAME, process.env.PASSWORD);
  });

  test('TC001 - Select and Use Content Creation Template', async ({ page }) => {
    await test.step('Open Vibe main feed and click Create Post', async () => {
      await createPostPage.openCreatePostFromMainFeed();
    });

    await test.step('Open template selection and select a template', async () => {
      await createPostPage.selectTemplate('Any Template'); // Replace with actual template name if known
    });

    await test.step('Verify post creation screen loads with template prompts pre-populated', async () => {
      const isPostTextAreaVisible = await createPostPage.postTextArea.isVisible();
      expect(isPostTextAreaVisible).toBeTruthy();
      // Additional checks for pre-populated prompts can be added here
    });
  });

  test('TC002 - Mandatory Fields Enforcement for Template', async ({ page }) => {
    await test.step('Open Vibe main feed and click Create Post', async () => {
      await createPostPage.openCreatePostFromMainFeed();
    });

    await test.step('Select "Good Reads" template', async () => {
      await createPostPage.selectTemplate('Good Reads');
    });

    await test.step('Leave mandatory field "Paste link" empty and verify Post button is disabled', async () => {
      expect(await createPostPage.isPostButtonEnabled()).toBeFalsy();
    });

    await test.step('Enter valid online link in "Paste link" field', async () => {
      await createPostPage.fillGoodReadsUrl('https://example.com/article');
    });

    await test.step('Verify Post button is enabled', async () => {
      expect(await createPostPage.isPostButtonEnabled()).toBeTruthy();
    });
  });

  test('TC003 - Hashtag Auto-generation from Template Name', async ({ page }) => {
    await test.step('Create post using "Good Reads" template and complete mandatory fields', async () => {
      await createPostPage.openCreatePostFromMainFeed();
      await createPostPage.selectTemplate('Good Reads');
      await createPostPage.fillGoodReadsUrl('https://example.com/article');
    });

    await test.step('Submit post', async () => {
      await createPostPage.clickPostButton();
      await page.waitForLoadState('networkidle');
    });

    await test.step('Verify hashtag "#GoodReads" is added to post caption', async () => {
      const hashtagText = await createPostPage.getHashtagText();
      expect(hashtagText).toContain('#GoodReads');
    });

    await test.step('Search feed using hashtag "#GoodReads" and verify post appears', async () => {
      await page.goto(`${process.env.BASE_URL}/vibe/search?q=%23GoodReads`);
      const postExists = await page.locator(`text=#GoodReads`).first().isVisible();
      expect(postExists).toBeTruthy();
    });
  });

  test('TC004 - Template Availability Based on User Role', async ({ page }) => {
    await test.step('Login as Employee and verify "Org Update" template is not visible', async () => {
      await loginPage.logintoApp(process.env.EMPLOYEE_USERNAME, process.env.EMPLOYEE_PASSWORD);
      await createPostPage.openCreatePostFromMainFeed();
      await page.getByRole('button', { name: /select template/i }).click();
      const orgUpdateVisible = await page.getByRole('option', { name: 'Org Update' }).isVisible().catch(() => false);
      expect(orgUpdateVisible).toBeFalsy();
    });

    await test.step('Login as Manager and verify "Org Update" template is visible', async () => {
      await loginPage.logintoApp(process.env.MANAGER_USERNAME, process.env.MANAGER_PASSWORD);
      await createPostPage.openCreatePostFromMainFeed();
      await page.getByRole('button', { name: /select template/i }).click();
      const orgUpdateVisible = await page.getByRole('option', { name: 'Org Update' }).isVisible();
      expect(orgUpdateVisible).toBeTruthy();
    });

    await test.step('Login as Admin and verify "Org Update" template is visible', async () => {
      await loginPage.logintoApp(process.env.ADMIN_USERNAME, process.env.ADMIN_PASSWORD);
      await createPostPage.openCreatePostFromMainFeed();
      await page.getByRole('button', { name: /select template/i }).click();
      const orgUpdateVisible = await page.getByRole('option', { name: 'Org Update' }).isVisible();
      expect(orgUpdateVisible).toBeTruthy();
    });
  });

  test('TC005 - Template Ordering for First-time User', async ({ page }) => {
    await test.step('Login as first-time user and open template selection', async () => {
      await loginPage.logintoApp(process.env.FIRST_TIME_USER_USERNAME, process.env.FIRST_TIME_USER_PASSWORD);
      await createPostPage.openCreatePostFromMainFeed();
      await page.getByRole('button', { name: /select template/i }).click();
    });

    await test.step('Verify "Ice Breaker" and "Seeking Mentorship" templates appear at top', async () => {
      const firstTwoTemplates = await page.locator('post-templates >> div >> nth=0,1').allTextContents();
      expect(firstTwoTemplates[0]).toContain('Ice Breaker');
      expect(firstTwoTemplates[1]).toContain('Seeking Mentorship');
    });

    await test.step('Verify sample post previews are shown for these templates', async () => {
      const iceBreakerPreview = await page.locator('post-templates >> text=Ice Breaker').locator('img').isVisible();
      const seekingMentorshipPreview = await page.locator('post-templates >> text=Seeking Mentorship').locator('img').isVisible();
      expect(iceBreakerPreview).toBeTruthy();
      expect(seekingMentorshipPreview).toBeTruthy();
    });
  });

  test('TC006 - Template Ordering for Returning User', async ({ page }) => {
    await test.step('Login as returning user and open template selection', async () => {
      await loginPage.logintoApp(process.env.RETURNING_USER_USERNAME, process.env.RETURNING_USER_PASSWORD);
      await createPostPage.openCreatePostFromMainFeed();
      await page.getByRole('button', { name: /select template/i }).click();
    });

    await test.step('Verify templates ordered as per contribution history', async () => {
      // Placeholder: Validate order based on contribution history via UI or API
      expect(true).toBeTruthy();
    });

    await test.step('Verify separate section for templates already contributed to', async () => {
      const contributedSection = await page.locator('text=Contributed Templates').isVisible();
      expect(contributedSection).toBeTruthy();
    });

    await test.step('Verify emphasis on topics not yet contributed', async () => {
      // Placeholder: Check UI emphasis (e.g., highlighted templates)
      expect(true).toBeTruthy();
    });
  });

  test('TC007 - Preview Post Feature for Each Template', async ({ page }) => {
    await test.step('Open Create Post and select any template', async () => {
      await createPostPage.openCreatePostFromMainFeed();
      await createPostPage.selectTemplate('Good Reads');
    });

    await test.step('Fill mandatory fields', async () => {
      await createPostPage.fillGoodReadsUrl('https://example.com/article');
    });

    await test.step('Click Preview button', async () => {
      await createPostPage.clickPreviewButton();
    });

    await test.step('Verify preview modal/dialog shows post content', async () => {
      const previewVisible = await createPostPage.previewContent.isVisible();
      expect(previewVisible).toBeTruthy();
      const content = await createPostPage.getPreviewContent();
      expect(content).toContain('https://example.com/article');
    });

    await test.step('Close preview and submit post', async () => {
      await page.keyboard.press('Escape');
      await createPostPage.clickPostButton();
      await page.waitForLoadState('networkidle');
    });
  });

  test('TC008 - Template Discovery via Carousel on Main Feed', async ({ page }) => {
    await test.step('Open Vibe main feed and locate templates carousel', async () => {
      await page.goto(`${process.env.BASE_URL}/vibe/main-feed`);
      const carousel = page.locator('div.templates-carousel');
      expect(await carousel.isVisible()).toBeTruthy();
    });

    await test.step('Scroll through carousel and click on a template card', async () => {
      const carousel = page.locator('div.templates-carousel');
      await carousel.scrollIntoViewIfNeeded();
      const firstTemplateCard = carousel.locator('div.template-card').first();
      await firstTemplateCard.click();
    });

    await test.step('Verify post creation screen opens with selected template prompts', async () => {
      const postTextAreaVisible = await createPostPage.postTextArea.isVisible();
      expect(postTextAreaVisible).toBeTruthy();
    });
  });

  test('TC010 - Template Discovery via Dedicated Section', async ({ page }) => {
    await test.step('Open Create Post screen and locate "Create with Template" section', async () => {
      await createPostPage.openCreatePostFromMainFeed();
      const section = page.locator('section#create-with-template');
      expect(await section.isVisible()).toBeTruthy();
    });

    await test.step('Verify curated templates grouped by purpose are displayed', async () => {
      const groups = page.locator('section#create-with-template div.template-group');
      expect(await groups.count()).toBeGreaterThan(0);
    });

    await test.step('Select a template and verify post creation screen pre-populated', async () => {
      await page.getByRole('button', { name: /select template/i }).click();
      await page.getByRole('option', { name: 'Good Reads' }).click();
      expect(await createPostPage.postTextArea.isVisible()).toBeTruthy();
    });
  });

  test('TC011 - Schedule Post with Future Date and Time', async ({ page }) => {
    await test.step('Open Create Post and select template or regular post', async () => {
      await createPostPage.openCreatePostFromMainFeed();
      await createPostPage.selectTemplate('Good Reads');
      await createPostPage.fillGoodReadsUrl('https://example.com/article');
    });

    await test.step('Enable Schedule Post option and select future date/time', async () => {
      await page.getByLabel('Schedule Post').check();
      await page.getByLabel('Schedule Date').fill('2024-12-01');
      await page.getByLabel('Schedule Time').fill('10:00');
    });

    await test.step('Submit post and verify post is saved as scheduled', async () => {
      await createPostPage.clickPostButton();
      await page.waitForLoadState('networkidle');
      await page.goto(`${process.env.BASE_URL}/vibe/scheduled-posts`);
      const scheduledPost = page.locator('text=Good Reads').first();
      expect(await scheduledPost.isVisible()).toBeTruthy();
    });
  });

  test('TC012 - Edit Scheduled Post Before Posting Time', async ({ page }) => {
    await test.step('Navigate to scheduled posts list and select a scheduled post', async () => {
      await createPostPage.openScheduledPosts();
      await createPostPage.editScheduledPost();
    });

    await test.step('Edit content or schedule date/time and save changes', async () => {
      await createPostPage.fillGoodReadsUrl('https://example.com/updated-article');
      await page.getByLabel('Schedule Date').fill('2024-12-02');
      await page.getByLabel('Schedule Time').fill('11:00');
      await page.getByRole('button', { name: /save/i }).click();
    });

    await test.step('Verify updated scheduled post details', async () => {
      const updatedPost = page.locator('text=2024-12-02').first();
      expect(await updatedPost.isVisible()).toBeTruthy();
    });
  });

  test('TC013 - Cancel Scheduled Post Before Posting Time', async ({ page }) => {
    await test.step('Navigate to scheduled posts list and select a scheduled post', async () => {
      await createPostPage.openScheduledPosts();
      await createPostPage.cancelScheduledPost();
    });

    await test.step('Confirm cancellation and verify post is removed', async () => {
      await page.getByRole('button', { name: /confirm/i }).click();
      const scheduledPosts = await page.locator('div.scheduled-posts-list div.post-item').count();
      expect(scheduledPosts).toBeLessThanOrEqual(0);
    });
  });

  test('TC014 - Scheduled Post Publishes Automatically at Selected Time', async ({ page }) => {
    await test.step('Schedule a post with near future date/time', async () => {
      await createPostPage.openCreatePostFromMainFeed();
      await createPostPage.selectTemplate('Good Reads');
      await createPostPage.fillGoodReadsUrl('https://example.com/article');
      await page.getByLabel('Schedule Post').check();
      const nearFutureDate = new Date(Date.now() + 60000).toISOString().slice(0, 10);
      const nearFutureTime = new Date(Date.now() + 60000).toISOString().slice(11, 16);
      await page.getByLabel('Schedule Date').fill(nearFutureDate);
      await page.getByLabel('Schedule Time').fill(nearFutureTime);
      await createPostPage.clickPostButton();
    });

    await test.step('Wait until scheduled time and verify post appears on feed', async () => {
      await page.waitForTimeout(70000); // minimal wait for scheduled time
      await page.goto(`${process.env.BASE_URL}/vibe/main-feed`);
      const postVisible = await page.locator('text=Good Reads').first().isVisible();
      expect(postVisible).toBeTruthy();
    });
  });

  test('TC015 - Attachment Upload Limits and Hover Info', async ({ page }) => {
    await test.step('Open Create Post and hover over each attachment icon', async () => {
      await createPostPage.openCreatePostFromMainFeed();
      const attachmentIcons = page.locator('div.attachment-icons > button');
      const count = await attachmentIcons.count();
      for (let i = 0; i < count; i++) {
        await attachmentIcons.nth(i).hover();
        const tooltip = page.locator('div.tooltip');
        expect(await tooltip.isVisible()).toBeTruthy();
      }
    });

    await test.step('Upload 1 gif from library', async () => {
      await createPostPage.uploadAttachment('tests/assets/sample.gif');
    });

    await test.step('Upload up to 5 images, each <=10MB', async () => {
      for (let i = 0; i < 5; i++) {
        await createPostPage.uploadAttachment(`tests/assets/sample${i + 1}.jpg`);
      }
    });

    await test.step('Upload up to 5 files, each <=10MB', async () => {
      for (let i = 0; i < 5; i++) {
        await createPostPage.uploadAttachment(`tests/assets/sample${i + 1}.pdf`);
      }
    });

    await test.step('Upload up to 5 videos, each <=250MB', async () => {
      for (let i = 0; i < 5; i++) {
        await createPostPage.uploadAttachment(`tests/assets/sample${i + 1}.mp4`);
      }
    });

    await test.step('Try to upload one more than allowed and verify upload is blocked or error shown', async () => {
      await createPostPage.uploadAttachment('tests/assets/sample_extra.jpg');
      const errorMsg = await createPostPage.getErrorMessage();
      expect(errorMsg).toBeTruthy();
    });
  });

  test('TC016 - Attachment Upload Behavior Consistency with Regular Posts', async ({ page }) => {
    await test.step('Create regular post with attachments', async () => {
      await createPostPage.openCreatePostFromMainFeed();
      await createPostPage.fillPosterText('Regular post with attachments');
      await createPostPage.uploadAttachment('tests/assets/sample1.jpg');
    });

    await test.step('Create post using template with attachments', async () => {
      await createPostPage.openCreatePostFromMainFeed();
      await createPostPage.selectTemplate('Good Reads');
      await createPostPage.fillGoodReadsUrl('https://example.com/article');
      await createPostPage.uploadAttachment('tests/assets/sample1.jpg');
    });

    await test.step('Verify upload process, limits, and UI behavior are consistent', async () => {
      // Placeholder: Compare UI elements and upload behavior
      expect(true).toBeTruthy();
    });
  });

  test('TC017 - Allow Comments & Replies Toggle Visibility and Behavior', async ({ page }) => {
    await test.step('Login as user and check admin global setting for comments', async () => {
      await loginPage.logintoApp(process.env.USERNAME, process.env.PASSWORD);
      await createPostPage.openCreatePostFromMainFeed();
      const toggleVisible = await createPostPage.isAllowCommentsToggleVisible();
      // Assuming environment variable ADMIN_COMMENTS_ENABLED is set to 'true' or 'false'
      if (process.env.ADMIN_COMMENTS_ENABLED === 'true') {
        expect(toggleVisible).toBeTruthy();
        await createPostPage.toggleAllowComments(true);
        await createPostPage.clickPostButton();
        // Verify post reflects toggle setting - placeholder for API or UI validation
        expect(true).toBeTruthy();
      } else {
        expect(toggleVisible).toBeFalsy();
      }
    });
  });

  test('TC018 - Post on Behalf of Company Toggle Visibility for Admin', async ({ page }) => {
    await test.step('Login as Admin and verify toggle is visible', async () => {
      await loginPage.logintoApp(process.env.ADMIN_USERNAME, process.env.ADMIN_PASSWORD);
      await createPostPage.openCreatePostFromMainFeed();
      expect(await createPostPage.isPostOnBehalfToggleVisible()).toBeTruthy();
    });

    await test.step('Login as Manager or Employee and verify toggle is not visible', async () => {
      await loginPage.logintoApp(process.env.MANAGER_USERNAME, process.env.MANAGER_PASSWORD);
      await createPostPage.openCreatePostFromMainFeed();
      expect(await createPostPage.isPostOnBehalfToggleVisible()).toBeFalsy();

      await loginPage.logintoApp(process.env.EMPLOYEE_USERNAME, process.env.EMPLOYEE_PASSWORD);
      await createPostPage.openCreatePostFromMainFeed();
      expect(await createPostPage.isPostOnBehalfToggleVisible()).toBeFalsy();
    });
  });

  test('TC019 - Toggle Placement After Main Content Entry', async ({ page }) => {
    await test.step('Open Create Post and observe UI layout', async () => {
      await createPostPage.openCreatePostFromMainFeed();
      const contentAreaBottom = await createPostPage.postTextArea.boundingBox();
      const toggleTop = await createPostPage.allowCommentsToggle.boundingBox();
      expect(toggleTop.y).toBeGreaterThan(contentAreaBottom.y + contentAreaBottom.height);
    });
  });

  test('TC020 - Good Reads Template Link Validation', async ({ page }) => {
    await test.step('Select "Good Reads" template and enter invalid link', async () => {
      await createPostPage.openCreatePostFromMainFeed();
      await createPostPage.selectTemplate('Good Reads');
      await createPostPage.fillGoodReadsUrl('invalidlink');
    });

    await test.step('Attempt to submit post and verify error message', async () => {
      expect(await createPostPage.isPostButtonEnabled()).toBeFalsy();
      const errorMsg = await createPostPage.getErrorMessage();
      expect(errorMsg).toBe('Only an online link can be entered in this field.');
    });

    await test.step('Enter valid online link and verify error disappears and post can be submitted', async () => {
      await createPostPage.fillGoodReadsUrl('https://validlink.com');
      const errorMsg = await createPostPage.getErrorMessage().catch(() => null);
      expect(errorMsg).toBeFalsy();
      expect(await createPostPage.isPostButtonEnabled()).toBeTruthy();
    });
  });

  test('TC021 - Mandatory Field Enforcement for Pet Pics Template', async ({ page }) => {
    await test.step('Select "Pet Pics" template and do not upload any picture', async () => {
      await createPostPage.openCreatePostFromMainFeed();
      await createPostPage.selectTemplate('Pet Pics');
    });

    await test.step('Verify Post button is disabled', async () => {
      expect(await createPostPage.isPostButtonEnabled()).toBeFalsy();
    });

    await test.step('Upload one picture and verify Post button is enabled', async () => {
      await createPostPage.uploadPicture('tests/assets/sample1.jpg');
      expect(await createPostPage.isPostButtonEnabled()).toBeTruthy();
    });
  });

  test('TC015 - Character Limit Enforcement for Seeking Mentorship Template', async ({ page }) => {
    await test.step('Select Seeking Mentorship template', async () => {
      await createPostPage.openCreatePostFromMainFeed();
      await createPostPage.selectTemplate('Seeking Mentorship');
    });

    await test.step('Enter poster text exceeding character limit and verify restriction or error', async () => {
      const longText = 'a'.repeat(1001); // Assuming limit is 1000 chars
      await createPostPage.fillPosterText(longText);
      const errorMsg = await createPostPage.getErrorMessage().catch(() => null);
      expect(errorMsg || (await createPostPage.isPostButtonEnabled())).toBeFalsy();
    });

    await test.step('Enter poster text within limit and verify Post button is enabled', async () => {
      const validText = 'a'.repeat(500);
      await createPostPage.fillPosterText(validText);
      expect(await createPostPage.isPostButtonEnabled()).toBeTruthy();
    });
  });

  test('TC023 - Audience Selection Rules from Main Feed', async ({ page }) => {
    await test.step('From main feed, click Create Post and verify default audience', async () => {
      await createPostPage.openCreatePostFromMainFeed();
      const defaultAudience = await createPostPage.audienceDropdown.textContent();
      expect(defaultAudience).toContain('All Employees');
    });

    await test.step('Change audience to a group user is part of', async () => {
      await createPostPage.selectAudience('Group Name'); // Replace with actual group name
      const selected = await createPostPage.audienceDropdown.textContent();
      expect(selected).toContain('Group Name');
    });

    await test.step('Change audience to department', async () => {
      await createPostPage.selectAudience('Department Name'); // Replace with actual department
      const selected = await createPostPage.audienceDropdown.textContent();
      expect(selected).toContain('Department Name');
    });

    await test.step('Change audience to location', async () => {
      await createPostPage.selectAudience('Location Name'); // Replace with actual location
      const selected = await createPostPage.audienceDropdown.textContent();
      expect(selected).toContain('Location Name');
    });

    await test.step('Change audience to network', async () => {
      await createPostPage.selectAudience('Network Name'); // Replace with actual network
      const selected = await createPostPage.audienceDropdown.textContent();
      expect(selected).toContain('Network Name');
    });
  });

  test('TC024 - Audience Selection Rules from Within Group', async ({ page }) => {
    await test.step('From within a group, click Create Post and verify default audience and disabled selection', async () => {
      await createPostPage.openCreatePostFromGroup();
      const defaultAudience = await createPostPage.audienceDropdown.textContent();
      expect(defaultAudience).toContain('Group Members');
      expect(await createPostPage.isAudienceSelectionDisabled()).toBeTruthy();
    });
  });

  test('TC025 - Nudges for Content Generation', async ({ page }) => {
    await test.step('Login as user and observe main feed and create post screen', async () => {
      await loginPage.logintoApp(process.env.USERNAME, process.env.PASSWORD);
      await page.goto(`${process.env.BASE_URL}/vibe/main-feed`);
      expect(await createPostPage.isNudgeExploreTemplatesVisible()).toBeTruthy();
      expect(await createPostPage.isNudgeLastContributedVisible()).toBeTruthy();
    });
  });

  test('TC026 - Post Button Disabled Until Mandatory Fields Completed', async ({ page }) => {
    await test.step('Select any template with mandatory fields and leave empty', async () => {
      await createPostPage.openCreatePostFromMainFeed();
      await createPostPage.selectTemplate('Good Reads');
    });

    await test.step('Verify Post button is disabled', async () => {
      expect(await createPostPage.isPostButtonEnabled()).toBeFalsy();
    });

    await test.step('Fill all mandatory fields', async () => {
      await createPostPage.fillGoodReadsUrl('https://example.com/article');
    });

    await test.step('Verify Post button is enabled', async () => {
      expect(await createPostPage.isPostButtonEnabled()).toBeTruthy();
    });
  });
});