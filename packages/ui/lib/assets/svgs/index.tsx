/// <reference types="vite-plugin-svgr/client" />
// The reference belongs here rather than only in vite-env.d.ts. This package
// publishes raw sources as its types, so a consumer type-checking it compiles
// this file without ever loading that ambient file — which is why every
// workspace that imported it reported 46 TS2307 errors for the .svg?react
// imports below.

import ArticleLine from './article-line.svg?react'
import Bookmark from './bookmark.svg?react'
import CalendarSparkles from './calendar-sparkles.svg?react'
import CheckCircleFill from './check-circle-fill.svg?react'
import CircleQuestionMark from './circle-question-mark.svg?react'
import Grok from './grok.svg?react'
import Knowledge from './knowledge.svg?react'
import Quote from './quote.svg?react'
import Reply from './reply.svg?react'
import Repost from './repost.svg?react'
import Share from './share.svg?react'
import Sidebar from './sidebar.svg?react'
import Telegram from './telegram.svg?react'
import Twitter from './twitter.svg?react'
import View from './view.svg?react'

export const SvgIcons = {
  Telegram,
  Twitter,
  CheckCircleFill,
  Grok,
  Knowledge,
  ArticleLine,
  Sidebar,
  Reply,
  Quote,
  Repost,
  View,
  Bookmark,
  Share,
  CircleQuestionMark,
  CalendarSparkles,
}
