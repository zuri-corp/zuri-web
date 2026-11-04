import { newId } from '../../state/core'
import { useModuleNavigation } from '../../state/navigation'
import { useRecords, updateState, usePrototype } from '../../state/store'
import Unavailable from '../../components/Unavailable'
import { useState } from 'react'
import { useEcosystem, type CrossAppRoute } from '../../LegacyApp'
import { users, userMap, type Project } from '../../data/catalog'

type Screen =
  | { id: 'home' }
  | { id: 'discover' }
  | { id: 'projects' }
  | { id: 'chat' }
  | { id: 'project_detail'; projectId: string }
  | { id: 'creator_detail'; userId: string }

const NAV = [
  { id: 'home', label: 'Home', icon: HomeIcon },
  { id: 'discover', label: 'Discover', icon: DiscoverIcon },
  { id: 'projects', label: 'Projects', icon: ProjectIcon },
  { id: 'chat', label: 'Chat', icon: ChatIcon },
]

export default function XpApp() {
  const { projects } = useRecords()
  const { screen, push, pop, navTab, switchNav } = useModuleNavigation<Screen>('xp', {"home": "home", "discover": "discover", "projects": "projects", "chat": "chat"})
  const projectsState = usePrototype()
  const allProjects = projectsState.projects
  const addProject = (item: Project) => updateState(s => ({ ...s, projects: [item, ...s.projects] }))

  if ('projectId' in screen && !allProjects.some(p => p.id === screen.projectId)) return <Unavailable title="Project unavailable" onBack={pop} />
  if ('userId' in screen && !userMap[screen.userId]) return <Unavailable title="Member unavailable" onBack={pop} />
  return (
    <div className="app-xp flex flex-col h-full" style={{ background: 'var(--color-eco-bg)' }}>
      <div key={JSON.stringify(screen)} className="flex-1 overflow-hidden relative">
        {screen.id === 'home' && <XpHome push={push} />}
        {screen.id === 'discover' && <XpDiscover push={push} />}
        {screen.id === 'projects' && <XpProjects push={push} allProjects={allProjects} onCreate={addProject} />}
        {screen.id === 'chat' && <div className="flex h-full items-center justify-center"><EmptyState label="Messaging is not connected yet" /></div>}
        {screen.id === 'project_detail' && <ProjectDetail projectId={screen.projectId} pop={pop} allProjects={allProjects} />}
        {screen.id === 'creator_detail' && <CreatorDetail userId={screen.userId} pop={pop} push={push} />}
      </div>

      <div className="flex-shrink-0 flex items-center justify-around px-2 pb-6 pt-3"
        style={{ background: 'var(--color-eco-bg)', borderTop: '1px solid rgba(75,140,247,0.1)' }}>
        {NAV.map(({ id, label, icon: Icon }) => {
          const active = navTab === id
          return (
            <button key={id} className="pressable flex flex-col items-center gap-1 px-3 py-1" onClick={() => switchNav(id)}>
              <Icon active={active} />
              <span className="font-display font-semibold text-[10px] tracking-wide"
                style={{ color: active ? '#4B8CF7' : 'var(--color-eco-muted)' }}>
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ───── XP HOME — project feed, Twitter/word style ─────
   Text-forward posts (and photos/videos) from Rizz tagged to a Project. */
function XpHome({ push }: { push: (s: Screen) => void }) {
  const { projects } = useRecords()
  const eco = useEcosystem()
  const feed = eco.contentItems.filter(c => c.taggedProjectIds.length > 0)
  const [liked, setLiked] = useState<Set<string>>(new Set())
  const toggleLike = (id: string) =>
    setLiked(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-eco-bg)' }}>
      <div className="flex-shrink-0 flex items-center justify-between px-5 pt-3 pb-3"
        style={{ borderBottom: '1px solid rgba(75,140,247,0.1)' }}>
        <button {...eco.homeButtonProps} className="pressable" style={{ touchAction: 'none' }}>
          <div className="font-display font-black text-xl text-eco-text" style={{ letterSpacing: '-0.02em' }}>XP</div>
        </button>
        <div className="flex items-center gap-3">
          <button className="pressable w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--color-eco-surface2)' }}
            onClick={() => push({ id: 'discover' })}>
            <SearchSVG />
          </button>
          <img src="https://i.pravatar.cc/150?img=3" className="w-8 h-8 rounded-full object-cover" alt="You" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {feed.length === 0 && (
          <div className="px-5 py-16 text-center">
            <div className="font-body text-sm text-eco-muted">No project updates yet.</div>
            <div className="font-body text-xs text-eco-subtle mt-1">Post from Rizz and tag a Project to see it here.</div>
          </div>
        )}
        {feed.map(post => {
          const creator = userMap[post.creatorId]
          const project = post.taggedProjectIds[0] ? projects.find(p => p.id === post.taggedProjectIds[0]) : null
          const isLiked = liked.has(post.id)
          return (
            <div key={post.id} className="flex gap-3 px-4 py-3.5"
              style={{ borderBottom: '1px solid rgba(75,140,247,0.08)' }}>
              <img src={creator.avatar} className="w-10 h-10 rounded-full object-cover flex-shrink-0" alt="" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-body text-sm font-semibold text-eco-text">{creator.name}</span>
                  <span className="font-body text-xs text-eco-subtle">@{creator.handle}</span>
                  <span className="text-eco-subtle text-xs">·</span>
                  <span className="font-body text-xs text-eco-subtle">{post.createdAt}</span>
                </div>

                {project && (
                  <button className="pressable inline-flex items-center gap-1 mt-1 mb-1.5"
                    onClick={() => push({ id: 'project_detail', projectId: project.id })}>
                    <span style={{ fontSize: '9px' }}>📁</span>
                    <span className="font-body text-[11px] font-semibold" style={{ color: '#4B8CF7' }}>{project.name}</span>
                  </button>
                )}

                <p className="font-body text-sm text-eco-text leading-snug mt-0.5">{post.caption}</p>

                {post.media && (
                  <div className="mt-2.5 rounded-2xl overflow-hidden relative" style={{ border: '1px solid rgba(75,140,247,0.15)' }}>
                    <img src={post.media} className="w-full object-cover" style={{ maxHeight: '260px' }} alt="" />
                    {post.mediaType === 'reel' && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(0,0,0,0.55)' }}>
                        <span className="text-[10px] text-white">▶</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-5 mt-2.5">
                  <button className="pressable flex items-center gap-1.5" onClick={() => toggleLike(post.id)}>
                    <span style={{ fontSize: '14px', color: isLiked ? '#FF2878' : 'var(--color-eco-muted)' }}>{isLiked ? '♥' : '♡'}</span>
                    <span className="font-body text-xs" style={{ color: isLiked ? '#FF2878' : 'var(--color-eco-muted)' }}>{post.reactions + (isLiked ? 1 : 0)}</span>
                  </button>
                  <div className="flex items-center gap-1.5">
                    <span style={{ fontSize: '13px', color: 'var(--color-eco-muted)' }}>💬</span>
                    <span className="font-body text-xs text-eco-subtle">{post.comments}</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ProjectCard({ project, onPress }: { project: Project; onPress: () => void }) {
  const creator = userMap[project.creatorId]

  return (
    <button className="pressable w-full text-left rounded-2xl overflow-hidden"
      style={{ background: 'var(--color-eco-surface)', border: '1px solid rgba(75,140,247,0.1)' }}
      onClick={onPress}>
      <div className="relative" style={{ height: '180px' }}>
        <img src={project.image} className="w-full h-full object-cover" alt="" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(8,10,18,0.98) 100%)' }} />
        <div className="absolute top-3 left-3">
          <span className="px-2 py-1 rounded font-display font-black text-[9px] tracking-widest uppercase"
            style={{ background: 'rgba(75,140,247,0.25)', color: '#4B8CF7' }}>
            {project.category}
          </span>
        </div>
        <div className="absolute bottom-3 left-4 right-4">
          <div className="font-display font-black text-lg text-white leading-tight">{project.name}</div>
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <img src={creator.avatar} className="w-6 h-6 rounded-full" alt="" />
            <span className="font-body text-xs text-eco-muted">{creator.name}</span>
          </div>
          <span className="font-body text-[10px]" style={{ color: '#4B8CF7' }}>{project.status}</span>
        </div>
        <p className="font-body text-xs text-eco-muted leading-relaxed line-clamp-2">{project.description}</p>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1">
            <div className="flex -space-x-1.5">
              {project.contributorIds.slice(0, 4).map(uid => (
                <img key={uid} src={userMap[uid]?.avatar} className="w-5 h-5 rounded-full border border-eco-bg" alt="" />
              ))}
            </div>
            <span className="font-body text-[10px] text-eco-muted ml-1">{project.contributorIds.length} contributors</span>
          </div>
          <div className="flex gap-3">
            <span className="font-body text-[10px] text-eco-muted">{project.mediaCount} media</span>
            <span className="font-body text-[10px] text-eco-muted">{project.updateCount} updates</span>
          </div>
        </div>
      </div>
    </button>
  )
}

function ProjectDetail({ projectId, pop, allProjects }: { projectId: string; pop: () => void; allProjects: Project[] }) {
  const { content } = useRecords()
  const eco = useEcosystem()
  const project = allProjects.find(p => p.id === projectId)!
  const creator = userMap[project.creatorId]
  const [tab, setTab] = useState('story')
  const { collabRequests } = usePrototype()
  const collab = collabRequests.includes(projectId) ? 'sent' : 'idle'
  const projectContent = content.filter(c => c.taggedProjectIds.includes(projectId))

  const tabs = ['story', 'media', 'people', 'updates', 'chat']

  const handleCollab = () => {
    if (collab !== 'idle') return
    updateState(s => ({ ...s, collabRequests: [...new Set([...s.collabRequests, projectId])] }))
  }

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-eco-bg)' }}>
      {/* Hero */}
      <div className="relative flex-shrink-0" style={{ height: '260px' }}>
        <img src={project.image} className="w-full h-full object-cover" alt="" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(8,10,18,0.98) 100%)' }} />
        <button onClick={pop} className="pressable absolute top-12 left-5 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
          <span className="text-white text-lg">←</span>
        </button>
        <div className="absolute bottom-4 left-5 right-5">
          <span className="px-2 py-0.5 rounded text-[9px] font-display font-bold tracking-widest uppercase"
            style={{ background: 'rgba(75,140,247,0.25)', color: '#4B8CF7' }}>
            {project.category}
          </span>
          <div className="font-display font-black text-2xl text-white mt-1.5 leading-tight" style={{ letterSpacing: '-0.02em' }}>
            {project.name}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 flex gap-1 px-4 overflow-x-auto py-3 border-b border-eco-border">
        {tabs.map(t => (
          <button key={t} className="pressable flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-display font-semibold uppercase tracking-wide"
            style={{
              background: tab === t ? 'rgba(75,140,247,0.15)' : 'transparent',
              color: tab === t ? '#4B8CF7' : 'var(--color-eco-muted)',
              border: tab === t ? '1px solid rgba(75,140,247,0.3)' : '1px solid transparent',
            }}
            onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-28 pt-4">
        {tab === 'story' && (
          <div className="space-y-4 animate-fadeUp">
            <div className="flex items-center gap-3">
              <img src={creator.avatar} className="w-10 h-10 rounded-full" alt="" />
              <div>
                <div className="font-body text-xs font-semibold text-eco-text">{creator.name}</div>
                <div className="flex items-center gap-1">
                  <span className="px-1.5 py-0.5 rounded text-[8px] font-display font-black uppercase"
                    style={{ background: creator.tier === 'elite' ? 'rgba(212,175,55,0.2)' : 'rgba(75,140,247,0.2)',
                      color: creator.tier === 'elite' ? '#D4AF37' : '#4B8CF7' }}>
                    {creator.tier}
                  </span>
                  <span className="font-body text-[10px] text-eco-muted">{creator.role}</span>
                </div>
              </div>
            </div>
            <p className="font-body text-sm text-eco-muted leading-relaxed">{project.description}</p>
            <div className="p-3 rounded-xl font-body text-xs" style={{ background: 'rgba(75,140,247,0.08)', color: '#4B8CF7' }}>
              ● {project.status}
            </div>
            <div className="flex gap-3">
              <div className="flex-1 p-3 rounded-xl text-center" style={{ background: 'var(--color-eco-surface)' }}>
                <div className="font-display font-black text-xl" style={{ color: '#4B8CF7' }}>{project.mediaCount}</div>
                <div className="font-body text-[10px] text-eco-muted">Media</div>
              </div>
              <div className="flex-1 p-3 rounded-xl text-center" style={{ background: 'var(--color-eco-surface)' }}>
                <div className="font-display font-black text-xl" style={{ color: '#4B8CF7' }}>{project.contributorIds.length}</div>
                <div className="font-body text-[10px] text-eco-muted">Contributors</div>
              </div>
              <div className="flex-1 p-3 rounded-xl text-center" style={{ background: 'var(--color-eco-surface)' }}>
                <div className="font-display font-black text-xl" style={{ color: '#4B8CF7' }}>{project.updateCount}</div>
                <div className="font-body text-[10px] text-eco-muted">Updates</div>
              </div>
            </div>
          </div>
        )}
        {tab === 'media' && (
          <div className="grid grid-cols-2 gap-2 animate-fadeUp">
            {projectContent.length > 0 ? projectContent.map(c => (
              <div key={c.id} className="aspect-square rounded-2xl overflow-hidden">
                {c.media ? <img src={c.media} className="w-full h-full object-cover" alt="" /> : <p className="p-3 font-body text-sm text-eco-text bg-eco-surface h-full">{c.caption}</p>}
              </div>
            )) : (
              <p className="col-span-2 font-body text-sm text-eco-muted">No posts have been linked to this project yet.</p>
            )}
          </div>
        )}
        {tab === 'people' && (
          <div className="space-y-3 animate-fadeUp">
            <div className="font-body text-[10px] text-eco-muted uppercase tracking-widest mb-2">Creator</div>
            <PersonRow user={creator} role="Creator" />
            <div className="font-body text-[10px] text-eco-muted uppercase tracking-widest mt-4 mb-2">Contributors</div>
            {project.contributorIds.filter(id => id !== project.creatorId).map(uid => (
              <PersonRow key={uid} user={userMap[uid]} role="Contributor" />
            ))}
          </div>
        )}
        {tab === 'updates' && (
          <div className="space-y-3 animate-fadeUp">
            {[
              { text: `Shot 4 is complete. ${project.mediaCount} images processed.`, time: '2d ago', uid: project.creatorId },
              { text: 'New location scouted in Jinja Town.', time: '5d ago', uid: project.contributorIds[1] || project.creatorId },
              { text: 'Project launched. Looking for contributors.', time: '2w ago', uid: project.creatorId },
            ].map((u, i) => (
              <div key={i} className="p-4 rounded-2xl" style={{ background: 'var(--color-eco-surface)', border: '1px solid rgba(75,140,247,0.08)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <img src={userMap[u.uid]?.avatar} className="w-7 h-7 rounded-full" alt="" />
                  <span className="font-body text-xs font-semibold text-eco-text">{userMap[u.uid]?.name.split(' ')[0]}</span>
                  <span className="font-body text-[10px] text-eco-muted ml-auto">{u.time}</span>
                </div>
                <p className="font-body text-xs text-eco-muted">{u.text}</p>
              </div>
            ))}
          </div>
        )}
        {tab === 'chat' && (
          <div className="flex items-center justify-center h-32">
            <EmptyState label="Project chat is not connected in this prototype" />
          </div>
        )}
      </div>

      {/* Collaborate CTA */}
      <div className="absolute bottom-0 left-0 right-0 p-5 pb-8"
        style={{ background: 'linear-gradient(to top, #080A12 60%, transparent)' }}>
        {collab === 'sent' ? (
          <div className="w-full h-14 rounded-2xl flex items-center justify-center gap-2 animate-scaleIn"
            style={{ background: 'rgba(75,140,247,0.15)', border: '1.5px solid rgba(75,140,247,0.4)' }}>
            <span className="font-display font-black text-base" style={{ color: '#4B8CF7' }}>✓ REQUEST SAVED LOCALLY</span>
          </div>
        ) : (
          <button
            className="pressable w-full h-14 rounded-2xl font-display font-black text-base"
            style={{ background: 'linear-gradient(135deg, #4B8CF7, #2563EB)', color: '#fff' }}
            onClick={handleCollab}>
            SAVE COLLABORATION INTEREST
          </button>
        )}
      </div>
    </div>
  )
}

function XpDiscover({ push }: { push: (s: Screen) => void }) {
  const { projects } = useRecords()
  const [query, setQuery] = useState('')
  const [activeSkill, setActiveSkill] = useState<string | null>(null)
  const skillTags = ['Photography', 'Music', 'Film', 'Design', 'Writing', 'Tech', 'Art', 'Sound']
  const q = query.trim().toLowerCase()

  const matchedProjects = projects.filter(p => {
    const matchesQuery = !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    const matchesSkill = !activeSkill || p.category.toLowerCase().includes(activeSkill.toLowerCase())
    return matchesQuery && matchesSkill
  })
  const matchedCreators = users.filter(u => {
    if (!u.isCreator) return false
    const matchesQuery = !q || u.name.toLowerCase().includes(q) || u.bio.toLowerCase().includes(q)
    const matchesSkill = !activeSkill || u.bio.toLowerCase().includes(activeSkill.toLowerCase())
    return matchesQuery && matchesSkill
  })
  const noResults = (q || activeSkill) && matchedProjects.length === 0 && matchedCreators.length === 0

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-eco-bg)' }}>
      <div className="flex-shrink-0 px-5 pt-12 pb-3">
        <div className="font-display font-black text-2xl text-eco-text mb-3" style={{ letterSpacing: '-0.02em' }}>DISCOVER</div>
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl"
          style={{ background: 'var(--color-eco-surface)', border: '1px solid rgba(75,140,247,0.15)' }}>
          <SearchSVG />
          <input value={query} onChange={e => setQuery(e.target.value)}
            className="flex-1 bg-transparent font-body text-sm text-eco-text outline-none"
            placeholder="People, projects, skills, experience..." />
          {query && <button onClick={() => setQuery('')} className="pressable text-eco-muted text-xs">✕</button>}
        </div>
      </div>

      <div className="flex-shrink-0 flex flex-wrap gap-2 px-5 pb-4">
        {skillTags.map(tag => (
          <button key={tag} onClick={() => setActiveSkill(s => s === tag ? null : tag)}
            className="pressable px-3 py-1.5 rounded-full text-[11px] font-display font-semibold"
            style={{
              background: activeSkill === tag ? '#4B8CF7' : 'rgba(75,140,247,0.1)',
              border: '1px solid rgba(75,140,247,0.2)',
              color: activeSkill === tag ? '#fff' : '#4B8CF7',
            }}>
            {tag}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6">
        {noResults && (
          <div className="pt-12 text-center">
            <div className="font-body text-sm text-eco-muted">No results{q ? ` for "${query}"` : ''}</div>
          </div>
        )}

        {matchedProjects.length > 0 && (
          <>
            <div className="font-body text-[10px] text-eco-muted uppercase tracking-widest mb-3">Projects</div>
            <div className="space-y-3">
              {matchedProjects.map(p => (
                <button key={p.id} className="pressable w-full text-left flex gap-3 p-4 rounded-2xl"
                  style={{ background: 'var(--color-eco-surface)', border: '1px solid rgba(75,140,247,0.08)' }}
                  onClick={() => push({ id: 'project_detail', projectId: p.id })}>
                  <img src={p.image} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" alt="" />
                  <div>
                    <div className="font-display font-black text-sm text-eco-text">{p.name}</div>
                    <div className="font-body text-xs text-eco-muted mt-0.5">{p.category}</div>
                    <div className="font-body text-[10px] mt-1" style={{ color: '#4B8CF7' }}>● {p.status}</div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {matchedCreators.length > 0 && (
          <>
            <div className="font-body text-[10px] text-eco-muted uppercase tracking-widest mt-6 mb-3">Creators</div>
            <div className="space-y-3">
              {matchedCreators.map(u => (
                <button key={u.id} className="pressable w-full flex items-center gap-3 p-4 rounded-2xl"
                  style={{ background: 'var(--color-eco-surface)', border: '1px solid rgba(75,140,247,0.08)' }}
                  onClick={() => push({ id: 'creator_detail', userId: u.id })}>
                  <img src={u.avatar} className="w-10 h-10 rounded-full" alt="" />
                  <div className="flex-1">
                    <div className="font-body text-sm font-semibold text-eco-text">{u.name}</div>
                    <div className="font-body text-xs text-eco-muted">{u.bio}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[9px] font-display font-black uppercase"
                    style={{ background: u.tier === 'elite' ? 'rgba(212,175,55,0.2)' : 'rgba(75,140,247,0.15)',
                      color: u.tier === 'elite' ? '#D4AF37' : '#4B8CF7' }}>
                    {u.tier}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function XpProjects({ push, allProjects, onCreate }: { push: (s: Screen) => void; allProjects: Project[]; onCreate: (p: Project) => void }) {
  const [showCreate, setShowCreate] = useState(false)
  return (
    <div className="flex flex-col h-full relative" style={{ background: 'var(--color-eco-bg)' }}>
      <div className="flex-shrink-0 px-5 pt-12 pb-4">
        <div className="font-display font-black text-3xl text-eco-text" style={{ letterSpacing: '-0.02em' }}>PROJECTS</div>
        <div className="font-body text-sm text-eco-muted mt-1">Experience in action</div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 pb-24 space-y-4">
        {allProjects.map(p => (
          <ProjectCard key={p.id} project={p} onPress={() => push({ id: 'project_detail', projectId: p.id })} />
        ))}
      </div>
      <button className="pressable absolute bottom-5 right-5 w-14 h-14 rounded-full flex items-center justify-center"
        style={{ background: '#4B8CF7', boxShadow: '0 8px 24px rgba(75,140,247,0.4)' }}
        onClick={() => setShowCreate(true)}>
        <span className="font-display font-black text-2xl text-white">+</span>
      </button>
      {showCreate && <CreateProjectSheet onClose={() => setShowCreate(false)} onCreate={onCreate} />}
    </div>
  )
}

/* ───── CREATE PROJECT ───── */
function CreateProjectSheet({ onClose, onCreate }: { onClose: () => void; onCreate: (p: Project) => void }) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('Just started')

  const canSubmit = name.trim().length > 0

  const submit = () => {
    if (!canSubmit) return
    onCreate({
      id: `pr-${newId('record')}`,
      name: name.trim(),
      image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=260&fit=crop&auto=format',
      creatorId: 'me',
      contributorIds: [],
      description: description.trim() || 'No description yet.',
      category: category.trim() || 'General',
      status,
      spaceIds: [],
      mediaCount: 0,
      updateCount: 0,
    })
    onClose()
  }

  return (
    <div className="absolute inset-0 flex flex-col justify-end z-50 animate-fadeIn"
      style={{ background: 'rgba(0,0,0,0.55)' }} onClick={onClose}>
      <div className="rounded-t-3xl p-5 animate-slideUp" style={{ background: 'var(--color-eco-surface)', maxHeight: '85%', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-center mb-3"><div className="w-9 h-1 rounded-full" style={{ background: 'var(--color-eco-subtle)' }} /></div>
        <div className="font-display font-black text-lg text-eco-text mb-4">New Project</div>

        <div className="font-display font-black text-[10px] tracking-[0.2em] text-eco-subtle uppercase mb-1.5">Project name</div>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Nile Nights"
          className="w-full rounded-xl px-3.5 py-3 font-body text-sm outline-none"
          style={{ background: 'var(--glass-06)', color: 'var(--color-eco-text)' }} />

        <div className="font-display font-black text-[10px] tracking-[0.2em] text-eco-subtle uppercase mb-1.5 mt-3.5">Category</div>
        <input value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Film, Design, Music"
          className="w-full rounded-xl px-3.5 py-3 font-body text-sm outline-none"
          style={{ background: 'var(--glass-06)', color: 'var(--color-eco-text)' }} />

        <div className="font-display font-black text-[10px] tracking-[0.2em] text-eco-subtle uppercase mb-1.5 mt-3.5">Description</div>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="What are you building?"
          className="w-full rounded-xl px-3.5 py-3 font-body text-sm outline-none resize-none"
          style={{ background: 'var(--glass-06)', color: 'var(--color-eco-text)' }} />

        <div className="font-display font-black text-[10px] tracking-[0.2em] text-eco-subtle uppercase mb-1.5 mt-3.5">Status</div>
        <div className="flex gap-2 flex-wrap">
          {['Just started', 'In progress', 'Collecting contributors', 'Wrapping up'].map(s => (
            <button key={s} onClick={() => setStatus(s)}
              className="pressable px-3 py-1.5 rounded-lg text-xs font-display font-bold"
              style={{ background: status === s ? '#4B8CF7' : 'var(--glass-08)', color: status === s ? '#fff' : 'var(--color-eco-muted)' }}>
              {s}
            </button>
          ))}
        </div>

        <button className="pressable w-full mt-4 py-3.5 rounded-xl font-display font-bold text-sm"
          disabled={!canSubmit} onClick={submit}
          style={{ background: canSubmit ? '#4B8CF7' : 'var(--glass-10)', color: canSubmit ? '#fff' : 'var(--color-eco-muted)' }}>
          Create Project
        </button>
      </div>
    </div>
  )
}

function CreatorDetail({ userId, pop, push }: { userId: string; pop: () => void; push: (s: Screen) => void }) {
  const { projects } = useRecords()
  const user = userMap[userId]
  const userProjects = projects.filter(p => p.creatorId === userId || p.contributorIds.includes(userId))

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-eco-bg)' }}>
      <div className="flex-shrink-0 flex items-center gap-3 px-5 pt-12 pb-4">
        <button onClick={pop} className="pressable w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'var(--color-eco-surface2)' }}>
          <span className="text-white">←</span>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 pb-6">
        <div className="flex items-start gap-4 mb-6">
          <img src={user.avatar} className="w-16 h-16 rounded-2xl object-cover" alt="" />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="font-display font-black text-xl text-eco-text">{user.name}</div>
              <span className="px-2 py-0.5 rounded text-[9px] font-display font-black uppercase"
                style={{ background: user.tier === 'elite' ? 'rgba(212,175,55,0.2)' : 'rgba(75,140,247,0.2)',
                  color: user.tier === 'elite' ? '#D4AF37' : '#4B8CF7' }}>
                {user.tier}
              </span>
            </div>
            <div className="font-body text-xs text-eco-muted mt-0.5">{user.bio}</div>
            <div className="flex gap-4 mt-3">
              {[['XP', user.xp, '#4B8CF7'], ['Aura', user.aura, '#D4AF37']].map(([l, v, c]) => (
                <div key={l as string}>
                  <div className="font-display font-black text-lg" style={{ color: c as string }}>{v}</div>
                  <div className="font-body text-[10px] text-eco-muted">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="font-body text-[10px] text-eco-muted uppercase tracking-widest mb-3">Projects</div>
        <div className="space-y-3">
          {userProjects.map(p => (
            <ProjectCard key={p.id} project={p} onPress={() => push({ id: 'project_detail', projectId: p.id })} />
          ))}
        </div>
      </div>
    </div>
  )
}

function PersonRow({ user, role }: { user: any; role: string }) {
  if (!user) return null
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--color-eco-surface)' }}>
      <img src={user.avatar} className="w-10 h-10 rounded-full" alt="" />
      <div>
        <div className="font-body text-sm font-semibold text-eco-text">{user.name}</div>
        <div className="font-body text-xs text-eco-muted">{role} · {user.xp} XP</div>
      </div>
      <span className="ml-auto px-2 py-0.5 rounded text-[8px] font-display font-black uppercase"
        style={{ background: 'rgba(75,140,247,0.1)', color: '#4B8CF7' }}>{user.tier}</span>
    </div>
  )
}

function SectionHeader({ label, color }: { label: string; color: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <span className="font-display font-black text-xs tracking-widest text-eco-text uppercase">{label}</span>
      <div className="h-px flex-1 mx-3" style={{ background: `${color}20` }} />
    </div>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-3xl opacity-20">⬡</div>
      <div className="font-display text-eco-muted text-sm">{label}</div>
    </div>
  )
}
function LoadingDots({ color }: { color: string }) {
  return <span className="flex gap-1">{[0,1,2].map(i => (
    <span key={i} className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color, animationDelay: `${i*0.15}s` }} />
  ))}</span>
}
function SearchSVG() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <circle cx="11" cy="11" r="7" stroke="#6B6B8C" strokeWidth="2" />
    <path d="M16 16L21 21" stroke="#6B6B8C" strokeWidth="2" strokeLinecap="round" />
  </svg>
}
function HomeIcon({ active }: { active: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M3 12L12 3L21 12V21H15V15H9V21H3V12Z" stroke={active ? '#4B8CF7' : 'var(--color-eco-muted)'} strokeWidth="1.8" strokeLinejoin="round" fill={active ? 'rgba(75,140,247,0.15)' : 'none'} />
  </svg>
}
function DiscoverIcon({ active }: { active: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <circle cx="11" cy="11" r="7" stroke={active ? '#4B8CF7' : 'var(--color-eco-muted)'} strokeWidth="1.8" />
    <path d="M16 16L21 21" stroke={active ? '#4B8CF7' : 'var(--color-eco-muted)'} strokeWidth="1.8" strokeLinecap="round" />
  </svg>
}
function ProjectIcon({ active }: { active: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <rect x="2" y="3" width="8" height="8" rx="2" stroke={active ? '#4B8CF7' : 'var(--color-eco-muted)'} strokeWidth="1.8" />
    <rect x="14" y="3" width="8" height="8" rx="2" stroke={active ? '#4B8CF7' : 'var(--color-eco-muted)'} strokeWidth="1.8" />
    <rect x="2" y="13" width="8" height="8" rx="2" stroke={active ? '#4B8CF7' : 'var(--color-eco-muted)'} strokeWidth="1.8" />
    <rect x="14" y="13" width="8" height="8" rx="2" stroke={active ? '#4B8CF7' : 'var(--color-eco-muted)'} strokeWidth="1.8" />
  </svg>
}
function ChatIcon({ active }: { active: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke={active ? '#4B8CF7' : 'var(--color-eco-muted)'} strokeWidth="1.8" fill={active ? 'rgba(75,140,247,0.15)' : 'none'} />
  </svg>
}
