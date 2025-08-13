import { db } from '../firebase';
import { collection, addDoc, Timestamp, query, where, getDocs, updateDoc, getDoc, setDoc, DocumentReference, doc } from '@firebase/firestore';
import { Post } from '../types';

interface AutoBlogConfig {
    topic: string;
    title: string;
    categories: string[];
    numPosts: number;
    scheduleType: 'immediate' | 'scheduled' | 'daily' | 'interval';
    postsPerDay?: number;
    intervalMinutes?: number;
    scheduledTime?: Timestamp;
    status: 'active' | 'paused' | 'completed';
    createdAt: Timestamp;
    nextRunTime: Timestamp;
    completedPosts: number;
    generateTitles?: boolean; // If false, use the provided title pattern
    titlePattern?: string; // e.g., "My Blog Post #[number]" - used if generateTitles is false
    lastRunTime?: Timestamp; // Track when the last post was created
    failedAttempts?: number; // Track failed attempts
    lastError?: string; // Store last error message if any
}

interface BlogPost {
    title: string;
    content: string;
    createdAt: Date;
    publishedAt: Date;
    author: string;
    status: 'draft' | 'published';
    tags: string[];
}

interface CreateAutoBlogConfigInput {
    topic: string;
    title: string;
    categories: string[];
    numPosts: number;
    scheduleType: 'immediate' | 'scheduled' | 'daily' | 'interval';
    postsPerDay?: number;
    intervalMinutes?: number;
    scheduledTime?: Date;
    generateTitles?: boolean;
    titlePattern?: string;
}

export const createAutoBlogConfig = async (
    config: CreateAutoBlogConfigInput,
    onProgress?: (progress: number) => void
) => {
    const now = new Date();
    let nextRunTime = new Date();

    const calculateNextRunTime = (currentTime: Date, config: CreateAutoBlogConfigInput): Date => {
        const nextTime = new Date(currentTime);
        
        switch (config.scheduleType) {
            case 'immediate':
                return currentTime;
            
            case 'scheduled':
                return config.scheduledTime || currentTime;
            
            case 'daily':
                if (config.postsPerDay && config.postsPerDay > 1) {
                    // Calculate hours between posts
                    const hoursInterval = 24 / config.postsPerDay;
                    nextTime.setHours(currentTime.getHours() + hoursInterval);
                } else {
                    // Next day, same time
                    nextTime.setDate(currentTime.getDate() + 1);
                }
                return nextTime;
            
            case 'interval':
                if (config.intervalMinutes) {
                    return new Date(currentTime.getTime() + config.intervalMinutes * 60000);
                }
                return new Date(currentTime.getTime() + 24 * 60 * 60000); // Default to 24 hours
            
            default:
                return new Date(currentTime.getTime() + 60000); // Default to 1 minute
        }
    };

    if (config.scheduleType === 'immediate') {
        nextRunTime = now;
    } else if (config.scheduleType === 'scheduled' && config.scheduledTime) {
        // Assuming scheduledTime comes in as a Date from the component
        nextRunTime = config.scheduledTime;
    } else if (config.scheduleType === 'daily') {
        // If postsPerDay is specified, divide the day into intervals
        if (config.postsPerDay && config.postsPerDay > 1) {
            const hoursInterval = 24 / config.postsPerDay;
            nextRunTime = new Date(now);
            nextRunTime.setHours(now.getHours() + hoursInterval);
        } else {
            // Default: Set next run time to tomorrow at the same time
            nextRunTime = new Date(now);
            nextRunTime.setDate(nextRunTime.getDate() + 1);
            nextRunTime.setHours(0, 0, 0, 0); // Reset to midnight
        }
    } else {
        // Set next run time to now + interval
        const intervalTime = new Date(now);
        intervalTime.setMinutes(intervalTime.getMinutes() + (config.intervalMinutes || 60));
        nextRunTime = intervalTime;
    }

    // Prepare Firestore data
    const autoConfig: AutoBlogConfig = {
        topic: config.topic,
        title: config.title,
        categories: config.categories,
        numPosts: config.numPosts,
        scheduleType: config.scheduleType,
        status: 'active',
        createdAt: Timestamp.fromDate(now),
        nextRunTime: Timestamp.fromDate(nextRunTime),
        completedPosts: 0,
        generateTitles: config.generateTitles,
        ...(config.titlePattern && { titlePattern: config.titlePattern }),
        ...(config.postsPerDay && { postsPerDay: config.postsPerDay }),
        ...(config.intervalMinutes && { intervalMinutes: config.intervalMinutes }),
        ...(config.scheduledTime && { scheduledTime: Timestamp.fromDate(config.scheduledTime) })
    };

    try {
        const docRef = await addDoc(collection(db, 'autoBlogConfigs'), autoConfig);
        
        // If it's immediate posting, start generating posts right away
        if (config.scheduleType === 'immediate') {
            for (let i = 0; i < config.numPosts; i++) {
                const progress = Math.round(((i + 1) / config.numPosts) * 100);
                onProgress?.(progress);

                const blogPost = await generateBlogPost(config.topic, {
                    generateTitles: config.generateTitles ?? true,
                    title: config.title,
                    titlePattern: config.titlePattern,
                    postNumber: i + 1,
                    categories: config.categories
                });

                // Create a clean slug from the title
                let baseSlug = generateSlug(blogPost.title);
                let finalSlug = baseSlug;
                let counter = 1;

                // Keep checking until we find a unique slug
                while (true) {
                    const slugQuery = query(collection(db, 'posts'), where('slug', '==', finalSlug));
                    const slugCheck = await getDocs(slugQuery);
                    if (slugCheck.empty) break;
                    finalSlug = `${baseSlug}-${counter}`;
                    counter++;
                }

                // Create the document reference with the slug as ID
                const postRef = doc(collection(db, 'posts'), finalSlug);
                
                // Update the blog post with the final slug
                const postData: Post = {
                    ...blogPost,
                    id: finalSlug,
                    slug: finalSlug,
                    date: new Date().toISOString()
                };

                // Save the document with the slug as its ID
                await setDoc(doc(db, 'posts', finalSlug), postData);

                // Add a small delay between posts to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        // Get the auto config document reference
        const autoConfigRef = doc(collection(db, 'autoBlogConfigs'), docRef.id);
        return { id: docRef.id, ...autoConfig };
    } catch (error) {
        console.error('Error creating auto blog config:', error);
        throw error;
    }
};

function generateSlug(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')    // Remove special characters
        .replace(/\s+/g, '-')        // Replace spaces with -
        .replace(/-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+|-+$/g, '');    // Remove - from start and end
}

export const generateBlogPost = async (
    topic: string, 
    config: { 
        generateTitles: boolean;
        title?: string;
        titlePattern?: string;
        postNumber: number;
        categories: string[];
    }
) => {
    const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
    if (!API_KEY) {
        throw new Error('Gemini API key is not configured. Please set VITE_GEMINI_API_KEY in your environment variables.');
    }
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: [{
                parts: [{
                    text: `Write a detailed blog post about ${topic}. Follow these requirements:
1. ${config.generateTitles ? 'Start with a clear, engaging title using a single # for the heading' : 'No title needed'}
2. Begin with a brief introduction that captures attention
3. Use ## for section headings to organize content
4. Include practical examples, tips, or insights
5. Use markdown formatting:
   - **bold** for important terms
   - *italic* for emphasis
   - Lists for step-by-step instructions
6. Cover these categories: ${config.categories.join(', ')}
7. Make the content informative yet accessible
8. Include 4-6 main sections
9. End with a conclusion or call to action
10. Keep the tone professional but engaging
- Include elegant links like <a href="https://example.com" class="text-blue-500 hover:text-blue-700 underline decoration-dotted">this example link</a> that lead to trusted resources.

- Keep paragraphs short and inviting for effortless reading.

- Vary sentence lengths and structures to create a natural, engaging rhythm.

- Sprinkle in rhetorical questions or light humor to keep readers connected and entertained.`
                }]
            }],
            generationConfig: {
                temperature: 0.9,
                topK: 32,
                topP: 1,
                maxOutputTokens: 4096,
            },
            safetySettings: [
                {
                    category: "HARM_CATEGORY_HARASSMENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_HATE_SPEECH",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                }
            ]
        })
    });

    const data = await response.json();
    
    if (!response.ok) {
        console.error('Gemini API Error:', data);
        throw new Error(`Failed to generate blog post content: ${data.error?.message || 'Unknown error'}`);
    }

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error('Invalid response format from Gemini API');
    }

    const generatedText = data.candidates[0].content.parts[0].text;
    let title: string;
    let content: string;

    if (config.generateTitles) {
        // Extract title from generated text (assuming it's the first line)
        const lines = generatedText.split('\n');
        title = lines[0].replace(/^#\s*/, ''); // Remove markdown heading if present
        content = lines.slice(1).join('\n').trim();
    } else {
        if (config.titlePattern) {
            title = config.titlePattern.replace('[number]', config.postNumber.toString());
        } else if (config.title) {
            title = `${config.title} ${config.postNumber}`;
        } else {
            title = `${topic} - Part ${config.postNumber}`;
        }
        content = generatedText;
    }

    // Convert markdown to HTML with styling
    const htmlContent = content
        .replace(/# (.*)/g, '<h1><span class="text-3xl font-bold">$1</span></h1>')
        .replace(/## (.*)/g, '<h2><span class="text-2xl font-semibold">$1</span></h2>')
        .replace(/\*\*(.*?)\*\*/g, '<span class="font-bold">$1</span>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/```(.*?)```/g, '<pre><code>$1</code></pre>')
        .replace(/- (.*)/g, '<li>$1</li>')
        .split('\n\n').map(paragraph => {
            if (paragraph.startsWith('<')) return paragraph;
            if (paragraph.startsWith('- ')) return `<ul>${paragraph}</ul>`;
            return `<p>${paragraph}</p>`;
        }).join(' ');

    // Generate initial slug from the title
    const initialSlug = generateSlug(title);
    const post: Post = {
        id: initialSlug, // Set ID to match the slug
        slug: initialSlug,
        title,
        content: htmlContent,
        author: '|Y|',
        authorId: 'AtqdaXJTDbaxENVdxU1gaXwlI3y2',
        authorPhotoURL: null,
        date: new Date().toISOString(), // Matches the Post interface date format
        upvotes: 0,
        views: 0,
        comments: [],
        coverImage: `https://picsum.photos/seed/${initialSlug}/1200/600`,
        categories: config.categories,
        reports: []
    };

    return post;
};

const calculateNextRunTime = (currentTime: Date, config: AutoBlogConfig): Date => {
    const nextTime = new Date(currentTime);
    
    switch (config.scheduleType) {
        case 'immediate':
            return currentTime;
        
        case 'scheduled':
            return config.scheduledTime?.toDate() || currentTime;
        
        case 'daily':
            if (config.postsPerDay && config.postsPerDay > 1) {
                const hoursInterval = 24 / config.postsPerDay;
                nextTime.setHours(currentTime.getHours() + hoursInterval);
            } else {
                nextTime.setDate(currentTime.getDate() + 1);
            }
            return nextTime;
        
        case 'interval':
            if (config.intervalMinutes) {
                return new Date(currentTime.getTime() + config.intervalMinutes * 60000);
            }
            return new Date(currentTime.getTime() + 24 * 60 * 60000);
        
        default:
            return new Date(currentTime.getTime() + 60000);
    }
};

export const getAutoBlogStatus = async () => {
    const configsSnapshot = await getDocs(collection(db, 'autoBlogConfigs'));
    return configsSnapshot.docs.map(doc => {
        const data = doc.data() as AutoBlogConfig;
        return {
            id: doc.id,
            topic: data.topic,
            title: data.title,
            status: data.status,
            scheduleType: data.scheduleType,
            completedPosts: data.completedPosts,
            totalPosts: data.numPosts,
            nextRunTime: data.nextRunTime?.toDate(),
            lastRunTime: data.lastRunTime?.toDate(),
            failedAttempts: data.failedAttempts || 0,
            lastError: data.lastError,
            progress: Math.round((data.completedPosts / data.numPosts) * 100)
        };
    });
};

export const checkAndCreateScheduledPosts = async () => {
    const now = new Date();
    const configs = query(
        collection(db, 'autoBlogConfigs'),
        where('status', '==', 'active'),
        where('nextRunTime', '<=', now)
    );

    const snapshot = await getDocs(configs);

    for (const configDoc of snapshot.docs) {
        const config = configDoc.data() as AutoBlogConfig;
        const docRef = doc(db, 'autoBlogConfigs', configDoc.id);
        
        if (config.completedPosts >= config.numPosts) {
            // Mark as completed if all posts are done
            await updateDoc(docRef, { 
                status: 'completed',
                lastRunTime: Timestamp.now()
            });
            continue;
        }

        try {
            // Generate and save new blog post
            await generateBlogPost(config.topic, {
                generateTitles: config.generateTitles ?? true,
                title: config.title,
                titlePattern: config.titlePattern,
                postNumber: (config.completedPosts || 0) + 1,
                categories: config.categories
            });

            const nextRunTime = calculateNextRunTime(now, config);
            
            // Update the config with new run time and increment completed posts
            await updateDoc(docRef, {
                nextRunTime: Timestamp.fromDate(nextRunTime),
                lastRunTime: Timestamp.now(),
                completedPosts: (config.completedPosts || 0) + 1,
                failedAttempts: 0,
                lastError: null
            });
        } catch (error) {
            console.error(`Error creating scheduled post for config ${configDoc.id}:`, error);
            
            // Update failed attempts and error message
            await updateDoc(docRef, {
                failedAttempts: (config.failedAttempts || 0) + 1,
                lastError: error.message,
                nextRunTime: Timestamp.fromDate(new Date(now.getTime() + 5 * 60000)) // Retry in 5 minutes
            });
        }

        try {
            // Generate and save new blog post
            const blogPost = await generateBlogPost(config.topic, {
                generateTitles: config.generateTitles ?? true,
                title: config.title,
                titlePattern: config.titlePattern,
                postNumber: config.completedPosts + 1,
                categories: config.categories
            });
            
            // Create a clean slug from the title
            let baseSlug = generateSlug(blogPost.title);
            let finalSlug = baseSlug;
            let counter = 1;

            // Keep checking until we find a unique slug
            while (true) {
                const slugQuery = query(collection(db, 'posts'), where('slug', '==', finalSlug));
                const slugCheck = await getDocs(slugQuery);
                if (slugCheck.empty) break;
                finalSlug = `${baseSlug}-${counter}`;
                counter++;
            }

            // Create the document with the slug as ID
            const postRef = doc(db, 'posts', finalSlug);
            const postData: Post = {
                ...blogPost,
                id: finalSlug,
                slug: finalSlug,
                date: new Date().toISOString(),
                views: 0,
                upvotes: 0,
                comments: [],
                reports: []
            };

            await setDoc(postRef, postData);

            // Update next run time and completed posts count
            let nextRunTime = new Date();
            if (config.scheduleType === 'daily') {
                nextRunTime.setDate(nextRunTime.getDate() + 1);
                nextRunTime.setHours(0, 0, 0, 0);
            } else {
                nextRunTime.setMinutes(nextRunTime.getMinutes() + (config.intervalMinutes || 60));
            }

            const configRef = doc(db, 'autoBlogConfigs', configDoc.id);
            await updateDoc(configRef, {
                nextRunTime: Timestamp.fromDate(nextRunTime),
                completedPosts: config.completedPosts + 1
            });
        } catch (error) {
            console.error('Error generating scheduled post:', error);
        }
    }
};
