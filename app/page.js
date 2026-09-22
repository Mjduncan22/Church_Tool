'use client';

import { useEffect, useMemo, useState } from 'react';

const MODES = [
  { id: 'practice', label: 'Practice', detail: 'Review without pressure' },
  { id: 'memorize', label: 'Memorize', detail: 'Type the name' },
  { id: 'directory', label: 'Directory', detail: 'Browse everyone' },
];

const GROUPS = ['ALL', 'Elder Quorum 1', 'Elder Quorum 2', 'Relief Society 1', 'Relief Society 2'];

function imagePath(member) {
  return member.image ? `/${member.image}` : '/placeholder.png';
}

function shuffledNames(memberList) {
  return [...memberList]
    .sort(() => Math.random() - 0.5)
    .map((member) => member.full_name);
}

function MemberImage({ member, className = '' }) {
  return (
    <img
      src={imagePath(member)}
      alt=""
      className={className}
      onError={(event) => {
        event.currentTarget.src = '/placeholder.png';
      }}
    />
  );
}

function MemberDetails({ member, showName = true }) {
  return (
    <div className="space-y-3">
      {showName && <h2 className="text-2xl font-semibold text-white">{member.full_name}</h2>}
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-500">Apartment</dt>
          <dd className="mt-1 font-medium text-slate-200">Apt {member.apt || 'N/A'}</dd>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-500">From</dt>
          <dd className="mt-1 truncate font-medium text-slate-200">{member.location}</dd>
        </div>
      </dl>
    </div>
  );
}

export default function WardStudy() {
  const [members, setMembers] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [selectedGroup, setSelectedGroup] = useState('ALL');
  const [mode, setMode] = useState('practice');
  const [loading, setLoading] = useState(true);
  const [practiceMemorized, setPracticeMemorized] = useState(new Set());
  const [practiceQueue, setPracticeQueue] = useState([]);
  const [practiceLayout, setPracticeLayout] = useState('side-by-side');
  const [practiceRevealed, setPracticeRevealed] = useState(false);
  const [memorizeQueue, setMemorizeQueue] = useState([]);
  const [memorizeInput, setMemorizeInput] = useState('');
  const [memorizeFeedback, setMemorizeFeedback] = useState(null);
  const [scores, setScores] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApt, setSelectedApt] = useState('ALL');

  useEffect(() => {
    Promise.all([fetch('/ward_data.json'), fetch('/api/assignments')])
      .then(async ([memberResponse, assignmentResponse]) => {
        const data = await memberResponse.json();
        const assignmentData = await assignmentResponse.json();
        setMembers(data);
        setAssignments(assignmentData);
        setPracticeQueue(shuffledNames(data));
        setMemorizeQueue(shuffledNames(data));
        setLoading(false);
      })
      .catch((error) => {
        console.error('Failed to load ward data:', error);
        setLoading(false);
      });
  }, []);

  const apartments = useMemo(
    () => ['ALL', ...new Set(members
      .filter((member) => selectedGroup === 'ALL' || assignments[selectedGroup]?.includes(member.apt))
      .map((member) => member.apt)
      .filter(Boolean))]
      .sort((a, b) => (a === 'ALL' ? -1 : parseInt(a, 10) - parseInt(b, 10))),
    [assignments, members, selectedGroup],
  );

  const groupedMembers = useMemo(
    () => members.filter((member) => selectedGroup === 'ALL'
      || assignments[selectedGroup]?.includes(member.apt)),
    [assignments, members, selectedGroup],
  );

  const practiceMembers = useMemo(
    () => practiceQueue
      .map((name) => groupedMembers.find((member) => member.full_name === name))
      .filter((member) => member && !practiceMemorized.has(member.full_name)),
    [groupedMembers, practiceMemorized, practiceQueue],
  );

  const memorizeMembers = useMemo(
    () => memorizeQueue
      .map((name) => groupedMembers.find((member) => member.full_name === name))
      .filter((member) => {
        const score = member && scores[member.full_name];
        return member && (!score || score.correct / score.attempts < 0.75);
      }),
    [groupedMembers, memorizeQueue, scores],
  );

  const directoryMembers = useMemo(() => groupedMembers
    .filter((member) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = member.full_name?.toLowerCase().includes(query)
        || member.location?.toLowerCase().includes(query);
      return matchesSearch && (selectedApt === 'ALL' || member.apt === selectedApt);
    })
    .sort((a, b) => {
      const apartmentOrder = parseInt(a.apt, 10) - parseInt(b.apt, 10);
      return apartmentOrder || a.full_name.localeCompare(b.full_name);
    }), [groupedMembers, searchQuery, selectedApt]);

  const practiceMember = practiceMembers[0];
  const memorizeMember = memorizeMembers[0];
  const totalAttempts = Object.values(scores).reduce((sum, score) => sum + score.attempts, 0);
  const totalCorrect = Object.values(scores).reduce((sum, score) => sum + score.correct, 0);
  const totalScore = totalAttempts ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
  const completedCount = groupedMembers.filter((member) => {
    const score = scores[member.full_name];
    return score && score.correct / score.attempts >= 0.75;
  }).length;

  function changeMode(nextMode) {
    setMode(nextMode);
    if (nextMode === 'practice') {
      setPracticeMemorized(new Set());
      setPracticeQueue(shuffledNames(groupedMembers));
      setPracticeRevealed(false);
      setMemorizeQueue(shuffledNames(groupedMembers));
    } else {
      setPracticeMemorized(new Set());
    }
    setMemorizeFeedback(null);
    setMemorizeInput('');
  }

  function changeGroup(nextGroup) {
    const nextMembers = members.filter((member) => nextGroup === 'ALL'
      || assignments[nextGroup]?.includes(member.apt));
    setSelectedGroup(nextGroup);
    setSelectedApt('ALL');
    setPracticeMemorized(new Set());
    setPracticeQueue(shuffledNames(nextMembers));
    setPracticeRevealed(false);
    setMemorizeQueue(shuffledNames(nextMembers));
    setMemorizeFeedback(null);
    setMemorizeInput('');
  }

  function markPracticeMemorized() {
    if (!practiceMember) return;
    setPracticeMemorized((current) => new Set([...current, practiceMember.full_name]));
    setPracticeQueue((current) => current.filter((name) => name !== practiceMember.full_name));
    setPracticeRevealed(false);
  }

  function skipPractice() {
    if (!practiceMember) return;
    setPracticeQueue((current) => current.length > 1
      ? [...current.slice(1), current[0]]
      : current);
    setPracticeRevealed(false);
  }

  function submitMemorize(event) {
    event.preventDefault();
    if (!memorizeMember || !memorizeInput.trim()) return;
    const answer = memorizeInput.trim().toLowerCase();
    const expected = memorizeMember.full_name.toLowerCase();
    const isCorrect = answer === expected;
    setScores((current) => {
      const previous = current[memorizeMember.full_name] || { attempts: 0, correct: 0 };
      return {
        ...current,
        [memorizeMember.full_name]: {
          attempts: previous.attempts + 1,
          correct: previous.correct + (isCorrect ? 1 : 0),
        },
      };
    });
    setMemorizeInput('');
    setMemorizeFeedback(isCorrect ? 'Correct' : `Answer: ${memorizeMember.full_name}`);
  }

  function nextMemorize() {
    setMemorizeFeedback(null);
    if (!memorizeMember) return;
    setMemorizeQueue((current) => {
      const remaining = current.filter((name) => name !== memorizeMember.full_name);
      return remaining.length ? remaining : shuffledNames(memorizeMembers);
    });
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-5 text-slate-100 md:px-8 md:py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-5 border-b border-slate-800 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400">Fall Semester 2026</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-white">Ward Study Hall</h1>
            <p className="mt-2 max-w-xl text-sm text-slate-400">Learn faces at your own pace, then test what sticks.</p>
          </div>
          <div className="flex gap-3 text-sm">
            <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
              <span className="text-slate-500">People</span>
                <strong className="ml-2 text-cyan-400">{groupedMembers.length}</strong>
            </div>
            {mode === 'memorize' && (
              <div className="rounded-xl border border-cyan-900/70 bg-cyan-950/30 px-4 py-3">
                <span className="text-slate-400">Total score</span>
                <strong className="ml-2 text-cyan-300">{totalScore}%</strong>
              </div>
            )}
          </div>
        </header>

        <nav className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-800 bg-slate-900/70 p-2" aria-label="Study modes">
          {MODES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => changeMode(item.id)}
              className={`rounded-xl px-3 py-3 text-left transition ${mode === item.id ? 'bg-cyan-400 text-slate-950' : 'text-slate-300 hover:bg-slate-800'}`}
            >
              <span className="block text-sm font-semibold">{item.label}</span>
              <span className={`mt-1 block text-xs ${mode === item.id ? 'text-slate-800' : 'text-slate-500'}`}>{item.detail}</span>
            </button>
          ))}
        </nav>
        <div className="flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Study group</p>
            <p className="mt-1 text-sm text-slate-300">Choose an apartment group to narrow the cards and directory.</p>
          </div>
          <label className="sr-only" htmlFor="group-select">Study group</label>
          <select id="group-select" value={selectedGroup} onChange={(event) => changeGroup(event.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-semibold text-white outline-none focus:border-cyan-400">
            {GROUPS.map((group) => <option key={group} value={group}>{group === 'ALL' ? 'All groups' : group}</option>)}
          </select>
        </div>

        {loading && <div className="py-24 text-center text-slate-500">Loading study cards...</div>}

        {!loading && mode === 'practice' && (
          <section className="space-y-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm text-slate-400">{practiceMembers.length ? `${practiceMembers.length} cards remaining` : 'Practice complete'}</p>
                <h2 className="mt-1 text-2xl font-semibold text-white">Practice mode <span className="text-cyan-400">· {selectedGroup === 'ALL' ? 'All groups' : selectedGroup}</span></h2>
              </div>
            </div>
            {practiceMember ? (
              <div className={`overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl ${practiceLayout === 'side-by-side' ? 'grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]' : 'mx-auto max-w-md'}`}>
                <div className={`${practiceLayout === 'flashcard' ? 'aspect-[4/3]' : 'aspect-square md:aspect-auto md:min-h-[32rem]'} bg-slate-950`}><MemberImage member={practiceMember} className="h-full w-full object-cover" /></div>
                <div className="flex flex-col justify-between gap-5 p-5 md:p-8">
                  {practiceRevealed ? <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">Study card</p><MemberDetails member={practiceMember} /></div> : <button type="button" onClick={() => setPracticeRevealed(true)} className="w-full rounded-xl border border-cyan-800 bg-cyan-950/40 px-4 py-3 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-900/50">Reveal name and details</button>}
                  <div className="grid gap-3 sm:grid-cols-2"><button type="button" onClick={skipPractice} className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-700">Skip</button>{practiceRevealed && <button type="button" onClick={markPracticeMemorized} className="rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-300">I have memorized this person</button>}</div>
                </div>
              </div>
            ) : <EmptyState title="You cleared the deck" detail="Exit Practice mode and come back any time to review everyone again." />}
            <div className="flex justify-center">
              <div className="flex rounded-xl border border-slate-800 bg-slate-900 p-1 text-xs">
                <button type="button" onClick={() => setPracticeLayout('side-by-side')} className={`rounded-lg px-3 py-2 ${practiceLayout === 'side-by-side' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}>Side by side</button>
                <button type="button" onClick={() => setPracticeLayout('flashcard')} className={`rounded-lg px-3 py-2 ${practiceLayout === 'flashcard' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}>Flashcard</button>
              </div>
            </div>
            <p className="text-center text-xs text-slate-600">Cards marked memorized return when you leave Practice mode.</p>
          </section>
        )}

        {!loading && mode === 'memorize' && (
          <section className="space-y-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-sm text-slate-400">{completedCount} of {groupedMembers.length} people at 75% or higher</p><h2 className="mt-1 text-2xl font-semibold text-white">Name that person</h2></div><div className="text-sm text-slate-400">{memorizeMembers.length} cards in rotation</div></div>
            {memorizeMember ? (
              <div className="grid overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 md:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
                <div className="aspect-square bg-slate-950 md:aspect-auto md:min-h-[38rem]"><MemberImage member={memorizeMember} className="h-full w-full object-contain p-4 md:p-8" /></div>
                <div className="flex flex-col justify-center p-6 md:p-10">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">Type the full name</p>
                  <p className="mt-3 text-sm text-slate-400">This person: <span className="font-semibold text-slate-200">{scores[memorizeMember.full_name] ? `${Math.round((scores[memorizeMember.full_name].correct / scores[memorizeMember.full_name].attempts) * 100)}%` : 'No attempts yet'}</span></p>
                  <form onSubmit={submitMemorize} className="mt-5 space-y-3">
                    <label htmlFor="name-answer" className="sr-only">Person&apos;s name</label>
                    <input id="name-answer" autoFocus value={memorizeInput} onChange={(event) => setMemorizeInput(event.target.value)} placeholder="First or full name" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400" />
                    <button type="submit" className="w-full rounded-xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300">Check answer</button>
                  </form>
                  {memorizeFeedback && <div className={`mt-5 rounded-xl border p-4 text-sm ${memorizeFeedback === 'Correct' ? 'border-emerald-800 bg-emerald-950/40 text-emerald-300' : 'border-amber-800 bg-amber-950/40 text-amber-200'}`}><p className="font-semibold">{memorizeFeedback}</p>{memorizeFeedback !== 'Correct' && <p className="mt-1 text-xs">Type the full name exactly as shown above to continue.</p>}{memorizeFeedback === 'Correct' && <button type="button" onClick={nextMemorize} className="mt-3 rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700">Next card</button>}</div>}
                  <p className="mt-8 text-xs leading-5 text-slate-500">A person leaves the rotation once their personal accuracy reaches 75%.</p>
                </div>
              </div>
            ) : <EmptyState title="You know the whole ward" detail="Every person has reached the 75% target." />}
          </section>
        )}

        {!loading && mode === 'directory' && (
          <section className="space-y-5">
            <div><p className="text-sm text-slate-400">Browse the full set of members.</p><h2 className="mt-1 text-2xl font-semibold text-white">Directory</h2></div>
            <div className="flex flex-col gap-3 lg:flex-row"><input type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search by name or hometown" className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400" /><div className="flex gap-2 overflow-x-auto pb-1">{apartments.map((apt) => <button type="button" key={apt} onClick={() => setSelectedApt(apt)} className={`whitespace-nowrap rounded-xl px-3 py-3 text-xs font-semibold ${selectedApt === apt ? 'bg-cyan-400 text-slate-950' : 'border border-slate-800 bg-slate-900 text-slate-400 hover:text-white'}`}>{apt === 'ALL' ? 'All apartments' : `Apt ${apt}`}</button>)}</div></div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">{directoryMembers.map((member) => <article key={`${member.apt}-${member.full_name}`} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900"><div className="aspect-square bg-slate-950"><MemberImage member={member} className="h-full w-full object-cover" /></div><div className="space-y-1 p-3"><h3 className="truncate text-sm font-semibold text-white">{member.full_name}</h3><p className="truncate text-xs text-slate-500">Apt {member.apt} · {member.location}</p></div></article>)}</div>
            {!directoryMembers.length && <EmptyState title="No matches" detail="Try a different name, hometown, or apartment." />}
          </section>
        )}
      </div>
    </main>
  );
}

function EmptyState({ title, detail }) {
  return <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/50 px-6 py-20 text-center"><h3 className="text-xl font-semibold text-white">{title}</h3><p className="mt-2 text-sm text-slate-500">{detail}</p></div>;
}
