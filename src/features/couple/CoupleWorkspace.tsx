import { useEffect, useState, type FormEvent } from 'react'
import { ActivityBoard } from '../activities/ActivityBoard'
import { DashboardPanel } from '../dashboard/DashboardPanel'
import { MemoryBoard } from '../memories/MemoryBoard'
import { OccasionsPanel } from '../occasions/OccasionsPanel'
import { RemindersPanel } from '../reminders/RemindersPanel'
import { getSupabaseClient } from '../../lib/supabase/client'

interface CoupleWorkspaceProps {
  userId: string
}

interface Workspace {
  id: string
  name: string
  role: 'owner' | 'partner'
}

type WorkspaceTab = 'dashboard' | 'dates' | 'activities' | 'memories' | 'reminders'

export function CoupleWorkspace({ userId }: CoupleWorkspaceProps) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [name, setName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [mode, setMode] = useState<'create' | 'join'>('create')
  const [tab, setTab] = useState<WorkspaceTab>('dashboard')

  useEffect(() => {
    let active = true

    async function loadWorkspace() {
      setLoading(true)
      setErrorMessage('')

      try {
        const supabase = getSupabaseClient()
        const { data, error } = await supabase
          .from('couple_members')
          .select('couple_id, role, couples(id, name)')
          .eq('user_id', userId)
          .maybeSingle()

        if (!active) return
        if (error) throw error

        if (data?.couples) {
          const couple = Array.isArray(data.couples) ? data.couples[0] : data.couples
          setWorkspace({
            id: data.couple_id,
            name: couple?.name ?? 'Our shared space',
            role: data.role,
          })
        } else {
          setWorkspace(null)
        }
      } catch (error) {
        if (active) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Could not load the shared space.',
          )
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadWorkspace()
    return () => {
      active = false
    }
  }, [userId])

  async function createWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setErrorMessage('')

    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase.rpc('create_couple', {
        p_name: name.trim(),
      })
      if (error) throw error
      if (!data) throw new Error('The shared space was not created.')

      setWorkspace({
        id: data,
        name: name.trim(),
        role: 'owner',
      })
      setName('')
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Could not create the shared space.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function joinWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setErrorMessage('')

    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase.rpc('accept_couple_invite', {
        p_invite_code: joinCode.trim(),
      })
      if (error) throw error
      if (!data) throw new Error('The invite code did not add you to a shared space.')

      const { data: membership, error: membershipError } = await supabase
        .from('couple_members')
        .select('couple_id, role, couples(id, name)')
        .eq('user_id', userId)
        .maybeSingle()
      if (membershipError) throw membershipError

      const couple = membership?.couples
        ? Array.isArray(membership.couples)
          ? membership.couples[0]
          : membership.couples
        : null

      setWorkspace({
        id: membership?.couple_id ?? data,
        name: couple?.name ?? 'Our shared space',
        role: membership?.role ?? 'partner',
      })
      setJoinCode('')
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Could not join the shared space.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function createInviteCode() {
    setSaving(true)
    setErrorMessage('')

    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase.rpc('create_couple_invite')
      if (error) throw error

      const inviteResult = data as unknown as
        | Array<{ invite_code: string }>
        | { invite_code: string }
        | null
      const code = Array.isArray(inviteResult)
        ? inviteResult[0]?.invite_code
        : inviteResult?.invite_code
      if (!code) throw new Error('An invite code was not created.')
      setInviteCode(code)
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Could not create an invite code.',
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <section className="w-full max-w-3xl rounded-2xl bg-white p-8 text-slate-600 shadow-sm ring-1 ring-slate-200">
        Loading shared space...
      </section>
    )
  }

  if (!workspace) {
    return (
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        {mode === 'create' ? (
          <>
            <h1 className="text-3xl font-bold text-slate-900">Create a shared space</h1>
            <p className="mt-2 text-slate-600">
              Create the private space you and your partner will share.
            </p>

            <form className="mt-8 space-y-5" onSubmit={createWorkspace}>
              <div>
                <label className="block text-sm font-medium text-slate-700" htmlFor="couple-name">
                  Shared space name
                </label>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
                  id="couple-name"
                  maxLength={80}
                  onChange={(event) => setName(event.target.value)}
                  required
                  value={name}
                />
              </div>

              {errorMessage && (
                <p className="text-sm text-red-700" role="alert">
                  {errorMessage}
                </p>
              )}

              <button
                className="w-full rounded-lg bg-rose-600 px-4 py-2.5 font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={saving}
                type="submit"
              >
                {saving ? 'Creating...' : 'Create shared space'}
              </button>
            </form>

            <button
              className="mt-6 w-full text-sm font-semibold text-rose-700 hover:underline"
              onClick={() => {
                setMode('join')
                setErrorMessage('')
              }}
              type="button"
            >
              I have an invite code
            </button>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold text-slate-900">Join your partner</h1>
            <p className="mt-2 text-slate-600">Enter the private invite code they generated.</p>

            <form className="mt-8 space-y-5" onSubmit={joinWorkspace}>
              <div>
                <label className="block text-sm font-medium text-slate-700" htmlFor="invite-code">
                  Invite code
                </label>
                <input
                  autoComplete="off"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
                  id="invite-code"
                  maxLength={64}
                  minLength={64}
                  pattern="[0-9a-f]{64}"
                  onChange={(event) => setJoinCode(event.target.value)}
                  required
                  value={joinCode}
                />
              </div>

              {errorMessage && (
                <p className="text-sm text-red-700" role="alert">
                  {errorMessage}
                </p>
              )}

              <button
                className="w-full rounded-lg bg-rose-600 px-4 py-2.5 font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={saving}
                type="submit"
              >
                {saving ? 'Joining...' : 'Join shared space'}
              </button>
            </form>

            <button
              className="mt-6 w-full text-sm font-semibold text-rose-700 hover:underline"
              onClick={() => {
                setMode('create')
                setErrorMessage('')
              }}
              type="button"
            >
              Create my own shared space
            </button>
          </>
        )}
      </section>
    )
  }

  return (
    <div className="flex w-full max-w-5xl flex-col items-center gap-6">
      <h1 className="text-3xl font-bold text-slate-900">{workspace.name}</h1>
      <nav
        aria-label="Workspace sections"
        className="grid w-full max-w-3xl grid-cols-2 gap-2 rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-200 sm:grid-cols-5"
      >
        {[
          ['dashboard', 'Dashboard'],
          ['dates', 'Important dates'],
          ['activities', 'Activities'],
          ['memories', 'Memories'],
          ['reminders', 'Reminders'],
        ].map(([value, label]) => (
          <button
            className={
              tab === value
                ? 'rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white'
                : 'rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-rose-50'
            }
            key={value}
            onClick={() => setTab(value as WorkspaceTab)}
            type="button"
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === 'dashboard' && <DashboardPanel coupleId={workspace.id} />}
      {tab === 'dates' && <OccasionsPanel coupleId={workspace.id} />}
      {tab === 'activities' && <ActivityBoard coupleId={workspace.id} />}
      {tab === 'memories' && <MemoryBoard coupleId={workspace.id} />}
      {tab === 'reminders' && <RemindersPanel coupleId={workspace.id} />}

      {workspace.role === 'owner' && (
        <section className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="font-semibold text-slate-900">Invite your partner</h2>
          {inviteCode ? (
            <div className="mt-3">
              <label className="block text-sm font-medium text-slate-700" htmlFor="invite-code-output">
                One-time invite code
              </label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                id="invite-code-output"
                readOnly
                value={inviteCode}
              />
            </div>
          ) : (
            <button
              className="mt-3 rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={saving}
              onClick={createInviteCode}
              type="button"
            >
              Create invite code
            </button>
          )}
        </section>
      )}
    </div>
  )
}
