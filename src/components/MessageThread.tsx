import Link from 'next/link'
import { sendMessage } from '@/actions/messages'

export type ThreadSummary = {
  id: string
  name: string
  preview: string
  at: Date
  unread: number
  /** Signed in within the last 15 minutes — the comp's green "Active" chip. */
  active?: boolean
}

export type MessageView = {
  id: string
  body: string
  mine: boolean
  at: Date
  senderName: string
}

/**
 * The messaging screen from the design board: a conversation list on the left,
 * bubbles on the right, composer underneath. Own messages sit on the right.
 */
export default function MessageThread({
  threads,
  activeId,
  messages,
  title,
  basePath,
  emptyHint,
  search,
  searchable = true,
}: {
  threads: ThreadSummary[]
  activeId: string | null
  messages: MessageView[]
  title: string
  basePath: string
  emptyHint: string
  search?: string
  searchable?: boolean
}) {
  const current = threads.find((t) => t.id === activeId)
  return (
    <section className="ml-card grid min-h-[520px] grid-cols-[minmax(240px,.85fr)_1.4fr] max-[560px]:grid-cols-1">
      {/* ------------------------------------------------------- thread list */}
      <div className="border-r border-[#17313b] p-3.5 max-[560px]:border-b max-[560px]:border-r-0">
        <div className="ml-sub mb-3 px-1 text-[11px] uppercase tracking-wider">{title}</div>

        {searchable ? (
          <form className="mb-3">
            <input
              name="q"
              defaultValue={search ?? ''}
              className="ml-input"
              placeholder="⌕  Search conversations…"
              aria-label="Search conversations"
            />
          </form>
        ) : null}

        {threads.length === 0 ? (
          <div className="ml-sub px-1">{search ? `Nothing matches “${search}”.` : emptyHint}</div>
        ) : (
          threads.map((t) => (
            <Link
              key={t.id}
              href={`${basePath}?thread=${t.id}`}
              className={`block rounded-md px-2.5 py-3 text-[13px] no-underline text-ink ${
                t.id === activeId ? 'bg-[#10262f]' : 'hover:bg-[#0c1e26]'
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <b className="truncate">{t.name}</b>
                {t.unread > 0 ? <span className="ml-green text-[11px]">{t.unread} new</span> : null}
              </div>
              <div className="ml-sub truncate text-[12px]">{t.preview}</div>
            </Link>
          ))
        )}
      </div>

      {/* ------------------------------------------------------------- chat */}
      <div className="flex min-w-0 flex-col p-3.5">
        {activeId ? (
          <>
            <div className="mb-3 flex items-center gap-2.5 border-b border-line pb-3">
              <b className="text-[14px]">{current?.name ?? 'Conversation'}</b>
              {current?.active ? (
                <span className="flex items-center gap-1.5 text-[11px] ml-green">
                  <span className="inline-block h-[7px] w-[7px] rounded-full bg-[#58edb5]" />
                  Active
                </span>
              ) : (
                <span className="ml-sub text-[11px]">
                  Last message {current ? current.at.toLocaleDateString() : '—'}
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              {messages.length === 0 ? (
                <div className="ml-sub grid h-full place-items-center">
                  No messages yet. Say hello.
                </div>
              ) : (
                messages.map((m) => (
                  <div key={m.id}>
                    <div className={`ml-bubble ${m.mine ? 'is-me' : ''}`}>{m.body}</div>
                    <div
                      className={`ml-sub text-[11px] ${m.mine ? 'text-right' : ''}`}
                      style={{ marginTop: -6 }}
                    >
                      {m.mine ? 'You' : m.senderName} · {m.at.toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>

            <form action={sendMessage} className="mt-4 flex gap-2">
              <input type="hidden" name="threadId" value={activeId} />
              <input
                name="body"
                className="ml-input"
                placeholder="Type a message…"
                autoComplete="off"
                required
              />
              <button type="submit" className="ml-btn ml-btn-primary px-5" aria-label="Send">
                ➤
              </button>
            </form>

            <div className="ml-sub mt-2 text-[11px]">
              Messages stay inside MediLean. Any email or text we send says only that a message is
              waiting.
            </div>
          </>
        ) : (
          <div className="ml-sub grid h-full place-items-center">
            Choose a conversation to open it.
          </div>
        )}
      </div>
    </section>
  )
}
