import { getAuthContext } from '@/lib/auth-context'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, supabase } = auth

    const { searchParams } = new URL(request.url)

    // Duplicate/version lookup params (used by create page)
    const fileHash = searchParams.get('file_hash')
    const proofName = searchParams.get('proof_name')

    // If file_hash is provided, return matching proofs for duplicate detection
    if (fileHash) {
      const teamId = searchParams.get('team_id')

      let query = supabase
        .from('proofs')
        .select('id, proof_name, file_name, created_at, version_number, description_title, description_body, proof_group_id, expires_at, team_id')
        .eq('file_hash', fileHash)
        .eq('user_id', user.id)

      if (teamId) {
        query = query.eq('team_id', teamId)
      } else {
        query = query.is('team_id', null)
      }

      const { data, error } = await query.order('version_number', { ascending: false })

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ data })
    }

    // If proof_name is provided, return version info for that proof group
    if (proofName) {
      const { data, error } = await supabase
        .from('proofs')
        .select('version_number, description_title, description_body, proof_group_id, expires_at')
        .eq('proof_name', proofName)
        .eq('user_id', user.id)
        .order('version_number', { ascending: false })

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ data })
    }

    // Standard list query params
    // Sanitize search to prevent PostgREST filter injection via .or() interpolation
    const rawSearch = searchParams.get('search')
    const search = rawSearch ? rawSearch.replace(/[%,.()"'\\]/g, '') : null
    const tagId = searchParams.get('tag_id')
    const teamId = searchParams.get('team_id')
    const sort = searchParams.get('sort') || 'newest'
    const limit = parseInt(searchParams.get('limit') || '0', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const countOnly = searchParams.get('count_only') === 'true'
    const filterType = searchParams.get('filter_type') || 'personal'

    // Count-only mode: return just the total count
    if (countOnly) {
      if (filterType === 'team' && teamId) {
        // Verify team membership before returning count
        const { data: countMembership } = await supabase
          .from('team_members')
          .select('id')
          .eq('team_id', teamId)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single()

        if (!countMembership) {
          return NextResponse.json({ error: 'Not a member of this team' }, { status: 403 })
        }
      }

      let countQuery = supabase
        .from('proofs')
        .select('id', { count: 'exact', head: true })

      if (filterType === 'team' && teamId) {
        countQuery = countQuery.eq('team_id', teamId)
      } else {
        countQuery = countQuery.eq('user_id', user.id).is('team_id', null)
      }

      if (search) {
        countQuery = countQuery.or(`proof_name.ilike.%${search}%,file_name.ilike.%${search}%`)
      }

      const { count, error } = await countQuery

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ count: count || 0 })
    }

    // Full list query
    let query = supabase.from('proofs').select('*')

    // Apply filter based on type
    if (filterType === 'team' && teamId) {
      // Verify user is a member of this team before returning team proofs
      const { data: membership } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', teamId)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      if (!membership) {
        return NextResponse.json({ error: 'Not a member of this team' }, { status: 403 })
      }

      query = query.eq('team_id', teamId)
    } else {
      // Personal proofs: filter by user_id AND team_id is null
      query = query.eq('user_id', user.id).is('team_id', null)
    }

    // Apply search filter
    if (search) {
      query = query.or(`proof_name.ilike.%${search}%,file_name.ilike.%${search}%`)
    }

    // Apply sort
    switch (sort) {
      case 'oldest':
        query = query.order('created_at', { ascending: true })
        break
      case 'name-asc':
        query = query.order('proof_name', { ascending: true })
        break
      case 'name-desc':
        query = query.order('proof_name', { ascending: false })
        break
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false })
        break
    }

    // Apply pagination
    if (offset > 0) {
      query = query.range(offset, offset + (limit > 0 ? limit - 1 : 999999))
    } else if (limit > 0) {
      query = query.limit(limit)
    }

    const { data, error } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // If tag filtering is requested, filter results by tag via proof_tags
    let filteredData = data || []

    if (tagId) {
      const { data: taggedProofs, error: tagError } = await supabase
        .from('proof_tags')
        .select('proof_id, root_proof_id')
        .eq('tag_id', tagId)

      if (tagError) return NextResponse.json({ error: tagError.message }, { status: 500 })

      const taggedProofIds = new Set(taggedProofs?.map(pt => pt.proof_id) || [])
      const taggedRootIds = new Set(taggedProofs?.map(pt => pt.root_proof_id) || [])

      filteredData = filteredData.filter(
        proof => taggedProofIds.has(proof.id) || taggedRootIds.has(proof.id)
      )
    }

    // Get total count for the same filters (without pagination)
    let countQuery = supabase
      .from('proofs')
      .select('id', { count: 'exact', head: true })

    if (filterType === 'team' && teamId) {
      countQuery = countQuery.eq('team_id', teamId)
    } else {
      countQuery = countQuery.eq('user_id', user.id).is('team_id', null)
    }

    if (search) {
      countQuery = countQuery.or(`proof_name.ilike.%${search}%,file_name.ilike.%${search}%`)
    }

    const { count } = await countQuery

    return NextResponse.json({ data: filteredData, count: count || filteredData.length })
  } catch (error: any) {
    console.error('Error fetching proofs:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
