import { getAuthContext } from '@/lib/auth-context'
import { createClient } from '@/lib/supabase/server'
import { getProviderToken } from '@/lib/core'
import { NextResponse } from 'next/server'

// GET /api/github/repos - Fetch all repos for GitHub authenticated user
export async function GET() {
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

    // Fetch repos from GitHub API
    // Using pagination to get all repos (up to 100 per page)
    const repos: any[] = []
    let page = 1
    const perPage = 100

    while (true) {
      const response = await fetch(
        `https://api.github.com/user/repos?per_page=${perPage}&page=${page}&sort=updated&affiliation=owner`,
        {
          headers: {
            Authorization: `Bearer ${providerToken}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        }
      )

      if (!response.ok) {
        const error = await response.json()
        console.error('GitHub API error:', error)
        return NextResponse.json({
          error: `GitHub API error: ${error.message || response.statusText}`
        }, { status: response.status })
      }

      const pageRepos = await response.json()

      if (pageRepos.length === 0) break

      repos.push(...pageRepos)

      // If we got less than perPage, we're done
      if (pageRepos.length < perPage) break

      page++
    }

    // Format repos for frontend
    const formattedRepos = repos.map((repo) => ({
      id: repo.id,
      full_name: repo.full_name,
      name: repo.name,
      owner: repo.owner.login,
      html_url: repo.html_url,
      description: repo.description,
      private: repo.private,
      default_branch: repo.default_branch || 'main',
      updated_at: repo.updated_at,
      language: repo.language,
      size: repo.size,
    }))

    return NextResponse.json({
      success: true,
      repos: formattedRepos,
      count: formattedRepos.length
    })
  } catch (error: any) {
    console.error('Error in GET /api/github/repos:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
