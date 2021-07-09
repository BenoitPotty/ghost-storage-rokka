const {SafeString} = require('../services/proxy');
const config = require('../../shared/config');
const logging = require('@tryghost/logging');
const _ = require('lodash');

function logRokkaRenderingImpossible(reason) {
    logging.warn(`Cannot generate proper Rokka img. Reason : ${reason}.`);
}

function standardImage(imgSrc) {
    return new SafeString(`<img src="${imgSrc}" />`);
}

function ensureImageConfiguration(activeConfig) {
    // Default values from Ghost
    const srcsets = [300, 600, 1000, 2000];
    const sizes = '(min-width: 1400px) 1400px, 92vw';
    const unit = 'w';

    if (activeConfig.imageConfiguration) {
        let imageConfiguration = activeConfig.imageConfiguration;

        if (!_.isArray(imageConfiguration.srcsets)) {
            imageConfiguration.srcsets = srcsets;
        }

        if (!_.isString(imageConfiguration.sizes)) {
            imageConfiguration.sizes = sizes;
        }

        if (!_.isString(imageConfiguration.unit)) {
            imageConfiguration.unit = unit;
        }
    } else {
        activeConfig.imageConfiguration = {srcsets, sizes, unit};
    }
}

function generateSrcset(activeConfig, encodedImageUrl) {
    return activeConfig.imageConfiguration.srcsets.map(s => `https://${activeConfig.organization}.rokka.io/${activeConfig.defaultStack}/resize-width-${s}/-${encodedImageUrl}-.jpg ${s}${activeConfig.imageConfiguration.unit}`).join(',');
}

// eslint-disable-next-line camelcase
module.exports = function rokka_image(imageUrl, options) {
    const storageConfig = config.get('storage');

    if (!_.isString(imageUrl)) {
        logRokkaRenderingImpossible('No imageUrl was passed');
        return;
    }

    if (!options) {
        logRokkaRenderingImpossible('No options were passed to the helper');
        return standardImage(imageUrl);
    }

    if (!storageConfig) {
        logRokkaRenderingImpossible('Storage not defined in configuration');
        return standardImage(imageUrl);
    }

    const activeConfig = storageConfig[storageConfig.active];

    if (!activeConfig) {
        logRokkaRenderingImpossible('No active config found');
        return standardImage(imageUrl);
    }

    if (!activeConfig.organization || !activeConfig.defaultStack) {
        logRokkaRenderingImpossible(`Rokka configuration is not valid. Please check documentation`);
        return standardImage(imageUrl);
    }

    ensureImageConfiguration(activeConfig);

    const encodedImageUrl = encodeURIComponent(imageUrl);

    const altText = options.hash.altText || '';

    return new SafeString(
        `<img
        src="https://${activeConfig.organization}.rokka.io/${activeConfig.defaultStack}/-${encodedImageUrl}-.jpg"
        srcset="${generateSrcset(activeConfig, encodedImageUrl)}"
        sizes="${activeConfig.imageConfiguration.sizes}"
        alt="${altText}" />`
    );
};
