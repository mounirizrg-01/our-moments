import { useEffect, useState, type FormEvent } from 'react'
import { getSupabaseClient } from '../../lib/supabase/client'
import { OccasionsPanel } from '../occasions/OccasionsPanel'

interface CoupleWorkspaceRecord {
  id: string
  name: string
  role: 'owner' | 'partner'
  memberCount: number
}

interface CoupleWorkspaceProps {
  userId: string
}

async function loadWorkspace(userId: string): Promise<CoupleWorkspaceRecord | null> {
  const supabase = getSupabaseClient()
  const { data: membership, error: membershipError } = await supabase
    .from('couple_members')
    .select('couple_id, role')
    .eq('user_id', userId)
    .maybeSingle()

  if (membershipError) throw membershipError
  if (!membership) return null

  const { data: couple, error: coupleError } = await supabase
    .from('couples')
    .select('id, name')
    .eq('id', membership.couple_id)
    .single()

  if (coupleError) throw coupleError
  if (!couple) throw new Error('Your couple workspace could not be found.')

  const { data: members, error: membersError } = await supabase
    .from('couple_members')
    .select('user_id')
    .eq('couple_id', couple.id)

  if (membersError) throw membersError
  if (!members) throw new Error('Workspace membership could not be loaded.')

  return {
    ...couple,
    role: membership.role,
    memberCount: members.length,
  }
}

export function CoupleWorkspace({ userId }: CoupleWorkspaceProps) {
  const [workspace, setWorkspace] = useState<CoupleWorkspaceRecord | null>(null)
  const [name, setName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [mode, setMode] = useState<'create' | 'join'>('create')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [statusMessage, setStatusMessage] = useState('')

  useEffect(() => {
    let active = true

    async function refreshWorkspace() {
      setLoading(true)
      setErrorMessage('')

      try {
        const currentWorkspace = await loadWorkspace(userId)
        if (active) setWorkspace(currentWorkspace)
      } catch (error) {
        if (active) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Could not load your workspace.',
          )
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void refreshWorkspace()
    return () => {
      active = false
    }
  }, [userId])

  async function createWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setErrorMessage('')

    try {
      const cleanName = name.trim()
      const { data, error } = await getSupabaseClient().rpc('create_couple', {
        p_name: cleanName,
      })

      if (error) throw error
      if (!data) throw new Error('Workspace creation returned no ID. Please try again.')

      setWorkspace({ id: data, name: cleanName, role: 'owner', memberCount: 1 })
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Could not create your workspace.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function createInvite() {
    setSaving(true)
    setErrorMessage('')
    setStatusMessage('')

    try {
      const { data, error } = await getSupabaseClient().rpc('create_couple_invite')

      if (error) throw error
      const code = data[0]?.invite_code
      if (!code) throw new Error('The invite service returned no code. Please try again.')

      setInviteCode(code)
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Could not create an invite code.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function joinWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setErrorMessage('')
    setStatusMessage('')

    try {
      const { data: coupleId, error } = await getSupabaseClient().rpc(
        'accept_couple_invite',
        { p_invite_code: joinCode.trim() },
      )

      if (error) throw error
      if (!coupleId) throw new Error('The invite did not return a workspace. Please try again.')

      const joinedWorkspace = await loadWorkspace(userId)
      if (!joinedWorkspace || joinedWorkspace.id !== coupleId) {
        throw new Error('You joined, but the workspace could not be loaded. Please reload.')
      }

      setWorkspace(joinedWorkspace)
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Could not join this workspace.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function copyInviteCode() {
    try {
      await navigator.clipboard.writeText(inviteCode)
      setStatusMessage('Invite code copied. Send it privately to your partner.')
      setErrorMessage('')
    } catch {
      setErrorMessage('Copy was blocked. Select the code above and copy it manually.')
    }
  }

  if (loading) {
    return <p className="text-slate-600">Loading your workspace…</p>
  }

  if (workspace) {
    return (
      <div className="flex w-full flex-col items-center gap-6">
        <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-semibold uppercase tracking-wide text-rose-700">
            Your shared space
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">{workspace.name}</h1>
          {workspace.memberCount < 2 ? (
            <div className="mt-5 space-y-4">
              <p className="text-slate-600">
                Invite your partner with a one-time code. It expires in 7 days.
              </p>
              {workspace.role === 'owner' && !inviteCode && (
                <button
                  className="w-full rounded-lg bg-rose-600 px-4 py-2.5 font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={saving}
                  onClick={createInvite}
                  type="button"
                >
                  {saving ? 'Creating…' : 'Create invite code'}
                </button>
              )}
              {inviteCode && (
                <div>
                  <label
                    className="block text-sm font-medium text-slate-700"
                    htmlFor="generated-invite-code"
                  >
                    One-time invite code
                  </label>
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900"
                    id="generated-invite-code"
                    readOnly
                    value={inviteCode}
                  />
                  <button
                    className="mt-3 w-full rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
                    onClick={copyInviteCode}
                    type="button"
                  >
                    Copy invite code
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="mt-3 text-slate-600">You and your partner share this space.</p>
          )}
          {errorMessage && (
            <p className="mt-4 text-sm text-red-700" role="alert">
              {errorMessage}
            </p>
          )}
          {statusMessage && (
            <p className="mt-4 text-sm text-green-700" role="status">
              {statusMessage}
            </p>
          )}
        </section>
        <OccasionsPanel coupleId={workspace.id} />
      </div>
    )
  }

  return (
    <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
      {mode === 'create' ? (
        <>
          <h1 className="text-3xl font-bold text-slate-900">Create your shared space</h1>
          <p className="mt-2 text-slate-600">
            Choose a name for the space you’ll share with your partner.
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
              {saving ? 'Creating…' : 'Create shared space'}
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
          <p className="mt-2 text-slate-600">Paste the one-time invite code your partner sent you.</p>

          <form className="mt-8 space-y-5" onSubmit={joinWorkspace}>
            <div>
              <label className="block text-sm font-medium text-slate-700" htmlFor="invite-code">
                Invite code
              </label>
              <input
                autoCapitalize="none"
                autoComplete="off"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
                id="invite-code"
                maxLength={64}
                minLength={64}
                onChange={(event) => setJoinCode(event.target.value)}
                pattern="[0-9a-f]{64}"
                required
                spellCheck={false}
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
              {saving ? 'Joining…' : 'Join shared space'}
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
            Create my own space instead
          </button>
        </>
      )}
    </section>
  )
}
