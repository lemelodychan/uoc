import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    // Fetch spells with their class associations
    const { data: spells, error: spellsError } = await supabase
      .from('spells')
      .select(`
        *,
        spell_classes (
          class_name
        )
      `)
      .order('level', { ascending: true })
      .order('name', { ascending: true })

    if (spellsError) {
      console.error('Error fetching spells:', spellsError)
      return NextResponse.json({ error: 'Failed to fetch spells' }, { status: 500 })
    }

    // Transform the data to include classes as an array
    const transformedSpells = spells.map(spell => ({
      id: spell.id,
      name: spell.name,
      school: spell.school,
      level: spell.level,
      casting_time: spell.casting_time,
      range_area: spell.range_area,
      duration: spell.duration,
      components: spell.components,
      damage: spell.damage,
      save_throw: spell.save_throw,
      description: spell.description,
      higher_levels: spell.higher_levels,
      classes: spell.spell_classes?.map((sc: any) => sc.class_name) || []
    }))

    return NextResponse.json(transformedSpells)
  } catch (error) {
    console.error('Error in spells API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()
    const { spell, classes } = body

    // Insert the spell into the spells table
    const { data: newSpell, error: spellError } = await supabase
      .from('spells')
      .insert({
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
      .select()
      .maybeSingle()

    if (spellError) {
      console.error('Error creating spell:', spellError)
      return NextResponse.json({ error: 'Failed to create spell' }, { status: 500 })
    }

    // Insert class associations
    if (classes && classes.length > 0) {
      const classAssociations = classes.map((className: string) => ({
        spell_id: newSpell.id,
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
        ...newSpell,
        classes: classes || []
      }
    })
  } catch (error) {
    console.error('Error in spells POST API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
