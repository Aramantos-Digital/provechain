import { getAuthContext } from '@/lib/auth-context';
import { getUserTier } from '@/lib/core';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Generate a secure API key
function generateApiKey(): { key: string; prefix: string; hash: string } {
  // Generate 32 random bytes (256 bits)
  const randomBytes = crypto.randomBytes(32);
  const key = `pk_${randomBytes.toString('hex')}`;

  // Create prefix (first 16 chars for display)
  const prefix = key.substring(0, 16);

  // Hash the key for storage
  const hash = crypto.createHash('sha256').update(key).digest('hex');

  return { key, prefix, hash };
}

// POST: Create new API key
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { user, supabase } = auth;

    // Parse request body
    const body = await request.json();
    const { name, expiresInDays } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'API key name is required' },
        { status: 400 }
      );
    }

    // Check if user's tier allows API keys (from Core)
    const tier = await getUserTier(user.id);
    const allowedTiers = ['business', 'custom'];

    if (!allowedTiers.includes(tier)) {
      return NextResponse.json(
        { error: 'API keys require a Business or Custom plan' },
        { status: 403 }
      );
    }

    // Count existing active keys
    const { count } = await supabase
      .from('api_keys')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'active');

    // Set max keys based on tier
    const maxKeys = tier === 'custom' ? 10 : 5;

    if (count !== null && count >= maxKeys) {
      return NextResponse.json(
        { error: `Maximum API keys limit reached (${maxKeys})` },
        { status: 400 }
      );
    }

    // Generate API key
    const { key, prefix, hash } = generateApiKey();

    // Calculate expiration date
    let expiresAt = null;
    if (expiresInDays && expiresInDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    // Store API key
    const { data: apiKey, error: insertError } = await supabase
      .from('api_keys')
      .insert({
        user_id: user.id,
        name: name.trim(),
        key_prefix: prefix,
        key_hash: hash,
        expires_at: expiresAt?.toISOString(),
        status: 'active',
        rate_limit_tier: tier === 'custom' ? 'elevated' : 'standard',
      })
      .select()
      .single();

    if (insertError || !apiKey) {
      console.error('Failed to create API key:', insertError);
      return NextResponse.json(
        { error: 'Failed to create API key' },
        { status: 500 }
      );
    }

    // Return the full key (only time it's shown!)
    return NextResponse.json({
      success: true,
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        key, // Full key - only returned on creation!
        prefix: apiKey.key_prefix,
        created_at: apiKey.created_at,
        expires_at: apiKey.expires_at,
      },
    });

  } catch (error) {
    console.error('Create API key error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET: List user's API keys
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { user, supabase } = auth;

    // Get user's API keys
    const { data: apiKeys, error } = await supabase
      .from('api_keys')
      .select('id, name, key_prefix, created_at, last_used_at, expires_at, status')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch API keys:', error);
      return NextResponse.json(
        { error: 'Failed to fetch API keys' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      apiKeys: apiKeys || [],
    });

  } catch (error) {
    console.error('Get API keys error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE: Revoke an API key
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthContext();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { user, supabase } = auth;

    // Get API key ID from query params
    const searchParams = request.nextUrl.searchParams;
    const keyId = searchParams.get('id');

    if (!keyId) {
      return NextResponse.json(
        { error: 'API key ID is required' },
        { status: 400 }
      );
    }

    // Revoke the API key (soft delete)
    const { error: revokeError } = await supabase
      .from('api_keys')
      .update({ status: 'revoked' })
      .eq('id', keyId)
      .eq('user_id', user.id); // Ensure user owns the key

    if (revokeError) {
      console.error('Failed to revoke API key:', revokeError);
      return NextResponse.json(
        { error: 'Failed to revoke API key' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'API key revoked successfully',
    });

  } catch (error) {
    console.error('Revoke API key error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
