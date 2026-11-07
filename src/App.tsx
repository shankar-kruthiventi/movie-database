import { TMDB_API_KEY } from './config';
import React, { useState, useEffect } from 'react';
import './App.css';
import { HashRouter, Route, Routes, Navigate } from 'react-router-dom';
import Header from './pages/header/header.component';
import Home from './pages/home/home.component';
import MovieList from './components/movie-list/movie-list.component';
import type { MovieListItem, MovieListResponse } from './types/tmdb';

function App() {

  let [movieCategory, setMovieCategory] = useState<string>("");
  let [page, setPage] = useState(2);
  const [movieList, setMoviesList] = useState<MovieListItem[]>([]);

  function fetchData(movieCategory: string) {
    if (!movieCategory) {
      alert("no type");
    }
    fetch(
      `https://api.themoviedb.org/3/movie/${movieCategory}?api_key=${TMDB_API_KEY}&language=en-US&page=1`
    )
      .then((response): Promise<MovieListResponse> => response.json())
      .then((data) => {
        setMovieCategory(movieCategory);
        setMoviesList(data.results);
      });
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
      <Header fetchData={fetchData}></Header>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<Home />} />
        <Route path="/popular" element={<MovieList append={append} key={'popular'} movieList={movieList} movieType={'popular'}/>} />
        <Route path="/top_rated" element={<MovieList append={append} key={'top_rated'} movieList={movieList} movieType={'top_rated'}/>} />
        <Route path="/now_playing" element={<MovieList append={append} key={'now_playing'} movieList={movieList} movieType={'now_playing'}/>}/>
      </Routes>
    </div>
  </HashRouter>
  );
}

export default App;
