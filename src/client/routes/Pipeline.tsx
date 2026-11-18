import { Link } from 'react-router';
import { OPEN_STATUSES, statusLabel } from '@shared/lookups';
import { isUpcoming, quietDays } from '@shared/logic/timeline';
import type { Application, MeetingData } from '@shared/types';
import { useData } from '../lib/queries';
import { compLabel, relDays } from '../lib/format';
import {
  CLOSED_STAGES,
  STAGES,
  isStage,
  stageCounts,
  stageLabel,
  stageStatuses,
  type Stage,
} from '../lib/filters';
import { useViewState } from '../lib/viewState';
import { useSheets } from '../sheets/context';
import { CompanyMark, StatusChip } from '../components/StatusChip';
import { Icon } from '../components/Icon';
import { PageHeader, SlideToggle } from '../components/ui';

type View = 'board' | 'list';

function nextStep(
  a: Application,
  data: NonNullable<ReturnType<typeof useData>>,
  now: Date,
): { text: string; hot: boolean } {
  const meet = (data.eventsByApp.get(a.id) ?? [])
    .filter((e) => isUpcoming(e, now))
    .sort((x, y) => x.occurred_at.localeCompare(y.occurred_at))[0];
  if (meet)
    return {
      text: `${meet.title || (meet.data as MeetingData).kind} ${relDays(meet.occurred_at)}`,
      hot: true,
    };
  const q = quietDays(a, now, data.state.events);
  if (a.status === 'saved') return { text: 'Not sent yet', hot: false };
  if (a.status === 'offer') return { text: 'Decide', hot: true };
  if (q >= data.state.settings.follow_up_days)
    return { text: `${q}d silent · follow up`, hot: true };
  return { text: 'Waiting', hot: false };
}

function Card({
  a,
  data,
  now,
}: {
  a: Application;
  data: NonNullable<ReturnType<typeof useData>>;
  now: Date;
}) {
  const next = nextStep(a, data, now);
  const pay = compLabel(a);
  return (
    <Link to={`/a/${a.id}`} className="kcard">
      <span className="kcard-head">
        <CompanyMark name={a.company} size={32} />
        <span className="row-text">
          <strong>{a.company}</strong>
          <span className="kcard-title">{a.title}</span>
        </span>
      </span>
      <span className="tags">
        {pay && <span className="tag mono">{pay}</span>}
        {a.work_mode && (
          <span className="tag">
            {a.work_mode === 'onsite'
              ? 'On-site'
              : a.work_mode[0]!.toUpperCase() + a.work_mode.slice(1)}
          </span>
        )}
        {a.source && <span className="tag">{a.source}</span>}
      </span>
      <span className="kcard-foot">
        {next.hot && <i className="hot" aria-hidden="true" />}
        <span className={next.hot ? 'strong' : ''}>{next.text}</span>
        <span className="mono sub">{quietDays(a, now, data.state.events)}d</span>
      </span>
    </Link>
  );
}

export function Pipeline() {
  const data = useData();
  const sheets = useSheets();
  // Remembered on this device and kept in the address (?view=list&stage=applied&q=acme).
  const [choice, choose] = useViewState('kk:pipeline', {
    view: window.matchMedia('(min-width: 900px)').matches ? 'board' : 'list',
    stage: 'open',
    q: '',
  });
  const view: View = choice.view === 'list' ? 'list' : 'board';
  const stage: Stage = isStage(choice.stage) ? choice.stage : 'open';
  const q = choice.q;
  if (!data) return null;
  const now = new Date();
  const ql = q.trim().toLowerCase();
  const apps = data.apps.filter((a) => !ql || `${a.company} ${a.title}`.toLowerCase().includes(ql));
  const counts = stageCounts(apps);
  const by = counts.byStatus;

  return (
    <>
      <PageHeader
        title="Pipeline"
        action={
          <button type="button" className="btn primary desk-only" onClick={sheets.addJob}>
            <Icon name="plus" size={18} /> Add job
          </button>
        }
      />
      <div className="toolbar">
        <label className="search-in">
          <Icon name="search" size={16} />
          <input
            value={q}
            onChange={(e) => choose({ q: e.target.value })}
            placeholder="Company or title"
            aria-label="Search applications"
          />
        </label>
        <SlideToggle
          label="View"
          value={view}
          onChange={(v) => choose({ view: v })}
          options={[
            ['board', 'Board'],
            ['list', 'List'],
          ]}
        />
      </div>

      {view === 'board' ? (
        <div className="board-scroll">
          <div className="board">
            {OPEN_STATUSES.map((s) => (
              <section key={s} className="col" aria-label={statusLabel(s)}>
                <div className="col-h">
                  <StatusChip status={s} />
                  <span className="mono sub">{by(s).length}</span>
                </div>
                {by(s).map((a) => (
                  <Card key={a.id} a={a} data={data} now={now} />
                ))}
              </section>
            ))}
            <section className="col closed-col" aria-label="Closed">
              <div className="col-h">
                <span className="lbl">Closed</span>
                <span className="mono sub">{counts.count('closed')}</span>
              </div>
              <div className="closed-box">
                {CLOSED_STAGES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="closed-line"
                    onClick={() => choose({ view: 'list', stage: s })}
                  >
                    <StatusChip status={s} small />
                    <span className="mono">{by(s).length}</span>
                  </button>
                ))}
                <p className="sub">Closing asks which stage it died at, for the report.</p>
              </div>
            </section>
          </div>
        </div>
      ) : (
        <>
          <SlideToggle
            label="Stage"
            value={stage}
            onChange={(v) => choose({ stage: v })}
            options={[
              ...STAGES.map((s) => [s, stageLabel(s, counts)] as const),
              // A closed status picked from the board's Closed box stays a choice here.
              ...(STAGES.includes(stage) ? [] : [[stage, stageLabel(stage, counts)] as const]),
            ]}
          />
          <div className="plist">
            {stageStatuses(stage).map((s) => {
              const rows = by(s);
              if (!rows.length) return null;
              return (
                <section key={s}>
                  <div className="plist-h">
                    <StatusChip status={s} small />
                    <span className="mono sub">{rows.length}</span>
                  </div>
                  {rows.map((a) => {
                    const next = nextStep(a, data, now);
                    return (
                      <Link key={a.id} to={`/a/${a.id}`} className="prow">
                        <CompanyMark name={a.company} size={38} />
                        <span className="row-text">
                          <strong>{a.company}</strong>
                          <span className="sub ell">{a.title}</span>
                          <span className={next.hot ? 'strong small' : 'small'}>{next.text}</span>
                        </span>
                        <span className="mono sub">{compLabel(a) ?? ''}</span>
                      </Link>
                    );
                  })}
                </section>
              );
            })}
            {!apps.length ? (
              <p className="empty">
                {ql ? 'Nothing matches.' : 'No applications in this search yet.'}
              </p>
            ) : (
              !counts.count(stage) && <p className="empty">Nothing here right now.</p>
            )}
          </div>
        </>
      )}
    </>
  );
}
