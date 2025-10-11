import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const body = await request.json()
    const { spell, classes } = body
    const spellId = params.id

    // Update the spell in the spells table
    const { data: updatedSpell, error: spellError } = await supabase
      .from('spells')
      .update({
        name: spell.name,
        school: spell.school,
        level: spell.level,
        casting_time: spell.castingTime,
        range_area: spell.range,
        duration: spell.duration,
        components: spell.components,
        damage: spell.damage || null,
        save_throw: spell.saveThrow || null,
        description: spell.description,
        higher_levels: spell.higherLevel || null
      })
      .eq('id', spellId)
      .select()
      .single()

    if (spellError) {
      console.error('Error updating spell:', spellError)
      return NextResponse.json({ error: 'Failed to update spell' }, { status: 500 })
    }

    // Delete existing class associations
    const { error: deleteError } = await supabase
      .from('spell_classes')
      .delete()
      .eq('spell_id', spellId)

    if (deleteError) {
      console.error('Error deleting class associations:', deleteError)
      return NextResponse.json({ error: 'Failed to delete class associations' }, { status: 500 })
    }

    // Insert new class associations
    if (classes && classes.length > 0) {
      const classAssociations = classes.map((className: string) => ({
        spell_id: spellId,
        class_name: className
      }))

      const { error: classesError } = await supabase
        .from('spell_classes')
        .insert(classAssociations)

      if (classesError) {
        console.error('Error creating class associations:', classesError)
        return NextResponse.json({ error: 'Failed to create class associations' }, { status: 500 })
      }
    }

    return NextResponse.json({ 
      success: true, 
      spell: {
        ...updatedSpell,
        classes: classes || []
      }
    })
  } catch (error) {
    console.error('Error in spells PUT API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const spellId = params.id

    // Delete class associations first
    const { error: deleteClassesError } = await supabase
      .from('spell_classes')
      .delete()
      .eq('spell_id', spellId)

    if (deleteClassesError) {
      console.error('Error deleting class associations:', deleteClassesError)
      return NextResponse.json({ error: 'Failed to delete class associations' }, { status: 500 })
    }

    // Delete the spell
    const { error: deleteSpellError } = await supabase
      .from('spells')
      .delete()
      .eq('id', spellId)

    if (deleteSpellError) {
      console.error('Error deleting spell:', deleteSpellError)
      return NextResponse.json({ error: 'Failed to delete spell' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in spells DELETE API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
