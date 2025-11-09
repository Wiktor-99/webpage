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

function calculateReadTime(content) {
    const wordsPerMinute = 200;
    const words = content.trim().split(/\s+/).length;
    const minutes = Math.ceil(words / wordsPerMinute);
    return minutes;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

async function loadPost() {
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('id');

    if (!postId) {
        document.getElementById('post-content').innerHTML = '<div class="no-posts">Post not found.</div>';
        return;
    }

    try {
        const response = await fetch(`posts/${postId}.md`);
        if (!response.ok) {
            throw new Error('Post not found');
        }

        const markdown = await response.text();
        const parser = new MarkdownParser();
        const { content, metadata } = parser.extractMetadata(markdown);

        document.title = `${metadata.title || 'Blog Post'} - Wiktor Bajor`;

        document.getElementById('post-title').textContent = metadata.title || 'Untitled Post';

        const metaHtml = `
            <div class="post-meta-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                ${formatDate(metadata.date || new Date().toISOString())}
            </div>
            <div class="post-meta-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                ${calculateReadTime(content)} min read
            </div>
        `;
        document.getElementById('post-meta').innerHTML = metaHtml;

        if (metadata.tags) {
            const tags = metadata.tags.split(',').map(t => t.trim());
            const tagsHtml = `
                <div class="blog-card-tags" style="justify-content: center; margin-top: 1rem;">
                    ${tags.map(tag => `<span class="blog-tag">${tag}</span>`).join('')}
                </div>
            `;
            document.getElementById('post-tags').innerHTML = tagsHtml;
        }

        document.getElementById('post-content').innerHTML = parser.parse(content);

    } catch (error) {
        console.error('Error loading post:', error);
        document.getElementById('post-content').innerHTML = '<div class="no-posts">Failed to load post. Please try again later.</div>';
    }
}

loadPost();

console.log('Post viewer loaded! 📄');

