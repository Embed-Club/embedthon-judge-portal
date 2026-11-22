// Helper module for persistent Gist-backed cloud store on Vercel
// Credentials must be provided via environment variables

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const GIST_ID = process.env.GIST_ID || '2b29e588ffd6188fe866e10b0fffc6c7';

async function fetchGist() {
  if (!GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN environment variable is not configured.');
  }

  const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'EmbedThon-Vercel-App'
    }
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch Gist: ${res.status} ${res.statusText}`);
  }

  return await res.json();
}

async function updateGistFile(filename, contentString) {
  if (!GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN environment variable is not configured.');
  }

  const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'EmbedThon-Vercel-App'
    },
    body: JSON.stringify({
      files: {
        [filename]: { content: contentString }
      }
    })
  });

  if (!res.ok) {
    throw new Error(`Failed to update Gist file: ${res.status} ${res.statusText}`);
  }

  return await res.json();
}

module.exports = {
  fetchGist,
  updateGistFile
};
