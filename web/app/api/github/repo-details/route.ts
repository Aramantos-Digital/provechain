import { getAuthContext } from '@/lib/auth-context'
import { createClient } from '@/lib/supabase/server'
import { getProviderToken } from '@/lib/core'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

// GET /api/github/repo-details - Fetch detailed info about a specific repository
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user } = auth

    // Get GitHub access token: try session first, fall back to Core's connected services
    const authClient = createClient()
    const { data: { session } } = await authClient.auth.getSession()
    let providerToken = session?.provider_token

    if (!providerToken) {
      providerToken = await getProviderToken(user.id, 'github')
    }

    if (!providerToken) {
      return NextResponse.json({
        error: 'GitHub not connected. Please connect GitHub in Connected Services or sign in with GitHub.'
      }, { status: 403 })
    }

    // Get owner and repo from query params
    const { searchParams } = new URL(request.url)
    const owner = searchParams.get('owner')
    const repo = searchParams.get('repo')

    if (!owner || !repo) {
      return NextResponse.json({
        error: 'Missing owner or repo parameter'
      }, { status: 400 })
    }

    // Fetch repo details from GitHub API
    const repoResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        headers: {
          Authorization: `Bearer ${providerToken}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    )

    if (!repoResponse.ok) {
      const error = await repoResponse.json()
      return NextResponse.json({
        error: `GitHub API error: ${error.message || repoResponse.statusText}`
      }, { status: repoResponse.status })
    }

    const repoData = await repoResponse.json()

    // Fetch README (first 500 chars for preview)
    let readmePreview = null
    try {
      const readmeResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/readme`,
        {
          headers: {
            Authorization: `Bearer ${providerToken}`,
            Accept: 'application/vnd.github.raw',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        }
      )

      if (readmeResponse.ok) {
        const readmeText = await readmeResponse.text()
        // Get first 500 characters, break at newline
        const preview = readmeText.substring(0, 500)
        const lastNewline = preview.lastIndexOf('\n')
        readmePreview = lastNewline > 0 ? preview.substring(0, lastNewline) : preview
      }
    } catch (e) {
      // README not available, continue without it
    }

    // Fetch commit count
    let commitCount = 0
    try {
      const commitsResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`,
        {
          headers: {
            Authorization: `Bearer ${providerToken}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        }
      )

      if (commitsResponse.ok) {
        // Get link header to find total commits
        const linkHeader = commitsResponse.headers.get('Link')
        if (linkHeader) {
          const match = linkHeader.match(/page=(\d+)>; rel="last"/)
          if (match) {
            commitCount = parseInt(match[1])
          }
        } else {
          // If no pagination, there's likely just 1 commit
          commitCount = 1
        }
      }
    } catch (e) {
      // Commit count not available
    }

    // Format details for frontend
    const details = {
      description: repoData.description,
      stars: repoData.stargazers_count || 0,
      watchers: repoData.watchers_count || 0,
      forks: repoData.forks_count || 0,
      open_issues: repoData.open_issues_count || 0,
      default_branch: repoData.default_branch || 'main',
      language: repoData.language,
      size: repoData.size || 0,
      created_at: repoData.created_at,
      updated_at: repoData.updated_at,
      readme_preview: readmePreview,
      commit_count: commitCount,
    }

    return NextResponse.json({
      success: true,
      details,
    })
  } catch (error: any) {
    console.error('Error in GET /api/github/repo-details:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
