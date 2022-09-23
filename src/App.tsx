import React, { useState, useEffect } from 'react';
import './App.css';
import { HashRouter, Route, Routes, Navigate } from 'react-router-dom';
import Header from './pages/header/header.component';
import Home from './pages/home/home.component';
import MovieList from './components/movie-list/movie-list.component';
import { Movie } from './types';
import { appendMoviesByCategory, fetchMoviesByCategory } from './url-formatter';

function App() {

  let [movieCategory, setMovieCategory] = useState<string>("");
  let [page, setPage] = useState<number>(2);
  const [movieList, setMoviesList] = useState<Movie[]>([]);

  function fetchData(movieCategory: string): void {
    if (!movieCategory) {
      return fetchData('popular');
    }
    fetch(
      fetchMoviesByCategory(movieCategory)
    )
      .then((response) => response.json())
      .then((data) => {
        setMovieCategory(movieCategory);
        setMoviesList(data.results);
      });
  }

  const append = () => {
    setPage((page: number) => page + 1);
    fetch(
      appendMoviesByCategory(movieCategory, page)
    )
      .then((response) => response.json())
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
      <Header fetchData={fetchData}></Header>
      <Routes>
        <Route path="/" element={<Navigate to="/home" />}></Route>
        <Route path="/home" element={<Home />} />
        <Route path="/popular" element={<MovieList append={append} key={'popular'} movieList={movieList} />} />
        <Route path="/top_rated" element={<MovieList append={append} key={'top_rated'} movieList={movieList} />} />
        <Route path="/now_playing" element={<MovieList append={append} key={'now_playing'} movieList={movieList} />}/>
      </Routes>
    </div>
  </HashRouter>
  );
}

export default App;
