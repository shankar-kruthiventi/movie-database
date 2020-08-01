import React, { useState, useEffect } from 'react';
import './App.css';
import { Route, Switch } from 'react-router-dom';
import Header from './pages/header/header.component';
import Home from './pages/home/home.component';
import MovieList from './components/movie-list/movie-list.component';

function App() {

  let [movieCategory, setMovieCategory] = useState("");
  let [page, setPage] = useState(2);
  const [movieList, setMoviesList] = useState([]);

  function fetchData(movieCategory) {
    if (!movieCategory) {
      alert("no type");
    }
    fetch(
      `https://api.themoviedb.org/3/movie/${movieCategory}?api_key=fceee37c892707ca488b3969171ef2b9&language=en-US&page=1`
    )
      .then((response) => response.json())
      .then((data) => {
        console.log(data);
        setMovieCategory(movieCategory);
        setMoviesList(data.results);
      });
  }

  const append = () => {
    setPage((page) => page + 1);
    fetch(
      `https://api.themoviedb.org/3/movie/${movieCategory}?api_key=fceee37c892707ca488b3969171ef2b9&language=en-US&page=${page}`
    )
      .then((response) => response.json())
      .then((data) => {
        console.log(data);
        let newMovieList = [...movieList, ...data.results];
        setMoviesList(newMovieList);
      });
  };

  useEffect(() => {
    fetchData('popular');
  }, []);

  return (
    <div className="app-container">
      <Header fetchData={fetchData}></Header>
      <Switch>
        <Route path="/home" component={Home} extact/>
        <Route path="/popular" render={()=><MovieList append={append} movieList={movieList} movieType={'popular'}/>} />
        <Route path="/top_rated" render={()=><MovieList append={append} movieList={movieList} movieType={'top_rated'}/>} />
        <Route path="/now_playing" render={()=><MovieList append={append} movieList={movieList} movieType={'now_playing'}/>}/>
      </Switch>
      
    </div>
  );
}

export default App;

{/*import logo from './logo.svg'; 
  <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div> */}