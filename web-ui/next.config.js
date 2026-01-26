/** @type {import('next').NextConfig} */
module.exports = {
    // Disable SWC minifier for ARM64 Android compatibility
    swcMinify: false,

    // Disable image optimization (saves memory on mobile)
    images: {
        unoptimized: true
    }
};
