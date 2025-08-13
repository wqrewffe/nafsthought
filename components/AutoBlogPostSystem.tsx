import React, { useState, useEffect } from 'react';
import { createAutoBlogConfig, getAutoBlogStatus } from '../services/autoBlogService';
import { format } from 'date-fns';

// Interfaces for data structures
interface AutoBlogStatus {
    id: string;
    topic: string;
    title: string;
    status: 'active' | 'paused' | 'completed';
    scheduleType: 'immediate' | 'scheduled' | 'daily' | 'interval';
    completedPosts: number;
    totalPosts: number;
    nextRunTime: Date | null;
    lastRunTime: Date | null;
    failedAttempts: number;
    lastError: string | null;
    progress: number;
}

interface NewConfigForm {
    topic: string;
    title: string;
    categories: string[];
    numPosts: number;
    scheduleType: 'immediate' | 'scheduled' | 'daily' | 'interval';
    postsPerDay?: number;
    intervalMinutes?: number;
    scheduledTime?: Date;
    generateTitles: boolean;
    generateCategories: boolean;
    titlePattern?: string;
}

// Cache for generated categories to reduce API calls
const categoryCache: { [topic: string]: { categories: string[], timestamp: number } } = {};
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour cache duration

const AutoBlogPostSystem: React.FC = () => {
    const [configs, setConfigs] = useState<AutoBlogStatus[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState<NewConfigForm>({
        topic: '',
        title: '',
        categories: [],
        numPosts: 1,
        scheduleType: 'immediate',
        generateTitles: true,
        generateCategories: true
    });

    const [showNewForm, setShowNewForm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGeneratingCategories, setIsGeneratingCategories] = useState(false);
    const [progress, setProgress] = useState(0);
    const [newCategory, setNewCategory] = useState('');

    useEffect(() => {
        loadConfigs();
        const interval = setInterval(loadConfigs, 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, []);

    const loadConfigs = async () => {
        try {
            const status = await getAutoBlogStatus();
            setConfigs(status);
            setError(null);
        } catch (err) {
            setError('Failed to load auto blog status');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    // Corrected category generation function with proper error handling and cache logic
    const generateCategoriesForTopic = async (topic: string) => {
        // Use cache if available and not expired
        const cachedEntry = categoryCache[topic];
        if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_DURATION) {
            setFormData(prev => ({ ...prev, categories: cachedEntry.categories }));
            return;
        }

        setIsGeneratingCategories(true);
        setError(null);
        const maxRetries = 3;
        let retryCount = 0;

        while (retryCount < maxRetries) {
            try {
                const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
                if (!API_KEY) {
                    throw new Error('Gemini API key is not configured');
                }

                const controller = new AbortController();
                const timeoutId = setTimeout(() => {
                    controller.abort();
                    console.error('Request timed out');
                }, 10000);

                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    signal: controller.signal,
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: `Generate exactly 5 relevant categories for this blog topic: "${topic}".
                                Rules:
                                1. Return ONLY a comma-separated list
                                2. Each category should be 1-2 words
                                3. Be specific but broadly applicable
                                4. No numbers or special characters
                                5. No explanations, just the list

                                Example format:
                                Web Development, User Interface, Frontend Design, Performance Optimization, Best Practices`
                            }]
                        }],
                        generationConfig: {
                            temperature: 0.3,
                            maxOutputTokens: 100,
                            topP: 0.8,
                            topK: 40
                        },
                        safetySettings: [
                            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
                        ]
                    })
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    if (response.status === 429) {
                        const retryAfter = parseInt(response.headers.get('retry-after') || '5', 10);
                        console.log(`Rate limited. Waiting ${retryAfter} seconds before retry...`);
                        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                        retryCount++;
                        continue;
                    }
                    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();
                if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
                    console.error('Unexpected API response:', data);
                    throw new Error('Invalid response format from API');
                }

                const categoriesText = data.candidates[0].content.parts[0].text;
                const categories = categoriesText
                    .split(',')
                    .map(cat => cat.trim())
                    .filter(cat => cat.length > 0 && /^[a-zA-Z\s]+$/.test(cat))
                    .slice(0, 5);

                if (categories.length === 0) {
                    throw new Error('No valid categories were generated');
                }

                categoryCache[topic] = { categories, timestamp: Date.now() };
                setFormData(prev => ({ ...prev, categories }));
                return; // Exit the loop on success
            } catch (error) {
                console.error('Error generating categories:', error);
                retryCount++;
                if (retryCount >= maxRetries) {
                    setError('Failed to generate categories after multiple retries. Please add them manually.');
                }
            } finally {
                setIsGeneratingCategories(false);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            await createAutoBlogConfig(formData, (progress) => {
                setProgress(progress);
            });

            setFormData({
                topic: '',
                title: '',
                categories: [],
                numPosts: 1,
                scheduleType: 'immediate',
                generateTitles: true,
                generateCategories: true
            });
            setShowNewForm(false);
            loadConfigs();
        } catch (err) {
            setError('Failed to create auto blog configuration');
            console.error(err);
        } finally {
            setIsSubmitting(false);
            setProgress(0);
        }
    };

    const addCategory = () => {
        if (newCategory.trim() && !formData.categories.includes(newCategory.trim())) {
            setFormData({
                ...formData,
                categories: [...formData.categories, newCategory.trim()]
            });
            setNewCategory('');
        }
    };

    const removeCategory = (category: string) => {
        setFormData({
            ...formData,
            categories: formData.categories.filter(c => c !== category)
        });
    };

    const handleTopicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTopic = e.target.value;
        setFormData({ ...formData, topic: newTopic });
        if (formData.generateCategories && newTopic) {
            generateCategoriesForTopic(newTopic);
        }
    };

    const handleGenerateCategoriesToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked;
        setFormData(prev => ({ ...prev, generateCategories: checked }));
        if (checked && formData.topic) {
            generateCategoriesForTopic(formData.topic);
        } else if (!checked) {
            setFormData(prev => ({ ...prev, categories: [] }));
        }
    };

    const handleGenerateTitlesToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked;
        setFormData(prev => ({
            ...prev,
            generateTitles: checked,
            title: checked ? '' : prev.title
        }));
    };

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Auto Blog Post System</h1>
                <button
                    onClick={() => setShowNewForm(!showNewForm)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                >
                    {showNewForm ? 'Cancel' : 'New Auto Blog Config'}
                </button>
            </div>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            {showNewForm && (
                <form onSubmit={handleSubmit} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-6">
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            Topic
                            <input
                                type="text"
                                value={formData.topic}
                                onChange={handleTopicChange}
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mt-1"
                                required
                            />
                        </label>
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            Title Pattern
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({...formData, title: e.target.value})}
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mt-1"
                                disabled={formData.generateTitles}
                            />
                        </label>
                    </div>

                    <div className="mb-4 space-y-2">
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                checked={formData.generateTitles}
                                onChange={handleGenerateTitlesToggle}
                                className="mr-2"
                            />
                            <span className="text-gray-700 text-sm font-bold">Auto-generate titles</span>
                        </label>
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                checked={formData.generateCategories}
                                onChange={handleGenerateCategoriesToggle}
                                className="mr-2"
                            />
                            <span className="text-gray-700 text-sm font-bold">Auto-generate categories</span>
                            {isGeneratingCategories && (
                                <span className="ml-2 text-blue-500 text-sm">Generating...</span>
                            )}
                        </label>
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            Categories
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newCategory}
                                    onChange={(e) => setNewCategory(e.target.value)}
                                    className="shadow appearance-none border rounded flex-grow py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mt-1"
                                    placeholder="Add a category"
                                />
                                <button
                                    type="button"
                                    onClick={addCategory}
                                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded mt-1"
                                >
                                    Add
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {formData.categories.map(category => (
                                    <span
                                        key={category}
                                        className="bg-blue-100 text-blue-800 px-2 py-1 rounded flex items-center gap-2"
                                    >
                                        {category}
                                        <button
                                            type="button"
                                            onClick={() => removeCategory(category)}
                                            className="text-blue-600 hover:text-blue-800"
                                        >
                                            ×
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </label>
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            Number of Posts
                            <input
                                type="number"
                                value={formData.numPosts}
                                onChange={(e) => setFormData({...formData, numPosts: parseInt(e.target.value, 10)})}
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mt-1"
                                min="1"
                                required
                            />
                        </label>
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            Schedule Type
                            <select
                                value={formData.scheduleType}
                                onChange={(e) => setFormData({...formData, scheduleType: e.target.value as any})}
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mt-1"
                            >
                                <option value="immediate">Immediate</option>
                                <option value="scheduled">Scheduled Time</option>
                                <option value="daily">Daily</option>
                                <option value="interval">Custom Interval</option>
                            </select>
                        </label>
                    </div>

                    {formData.scheduleType === 'daily' && (
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2">
                                Posts Per Day
                                <input
                                    type="number"
                                    value={formData.postsPerDay || 1}
                                    onChange={(e) => setFormData({...formData, postsPerDay: parseInt(e.target.value, 10)})}
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mt-1"
                                    min="1"
                                    required
                                />
                            </label>
                        </div>
                    )}

                    {formData.scheduleType === 'interval' && (
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2">
                                Interval (minutes)
                                <input
                                    type="number"
                                    value={formData.intervalMinutes || 60}
                                    onChange={(e) => setFormData({...formData, intervalMinutes: parseInt(e.target.value, 10)})}
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mt-1"
                                    min="10"
                                    required
                                />
                            </label>
                        </div>
                    )}

                    {formData.scheduleType === 'scheduled' && (
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2">
                                Start Time
                                <input
                                    type="datetime-local"
                                    onChange={(e) => setFormData({...formData, scheduledTime: e.target.value ? new Date(e.target.value) : undefined})}
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mt-1"
                                    required
                                />
                            </label>
                        </div>
                    )}

                    {isSubmitting && progress > 0 && (
                        <div className="mb-4">
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div
                                    className="bg-blue-600 h-2.5 rounded-full"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                                Progress: {progress}%
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${
                            isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                    >
                        {isSubmitting ? 'Creating...' : 'Create Auto Blog Config'}
                    </button>
                </form>
            )}

            <div className="mt-8">
                <h2 className="text-2xl font-bold mb-4">Active Configurations</h2>
                {isLoading ? (
                    <div className="text-center py-4">Loading...</div>
                ) : configs.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">No auto blog configurations found</div>
                ) : (
                    <div className="grid gap-6">
                        {configs.map(config => (
                            <div key={config.id} className="bg-white shadow rounded-lg p-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-xl font-bold mb-2">{config.topic}</h3>
                                        <p className="text-gray-600">{config.title}</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                        config.status === 'active' ? 'bg-green-100 text-green-800' :
                                        config.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-gray-100 text-gray-800'
                                    }`}>
                                        {config.status}
                                    </span>
                                </div>

                                <div className="mt-4">
                                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                                        <div
                                            className="bg-blue-600 h-2.5 rounded-full"
                                            style={{ width: `${config.progress}%` }}
                                        ></div>
                                    </div>
                                    <div className="text-sm text-gray-600 mt-1">
                                        {config.completedPosts} of {config.totalPosts} posts completed ({config.progress}%)
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                                    <div>
                                        <p className="text-gray-600">Next Run:</p>
                                        <p className="font-semibold">
                                            {config.nextRunTime ? format(new Date(config.nextRunTime), 'PPpp') : 'Not scheduled'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-gray-600">Last Run:</p>
                                        <p className="font-semibold">
                                            {config.lastRunTime ? format(new Date(config.lastRunTime), 'PPpp') : 'Never'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-gray-600">Schedule Type:</p>
                                        <p className="font-semibold">{config.scheduleType}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-600">Failed Attempts:</p>
                                        <p className="font-semibold">{config.failedAttempts}</p>
                                    </div>
                                </div>

                                {config.lastError && (
                                    <div className="mt-4 p-3 bg-red-50 text-red-700 rounded">
                                        <p className="font-semibold">Last Error:</p>
                                        <p>{config.lastError}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AutoBlogPostSystem;