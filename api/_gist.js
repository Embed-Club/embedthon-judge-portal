// Helper module for persistent Gist-backed cloud store on Vercel
// Credentials MUST be provided via environment variables (no hardcoded fallbacks).

const { requireEnv } = require('./_auth');

async function fetchGist() {
  const token = requireEnv('GITHUB_TOKEN');
  const gistId = requireEnv('GIST_ID');

  const res = await fetch(`https://api.github.com/gists/${gistId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
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
  const token = requireEnv('GITHUB_TOKEN');
  const gistId = requireEnv('GIST_ID');

  const res = await fetch(`https://api.github.com/gists/${gistId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
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
