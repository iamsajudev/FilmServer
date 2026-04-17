const validateAndProcessImage = (base64String) => {
    if (!base64String) return null;
    
    // Check if it's a valid base64 string
    const base64Regex = /^data:image\/(png|jpg|jpeg|gif|bmp);base64,/;
    if (!base64Regex.test(base64String)) {
        throw new Error('Invalid image format. Please provide a valid base64 image string');
    }
    
    // Get image type
    const imageType = base64String.match(/data:image\/(png|jpg|jpeg|gif|bmp);base64,/)[1];
    
    // Remove the prefix to get actual base64 data
    const base64Data = base64String.replace(base64Regex, '');
    
    // Calculate approximate size (base64 length * 0.75 = bytes)
    const approximateSize = Buffer.from(base64Data, 'base64').length;
    
    // Limit image size to 5MB
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (approximateSize > maxSize) {
        throw new Error('Image size too large. Maximum size is 5MB');
    }
    
    return {
        data: base64String,
        type: imageType,
        size: approximateSize
    };
};

module.exports = { validateAndProcessImage };