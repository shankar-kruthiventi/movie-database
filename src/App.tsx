import { TMDB_API_KEY } from './config';
import React, { useState, useEffect } from 'react';
import './App.css';
import { HashRouter, Route, Routes, Navigate } from 'react-router-dom';
import Header from './pages/header/header.component';
import Home from './pages/home/home.component';
import MovieList from './components/movie-list/movie-list.component';
import { LIST_ROUTES } from './routes';
import { usePagePipeline } from './use-page-pipeline';
import type { MovieListItem, MovieListResponse } from './types/tmdb';

function App() {

  let [movieCategory, setMovieCategory] = useState<string>("");
  let [page, setPage] = useState(2);
  const [movieList, setMoviesList] = useState<MovieListItem[]>([]);
  // Page-1 loads in flight: the list prefetch (step 5b) waits for them so it never appends to a list that is about to be replaced.
  const [loading, setLoading] = useState(0);
  // Ordered, pipelined next-page loader used by the list prefetch (the legacy `append` below stays for Show More / BC-10).
  const pipeline = usePagePipeline({ category: movieCategory, page, setPage, setList: setMoviesList });

  function fetchData(movieCategory: string) {
    if (!movieCategory) {
      alert("no type");
    }
    setLoading((count) => count + 1);
    fetch(
      `https://api.themoviedb.org/3/movie/${movieCategory}?api_key=${TMDB_API_KEY}&language=en-US&page=1`
    )
      .then((response): Promise<MovieListResponse> => response.json())
      .then((data) => {
        setMovieCategory(movieCategory);
        setMoviesList(data.results);
        pipeline.reset(data.total_pages);
      })
      .finally(() => setLoading((count) => count - 1));
  }

  const append = () => {
    setPage((page) => page + 1);
    fetch(
      `https://api.themoviedb.org/3/movie/${movieCategory}?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`
    )
      .then((response): Promise<MovieListResponse> => response.json())
      .then((data) => {
        if(data && data.results && data.results.length) {
          let newMovieList = [...movieList, ...data.results];
          setMoviesList(newMovieList);
        }
      });
  };

  useEffect(() => {
    fetchData('popular');
  }, []);

  return (
  <HashRouter basename='/'>
    <div className="app-container">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          // HashRouter owns the URL hash: do not navigate to #main-content, just move focus.
          event.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Skip to main content
      </a>
      <Header fetchData={fetchData}></Header>
      <main id="main-content" tabIndex={-1}>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<Home />} />
        {LIST_ROUTES.map((route) => (
          <Route
            key={route.path}
            path={`/${route.path}`}
            element={<MovieList append={append} loadMore={pipeline.loadMore} key={route.category} movieList={movieList} movieType={route.category} loadedType={movieCategory} loading={loading > 0}/>}
          />
        ))}
        {LIST_ROUTES.map((route) =>
          route.legacyPath ? (
            <Route key={route.legacyPath} path={`/${route.legacyPath}`} element={<Navigate to={`/${route.path}`} replace />} />
          ) : null
        )}
      </Routes>
      </main>
    </div>
  </HashRouter>
  );
}

export default App;
