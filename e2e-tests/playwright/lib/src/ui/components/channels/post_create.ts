// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import path from 'node:path';

import type {Locator} from '@playwright/test';
import {expect} from '@playwright/test';

import {duration} from '@/util';
import {assetPath} from '@/file';
import {waitUntil} from '@/test_action';

export default class ChannelsPostCreate {
    readonly container: Locator;
    readonly input;

    readonly attachmentButton;
    readonly emojiButton;
    readonly sendMessageButton;
    readonly scheduleMessageButton;
    readonly priorityButton;
    readonly suggestionList;
    readonly suggestionOptions;
    readonly selectedSuggestion;
    readonly filePreview;
    readonly filePreviewItems;
    readonly filePreviewRemoveButtons;
    readonly filePreviewThumbnails;
    readonly messageTooLongWarning;

    // Burn-on-Read elements
    readonly burnOnReadButton;
    readonly burnOnReadLabel;

    constructor(container: Locator, isRHS = false) {
        this.container = container;

        if (isRHS) {
            this.input = container.getByTestId('reply_textbox');
        } else {
            this.input = container.getByTestId('post_textbox');
        }

        this.attachmentButton = container.locator('#fileUploadButton');
        this.emojiButton = container.getByLabel('select an emoji');
        this.sendMessageButton = container.getByTestId('SendMessageButton');
        this.scheduleMessageButton = container.getByLabel('Schedule message');
        this.priorityButton = container.getByLabel('Message priority');
        this.suggestionList = container.getByRole('listbox', {name: 'Suggestions'});
        this.suggestionOptions = this.suggestionList.getByRole('option');
        this.selectedSuggestion = this.suggestionList.getByTestId('suggestion-selected');
        this.filePreview = container.getByTestId('file-preview-container');
        this.filePreviewItems = this.filePreview.getByTestId('file-preview-item');
        this.filePreviewRemoveButtons = this.filePreview.getByTestId('file-preview-remove');
        this.filePreviewThumbnails = this.filePreview.getByLabel(/file thumbnail/i);
        this.messageTooLongWarning = container.getByText(/Your message is too long\. Character count:/);

        // Burn-on-Read elements
        // Use a flexible locator that matches the aria-label pattern
        this.burnOnReadButton = container.getByRole('button', {name: /Burn-on-read/i});
        this.burnOnReadLabel = container.getByTestId('burn-on-read-label');
    }

    async toBeVisible() {
        await expect(this.container).toBeVisible();

        await this.input.waitFor();
        await expect(this.input).toBeVisible();
    }

    /**
     * It just writes the message in the input and doesn't send it
     * @param message : Message to be written in the input
     */
    async writeMessage(message: string) {
        await this.input.waitFor();
        await expect(this.input).toBeVisible();

        await this.input.fill(message);
    }

    /**
     * Returns the value of the message input
     */
    async getInputValue() {
        await expect(this.input).toBeVisible();
        return this.input.inputValue();
    }

    /**
     * Sends the message already written in the input
     */
    async sendMessage() {
        await expect(this.input).toBeVisible();
        const messageInputValue = await this.getInputValue();
        expect(messageInputValue).not.toBe('');

        await expect(this.sendMessageButton).toBeVisible();
        await expect(this.sendMessageButton).toBeEnabled();

        await this.sendMessageButton.click();
    }

    /**
     * Opens the message priority menu
     */
    async openPriorityMenu() {
        await expect(this.priorityButton).toBeVisible();
        await expect(this.priorityButton).toBeEnabled();
        await this.priorityButton.click();
    }

    /**
     * Composes and sends a message
     */
    async postMessage(message: string, files?: string[]) {
        await this.writeMessage(message);

        const page = this.container.page();
        const uploadResponsePromise =
            files && files.length > 0
                ? page.waitForResponse(
                      (r) =>
                          r.url().includes('/api/v4/files') &&
                          r.request().method() === 'POST' &&
                          r.status() >= 200 &&
                          r.status() < 300,
                      {timeout: 60000},
                  )
                : null;

        if (files) {
            const filePaths = files.map((file) => path.join(assetPath, file));
            page.once('filechooser', async (fileChooser) => {
                await fileChooser.setFiles(filePaths);
            });

            // Click on the attachment button
            await this.attachmentButton.click();

            // Wait until the file preview is displayed
            await this.waitUntilFilePreviewContains(files);
        }

        await this.sendMessage();

        // Without this, tests can click Send before the upload finishes under CI load,
        // producing posts with no attachments (flaky redacted-file / demo_plugin tests).
        if (uploadResponsePromise) {
            await uploadResponsePromise;
        }
    }

    /**
     * Selects a slash command from the autocomplete suggestion list
     * @param keystrokes - The partial text to type that triggers autocomplete (e.g., "/cr")
     * @param expectedCommand - The command we expect to see and select (e.g., "/crash")
     */
    async selectSlashCommandFromAutocomplete(keystrokes: string, expectedCommand: string) {
        await this.input.waitFor();
        await expect(this.input).toBeVisible();

        // Type the keystrokes to trigger autocomplete
        await this.input.fill(keystrokes);

        // Wait for the suggestion list to appear
        await expect(this.suggestionList).toBeVisible();

        // Verify the expected command appears in the suggestions
        const suggestion = this.suggestionList.getByText(expectedCommand);
        await expect(suggestion).toBeVisible();

        // Click to select the command
        await suggestion.click();
    }

    /**
     * Types the given keystrokes to trigger the autocomplete suggestion list,
     * optionally moves the highlight down with ArrowDown, then completes the
     * highlighted suggestion by pressing Tab.
     * @param keystrokes - Partial text that triggers autocomplete (e.g. "@jo", ":tomato")
     * @param options.arrowDown - Number of ArrowDown presses before selecting
     */
    async selectFromAutocompleteWithTab(keystrokes: string, {arrowDown = 0}: {arrowDown?: number} = {}) {
        await this.input.waitFor();
        await expect(this.input).toBeVisible();

        await this.input.fill(keystrokes);
        await expect(this.suggestionList).toBeVisible();

        for (let i = 0; i < arrowDown; i++) {
            await this.input.press('ArrowDown');
        }

        await this.input.press('Tab');
    }

    async openEmojiPicker() {
        await expect(this.emojiButton).toBeVisible();
        await this.emojiButton.click();
    }

    async selectFiles(files: File | File[]) {
        const selectedFiles = Array.isArray(files) ? files : [files];
        const fileChooserPromise = this.container.page().waitForEvent('filechooser');
        await this.attachmentButton.click();
        const fileChooser = await fileChooserPromise;
        const payloads = await Promise.all(
            selectedFiles.map(async (file) => ({
                name: file.name,
                mimeType: file.type,
                buffer: Buffer.from(await file.arrayBuffer()),
            })),
        );
        await fileChooser.setFiles(payloads);
        await this.waitUntilFilePreviewContains(selectedFiles.map((file) => file.name));
    }

    getFilePreviewItem(fileName: string) {
        return this.filePreviewItems.filter({hasText: fileName});
    }

    async toHaveFilePreview(fileName: string) {
        const item = this.getFilePreviewItem(fileName);
        await expect(item).toBeVisible();
        await expect(item.getByLabel(/file thumbnail/i)).toBeVisible();
    }

    async removeFilePreview(fileName: string) {
        await this.getFilePreviewItem(fileName).getByTestId('file-preview-remove').click();
    }

    async toHaveFilePreviewCount(count: number) {
        await expect(this.filePreviewItems).toHaveCount(count);
    }

    async toNotHaveMessageTooLongWarning() {
        await expect(this.messageTooLongWarning).not.toBeVisible();
    }

    async toHaveMessageTooLongWarning(characterCount: number, maximum: number) {
        await expect(
            this.container.getByText(`Your message is too long. Character count: ${characterCount}/${maximum}`, {
                exact: true,
            }),
        ).toBeVisible();
    }

    async waitUntilFilePreviewContains(files: string[], timeout = duration.ten_sec) {
        await waitUntil(
            async () => {
                const previews = this.filePreview.getByTestId('file-preview-item');
                const details = this.filePreview.getByTestId('post-image-details');

                const [previewsCount, detailsCount] = await Promise.all([previews.count(), details.count()]);

                return previewsCount === files.length && detailsCount === files.length;
            },
            {timeout},
        );
    }

    /**
     * Toggle the burn-on-read feature for the message
     */
    async toggleBurnOnRead() {
        await expect(this.burnOnReadButton).toBeVisible();
        await this.burnOnReadButton.click();
    }

    /**
     * Check if burn-on-read is currently enabled
     * BoR is considered enabled if the label is visible above the input
     */
    async isBurnOnReadEnabled(): Promise<boolean> {
        return this.burnOnReadLabel.isVisible();
    }
}
