class MarkdownParser {
    parse(markdown) {
        let html = markdown;

        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
        html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');

        html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

        html = html.split('\n\n').map(para => {
            if (!para.match(/^<(h[1-6]|ul|ol|pre|blockquote)/)) {
                return '<p>' + para + '</p>';
            }
            return para;
        }).join('\n');

        return html;
    }

    extractMetadata(markdown) {
        const metaRegex = /^---\n([\s\S]*?)\n---/;
        const match = markdown.match(metaRegex);

        if (!match) return { content: markdown, metadata: {} };

        const metaText = match[1];
        const metadata = {};

        metaText.split('\n').forEach(line => {
            const [key, ...valueParts] = line.split(':');
            if (key && valueParts.length) {
                const value = valueParts.join(':').trim();
                metadata[key.trim()] = value.replace(/^["']|["']$/g, '');
            }
        });

        const content = markdown.replace(metaRegex, '').trim();
        return { content, metadata };
    }
}

class BlogManager {
    constructor() {
        this.parser = new MarkdownParser();
        this.posts = [];
    }

    async loadPosts() {
        try {
            const response = await fetch('posts/posts.json');
            if (!response.ok) {
                throw new Error('Failed to load posts index');
            }
            const postsIndex = await response.json();

            const postPromises = postsIndex.posts.map(async (filename) => {
                try {
                    const response = await fetch(`posts/${filename}`);
                    if (!response.ok) return null;

                    const markdown = await response.text();
                    const { content, metadata } = this.parser.extractMetadata(markdown);

                    return {
                        filename: filename.replace('.md', ''),
                        title: metadata.title || 'Untitled Post',
                        date: metadata.date || new Date().toISOString().split('T')[0],
                        excerpt: metadata.excerpt || this.generateExcerpt(content),
                        tags: metadata.tags ? metadata.tags.split(',').map(t => t.trim()) : [],
                        content: content,
                        readTime: this.calculateReadTime(content)
                    };
                } catch (error) {
                    console.error(`Error loading post ${filename}:`, error);
                    return null;
                }
            });

            this.posts = (await Promise.all(postPromises))
                .filter(post => post !== null)
                .sort((a, b) => new Date(b.date) - new Date(a.date));

            return this.posts;
        } catch (error) {
            console.error('Error loading posts:', error);
            return [];
        }
    }

    generateExcerpt(content, length = 150) {
        const text = content.replace(/<[^>]*>/g, '').replace(/[#*`]/g, '');
        return text.length > length ? text.substring(0, length) + '...' : text;
    }

    calculateReadTime(content) {
        const wordsPerMinute = 200;
        const words = content.trim().split(/\s+/).length;
        const minutes = Math.ceil(words / wordsPerMinute);
        return minutes;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}

const blogManager = new BlogManager();

async function displayBlogPosts() {
    const container = document.getElementById('blog-posts');

    const posts = await blogManager.loadPosts();

    if (posts.length === 0) {
        container.innerHTML = '<div class="no-posts">No blog posts yet. Check back soon!</div>';
        return;
    }

    container.innerHTML = posts.map(post => `
        <a href="post.html?id=${post.filename}" class="blog-card">
            <div class="blog-card-header">
                <div class="blog-card-date">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    ${blogManager.formatDate(post.date)}
                </div>
                <h2 class="blog-card-title">${post.title}</h2>
            </div>
            <p class="blog-card-excerpt">${post.excerpt}</p>
            ${post.tags.length > 0 ? `
                <div class="blog-card-tags">
                    ${post.tags.map(tag => `<span class="blog-tag">${tag}</span>`).join('')}
                </div>
            ` : ''}
            <div class="blog-card-footer">
                <div class="blog-read-time">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    ${post.readTime} min read
                </div>
                <div class="blog-read-more">
                    Read more
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                        <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                </div>
            </div>
        </a>
    `).join('');
}

if (document.getElementById('blog-posts')) {
    displayBlogPosts();
}

console.log('Blog system loaded! 📝');

