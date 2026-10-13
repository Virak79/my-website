import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import './index.css'
import { Layout } from './components/Layout.tsx'
import { Home } from './pages/Home.tsx'
import { KanaPage } from './pages/KanaPage.tsx'
import { KanjiPage } from './pages/KanjiPage.tsx'
import { VocabularyPage } from './pages/VocabularyPage.tsx'
import { SpeakingPage } from './pages/SpeakingPage.tsx'
import { WritingPage } from './pages/WritingPage.tsx'
import { QuizzesPage } from './pages/QuizzesPage.tsx'

function NotFound() {
  return (
    <div className="py-16 text-center">
      <h1 className="h1">Page not found</h1>
      <Link to="/" className="btn btn-primary mt-6">
        Back to the start
      </Link>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="hiragana" element={<KanaPage key="hiragana" script="hiragana" />} />
          <Route path="katakana" element={<KanaPage key="katakana" script="katakana" />} />
          <Route path="kanji" element={<KanjiPage />} />
          <Route path="vocabulary" element={<VocabularyPage />} />
          <Route path="speaking" element={<SpeakingPage />} />
          <Route path="writing" element={<WritingPage />} />
          <Route path="quizzes" element={<QuizzesPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
