// Function to convert titles into URL-friendly slugs
export function slugify(text: string): string {
    if (!text) return '';
    
    // Handle Bengali text differently
    const isBengali = /[\u0980-\u09FF]/.test(text);
    
    if (isBengali) {
        // For Bengali text, just add a random string to make it unique
        const randomStr = Math.random().toString(36).substring(2, 8);
        return text.substring(0, 30) + '-' + randomStr;
    }
    
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
}