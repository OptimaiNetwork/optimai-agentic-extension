import GlobalLayout from '@/matches/x/layouts/global-layout'
import HomePage from '@/matches/x/pages/home'
import AgentPage from '@/matches/x/pages/agent'
import BuyPage from '@/matches/x/pages/buy'
import TickerPage from '@/matches/x/pages/ticker'
import PortfolioPage from '@/matches/x/pages/portfolio'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { PATHS } from './paths'

const AppRouter = () => {
  return (
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<GlobalLayout />}>
          <Route index element={<HomePage />} />
          <Route path={PATHS.PORTFOLIO} element={<PortfolioPage />} />
          <Route path={PATHS.TOKEN} element={<TickerPage />} />
          <Route path={PATHS.TICKER} element={<TickerPage />} />
          <Route path={PATHS.AGENT} element={<AgentPage />} />
          <Route path={PATHS.AGENT_TICKER} element={<AgentPage />} />
          <Route path={PATHS.ASK} element={<AgentPage />} />
          <Route path={PATHS.BUY} element={<BuyPage />} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

export default AppRouter
