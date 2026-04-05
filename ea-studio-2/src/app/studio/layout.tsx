import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StudioShell from '@/components/studio/StudioShell'

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profile')
    .select('display_name')
    .eq('user_id', user.id)
    .single()

  const [
    { data: brands },
    { data: sections },
    { data: views },
  ] = await Promise.all([
    supabase.from('brands').select('id, name, color, slug, inbox_count').eq('owner_id', user.id).eq('is_active', true).order('sort_order'),
    supabase.from('sections').select('id, name, icon, sort_order').eq('owner_id', user.id).order('sort_order'),
    supabase.from('workspace_views').select('id, section_id, name, slug, color, icon, is_studio, sort_order').eq('owner_id', user.id).order('sort_order'),
  ])

  return (
    <StudioShell
      userName={profile?.display_name || user.email?.split('@')[0] || 'You'}
      userEmail={user.email || ''}
      brands={brands || []}
      sections={sections || []}
      views={views || []}
    >
      {children}
    </StudioShell>
  )
}
