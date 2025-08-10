import { Post } from '../types';

export interface ReadingTimeStats {
    minutes: number;
    words: number;
    imageAdjustment: number;
}

export const calculateReadingTime = (post: Post): ReadingTimeStats => {
    // Different reading speeds based on content complexity
    const baseWordsPerMinute = 200; // Base reading speed
    const codeWordsPerMinute = 100; // Slower for code blocks
    const complexWordsPerMinute = 150; // Slower for complex/technical content
    
    // Clean content of HTML tags but preserve code blocks
    const codeBlocks: string[] = post.content.match(/<code[^>]*>[\s\S]*?<\/code>/g) || [];
    const contentWithoutCode = post.content.replace(/<code[^>]*>[\s\S]*?<\/code>/g, '');
    const cleanContent = contentWithoutCode.replace(/<[^>]+>/g, '');
    
    // Count words in regular content
    const regularWords = cleanContent.trim().split(/\s+/).length;
    
    // Count words in code blocks (after removing HTML tags)
    const codeWords = codeBlocks.reduce((acc: number, block: string) => {
        const cleanCode = block.replace(/<[^>]+>/g, '');
        return acc + cleanCode.trim().split(/\s+/).length;
    }, 0);
    
    // Count technical/complex words (words longer than 6 chars or containing special characters)
    const complexWords = cleanContent.split(/\s+/).filter(word => 
        word.length > 6 || /[-/_]/.test(word)
    ).length;
    
    // Count images (both markdown and HTML format)
    const imageMatches = post.content.match(/!\[.*?\]|<img.*?>/g) || [];
    const imageCount = imageMatches.length;
    
    // Calculate reading times for different content types
    const regularReadingTime = (regularWords - complexWords) / baseWordsPerMinute;
    const complexReadingTime = complexWords / complexWordsPerMinute;
    const codeReadingTime = codeWords / codeWordsPerMinute;
    
    // Add time for images (12 seconds for first image, 8 for subsequent)
    const imageAdjustmentMinutes = imageCount ? 
        (12 + (imageCount - 1) * 8) / 60 : 0;
    
    // Total reading time including all factors
    const totalMinutes = 
        regularReadingTime + 
        complexReadingTime + 
        codeReadingTime + 
        imageAdjustmentMinutes;
    
    // Add 10% buffer for better accuracy
    const finalMinutes = totalMinutes * 1.1;
    
    return {
        minutes: Math.ceil(finalMinutes),
        words: regularWords + codeWords,
        imageAdjustment: imageAdjustmentMinutes
    };
};

export const formatReadingTime = (stats: ReadingTimeStats): string => {
    if (stats.minutes < 1) {
        return 'Less than 1 min read';
    }
    
    return `${stats.minutes} min read`;
};
