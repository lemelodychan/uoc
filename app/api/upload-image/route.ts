import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const folder = formData.get('folder') as string || 'character-images'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!validImageTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only images are allowed.' }, { status: 400 })
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size exceeds 5MB limit' }, { status: 400 })
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `${folder}/${fileName}`

    // Upload to Supabase Storage - using 'assets' bucket
    // Note: Supabase Storage accepts File, Blob, ArrayBuffer, or typed arrays
    const { data, error } = await supabase.storage
      .from('assets')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      })

    if (error) {
      console.error('Error uploading file:', error)
      console.error('Error details:', {
        message: error.message,
        statusCode: error.statusCode,
        error: error.error
      })
      return NextResponse.json({ 
        error: 'Failed to upload file', 
        details: error.message || error.error || 'Unknown error'
      }, { status: 500 })
    }

    // Get public URL from 'assets' bucket
    const { data: urlData } = supabase.storage
      .from('assets')
      .getPublicUrl(filePath)

    return NextResponse.json({ 
      success: true, 
      url: urlData.publicUrl,
      path: filePath
    })
  } catch (error) {
    console.error('Error in upload-image API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

