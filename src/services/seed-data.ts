import { purgeDateFor } from '@/constants/bin'
import type { ISODate, Note, Reminder } from '@/types/contracts'

const DAY_MS = 86_400_000

function agoMs(ms: number): ISODate {
  return new Date(Date.now() - ms).toISOString()
}

function inMs(ms: number): ISODate {
  return new Date(Date.now() + ms).toISOString()
}

function block(text: string, minutesAgo: number) {
  return {
    id: `blk_${text.slice(0, 6).replace(/\W/g, '')}_${minutesAgo}`,
    text,
    createdAt: agoMs(minutesAgo * 60_000),
  }
}

const WORK = { id: 'tag_work', name: 'work' }
const HOME = { id: 'tag_home', name: 'home' }
const LEARN = { id: 'tag_learning', name: 'learning' }
const CLIENT = { id: 'tag_client', name: 'client' }

export function seedNotes(): Note[] {
  return [
    {
      id: 'note_1',
      title: 'Sprint review points',
      body: [
        block('Deployment plan ke liye owner assign karna hai — Friday tak.', 52),
        block('Staging env pe load test run karna hai before release.', 47),
      ],
      color: 'coral',
      pinned: true,
      tags: [WORK],
      createdAt: agoMs(DAY_MS),
      updatedAt: agoMs(47 * 60_000),
      deletedAt: null,
      purgeAt: null,
    },
    {
      id: 'note_2',
      title: 'Call with Anshul — reminder behaviour',
      body: [
        block('He said reminders must fire even when the tab is closed, so push notification.', 130),
        block('WebSocket channel for the in-app case, FCM for background.', 126),
      ],
      color: 'aqua',
      pinned: false,
      tags: [WORK, CLIENT],
      createdAt: agoMs(2 * DAY_MS),
      updatedAt: agoMs(126 * 60_000),
      deletedAt: null,
      purgeAt: null,
    },
    {
      id: 'note_3',
      title: 'Groceries',
      body: [block('Doodh, atta, ale ka aata, chai patti aur ande.', 190)],
      color: 'lime',
      pinned: false,
      tags: [HOME],
      createdAt: agoMs(195 * 60_000),
      updatedAt: agoMs(190 * 60_000),
      deletedAt: null,
      purgeAt: null,
    },
    {
      id: 'note_4',
      title: 'Interview prep — streaming ASR',
      body: [
        block('Backpressure on WS: cap bufferedAmount, drop frames, emit overloaded.', 3 * DAY_MS / 60_000),
        block('Postgres scheduler with FOR UPDATE SKIP LOCKED instead of a queue.', 3 * DAY_MS / 60_000 + 40),
      ],
      color: 'violet',
      pinned: true,
      tags: [LEARN],
      createdAt: agoMs(4 * DAY_MS),
      updatedAt: agoMs(3 * DAY_MS),
      deletedAt: null,
      purgeAt: null,
    },
    {
      id: 'note_5',
      title: 'Weekend plan',
      body: [block('Saturday ko gym, phir shopping. Sunday sirf rest aur revision.', 5 * DAY_MS / 60_000)],
      color: 'mint',
      pinned: false,
      tags: [HOME],
      createdAt: agoMs(5 * DAY_MS),
      updatedAt: agoMs(5 * DAY_MS),
      deletedAt: null,
      purgeAt: null,
    },
    {
      id: 'note_6',
      title: 'Old pricing sheet idea',
      body: [block('Three tiers with a free trial — never finished this thought.', 20 * DAY_MS / 60_000)],
      color: 'sand',
      pinned: false,
      tags: [CLIENT],
      createdAt: agoMs(24 * DAY_MS),
      updatedAt: agoMs(20 * DAY_MS),
      deletedAt: agoMs(4 * DAY_MS),
      purgeAt: purgeDateFor(agoMs(4 * DAY_MS)),
    },
    {
      id: 'note_7',
      title: 'Draft — vendor comparison',
      body: [block('Compare shortlisted transcription vendors before committing.', 26 * DAY_MS / 60_000)],
      color: 'coral',
      pinned: false,
      tags: [WORK],
      createdAt: agoMs(31 * DAY_MS),
      updatedAt: agoMs(26 * DAY_MS),
      deletedAt: agoMs(29 * DAY_MS),
      purgeAt: purgeDateFor(agoMs(29 * DAY_MS)),
    },
  ]
}

export function seedReminders(): Reminder[] {
  return [
    {
      id: 'rem_1',
      noteId: 'note_1',
      title: 'Send the deployment plan to the team',
      dueAt: inMs(22 * 60_000),
      timezone: 'Asia/Kolkata',
      repeat: 'none',
      status: 'pending',
      createdAt: agoMs(3 * DAY_MS),
    },
    {
      id: 'rem_2',
      noteId: 'note_3',
      title: 'Groceries khatam ho gaye — order karo',
      dueAt: inMs(4 * 3_600_000),
      timezone: 'Asia/Kolkata',
      repeat: 'weekly',
      weekdays: [2, 5],
      status: 'pending',
      createdAt: agoMs(6 * DAY_MS),
    },
    {
      id: 'rem_3',
      noteId: 'note_4',
      title: 'Revise system design notes',
      dueAt: agoMs(9 * 3_600_000),
      timezone: 'Asia/Kolkata',
      repeat: 'weekdays',
      weekdays: [1, 2, 3, 4, 5],
      status: 'pending',
      createdAt: agoMs(8 * DAY_MS),
    },
    {
      id: 'rem_4',
      noteId: 'note_2',
      title: 'Standup note bhejna tha',
      dueAt: agoMs(DAY_MS + 2 * 3_600_000),
      timezone: 'Asia/Kolkata',
      repeat: 'none',
      status: 'done',
      createdAt: agoMs(2 * DAY_MS),
    },
  ]
}
