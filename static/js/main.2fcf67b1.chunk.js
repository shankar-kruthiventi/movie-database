(this["webpackJsonpmovies-db"]=this["webpackJsonpmovies-db"]||[]).push([[0],{114:function(e,t,a){e.exports=a(173)},119:function(e,t,a){},120:function(e,t,a){},121:function(e,t,a){},127:function(e,t,a){},128:function(e,t,a){},171:function(e,t,a){},173:function(e,t,a){"use strict";a.r(t);var n=a(0),r=a.n(n),o=a(9),l=a.n(o),c=(a(119),a(47)),i=a(11),s=(a(120),a(6)),m=a(14),u=(a(121),function(e){var t=e.fetchData,a=Object(n.useState)("Home"),o=Object(i.a)(a,2),l=o[0],c=o[1],s=function(e,t){c(e);var a=document.getElementById("myLinks");a.style.display="hide"===t?"none":"block"};return r.a.createElement("div",{className:"header-view"},r.a.createElement("div",{className:"header-container"},r.a.createElement("h1",null,"MOVIE CITY"),r.a.createElement(m.c,{to:"/home"},r.a.createElement("h3",null,"Home")),r.a.createElement(m.c,{extact:!0,activeClassName:"active",onClick:function(){return t("popular")},to:"/popular"},r.a.createElement("h3",null,"Popular Movies")),r.a.createElement(m.c,{onClick:function(){return t("top_rated")},to:"/top_rated"},r.a.createElement("h3",null,"Top Rated Movies")),r.a.createElement(m.c,{onClick:function(){return t("now_playing")},to:"/now_playing"},r.a.createElement("h3",null,"Now Playing"))),r.a.createElement("div",{className:"header-mobile-container"},r.a.createElement(m.b,{to:"/home",id:"home"},r.a.createElement("span",null,l)),r.a.createElement("div",{id:"myLinks"},r.a.createElement(m.b,{to:"/home",onClick:function(){s("Home","hide")}},"Home"),r.a.createElement(m.b,{to:"/popular",onClick:function(){t("popular"),s("Popular Movies","hide")}},"Popular Movies"),r.a.createElement(m.b,{to:"/top_rated",onClick:function(){t("top_rated"),s("Top Rated Movies","hide")}},"Top Rated Movies"),r.a.createElement(m.b,{to:"/now_playing",onClick:function(){t("now_playing"),s("Now Playing","hide")}},"Now Playing")),r.a.createElement("a",{href:"#myLinks",className:"icon",onClick:function(){return s(l,"show")}},r.a.createElement("i",{className:"fa fa-bars"}))))}),p=a(36),v=a.n(p),d=a(56),h=(a(127),a(106)),g=(a(128),a(5)),f=a(203),E=a(199),b=a(201),y=a(200),w=a(104),k=a.n(w),_=a(175),j=function(e){var t=e.open,a=e.details,n=e.handleClose;return r.a.createElement("div",null,r.a.createElement(f.a,{onClose:n,maxWidth:"md","aria-labelledby":"customized-dialog-title",open:t},r.a.createElement(N,{id:"movie-title",onClose:n},a.title),r.a.createElement(O,{dividers:!0,id:"dialog-content"},r.a.createElement("div",{className:"movie-details-container"},r.a.createElement("div",{className:"details-poster-container"},r.a.createElement("img",{src:"https://image.tmdb.org/t/p/w500"+a.poster,className:"details-poster",alt:a.original_title})),r.a.createElement("div",{className:"details-other-container"},a.overview&&r.a.createElement("div",{className:"overview"},a.overview),a.homepage&&r.a.createElement("div",null,r.a.createElement("a",{target:"_blank",className:"movie-home-page",rel:"noopener noreferrer",href:a.homepage},a.homepage)),a.release_date&&r.a.createElement("div",null,r.a.createElement("b",null,"Release date: "),a.release_date),a.genres.length&&r.a.createElement("div",null,r.a.createElement("b",null,"Genres: "),a.genres.map((function(e,t){return r.a.createElement("span",{key:t},e.name," ")}))),a.popularity&&r.a.createElement("div",null,r.a.createElement("b",null,"Popularity: "),a.popularity),a.vote_average&&r.a.createElement("div",null,r.a.createElement("b",null,"Rating: "),a.vote_average,"/10"))))))},N=Object(g.a)((function(e){return{root:{margin:0,padding:e.spacing(2)},closeButton:{position:"absolute",right:e.spacing(1),top:e.spacing(1),color:e.palette.grey[500]}}}))((function(e){var t=e.children,a=e.classes,n=e.onClose,o=Object(h.a)(e,["children","classes","onClose"]);return r.a.createElement(E.a,Object.assign({disableTypography:!0,className:a.root},o),r.a.createElement(_.a,{variant:"h6"},t),n?r.a.createElement(y.a,{"aria-label":"close",className:a.closeButton,onClick:n},r.a.createElement(k.a,null)):null)})),O=Object(g.a)((function(e){return{root:{padding:e.spacing(2)}}}))(b.a),C=a(59),S=a.n(C),x=function(){var e=Object(n.useState)(!1),t=Object(i.a)(e,2),a=t[0],o=t[1],l=Object(n.useState)([]),s=Object(i.a)(l,2),m=s[0],u=s[1],p=Object(n.useState)(""),h=Object(i.a)(p,2),g=h[0],f=h[1],E=Object(n.useRef)(null),b=Object(n.useState)([]),y=Object(i.a)(b,2),w=y[0],k=y[1];Object(n.useEffect)((function(){return window.addEventListener("mousedown",_),function(){window.removeEventListener("mousedown",_)}}));var _=function(e){var t=E.current;t&&!t.contains(e.target)&&o(!1)},N=Object(n.useState)(!1),O=Object(i.a)(N,2),C=O[0],x=O[1],T=Object(n.useState)({title:"",poster:"",genres:[],homepage:"",overview:"",release_date:"",popularity:0,vote_average:0}),L=Object(i.a)(T,2),M=L[0],P=L[1],I=function(){var e=Object(d.a)(v.a.mark((function e(t){return v.a.wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return e.next=2,fetch("https://api.themoviedb.org/3/movie/".concat(t,"?api_key=fceee37c892707ca488b3969171ef2b9&language=en-US")).then((function(e){return e.json()})).then((function(e){console.log(e),P({title:e.original_title,poster:e.poster_path,genres:e.genres,homepage:e.homepage,overview:e.overview,release_date:e.release_date,popularity:e.popularity,vote_average:e.vote_average})}));case 2:console.log(M.original_title),x(!0),o(!1);case 5:case"end":return e.stop()}}),e)})));return function(t){return e.apply(this,arguments)}}();return r.a.createElement(S.a,null,r.a.createElement("div",{className:"home-contianer"},r.a.createElement("div",{className:"finder-container"},r.a.createElement("div",{className:"finder"},r.a.createElement("div",{className:"find-text"},"Search for movies"),r.a.createElement("div",{ref:E,className:"flex-container flex-column pos-rel"},r.a.createElement("input",{id:"auto",onClick:function(){return o(!a)},placeholder:"Type to search",value:g,autoComplete:"off",onChange:function(e){f(e.target.value)},onKeyUp:function(e){console.log(e.target.value),m=[],k([]);var t=new Array(1).fill().map((function(t,a){return fetch("https://api.themoviedb.org/3/search/movie?api_key=fceee37c892707ca488b3969171ef2b9&language=en-US&query=".concat(e.target.value,"&page=1"))}));Promise.all(t).then((function(e){return e.map((function(e,t){e.json().then((function(e){var t=e.results;t&&0!==t.length&&(w.push.apply(w,Object(c.a)(t)),u(w))}))}))}))}}),a&&m&&m.length&&r.a.createElement("div",{className:"autoContainer"},m.map((function(e,t){return r.a.createElement("div",{key:t},t<3&&r.a.createElement("div",{className:"option",key:t,onClick:function(){return I(e.id)},tabIndex:"0"},r.a.createElement("span",null,e.original_title),r.a.createElement("div",{className:"movie-search-poster-container"},r.a.createElement("img",{className:"movie-search-poster",src:"https://image.tmdb.org/t/p/w500"+e.poster_path,alt:"poster"}))))})))))),r.a.createElement("div",{className:"home-view-container"},r.a.createElement("div",{className:"about-container"},r.a.createElement("div",{className:"about"},"About this app"),r.a.createElement("div",null,"Movie City is made using React. This app helps the user to:"," "),r.a.createElement("ol",null,r.a.createElement("li",null,"Search for his/her favourite movies."),r.a.createElement("li",null,"Allows the user to get respective movie details."),r.a.createElement("li",null,"Gives the user info about popular, top rated and now playing movies.")),"This app uses themoviedb.org REST API to fetch the movie details."),r.a.createElement("div",{className:"about-container"},r.a.createElement("div",{className:"about"},"About me"),r.a.createElement("div",null,"This app is developed by ",r.a.createElement("b",null,"ShankarKruthiventi"),". You can reach out to me at"),r.a.createElement("ul",null,r.a.createElement("li",null,r.a.createElement("a",{href:"https://www.linkedin.com/in/shankarkruthiventi/",rel:"noopener noreferrer",target:"_blank"},"LinkedIn")),r.a.createElement("li",null,r.a.createElement("a",{href:"https://github.com/shankar-kruthiventi",rel:"noopener noreferrer",target:"_blank"},"Github")),r.a.createElement("li",null,r.a.createElement("a",{href:"https://www.facebook.com/shankar.kruthiventi/",rel:"noopener noreferrer",target:"_blank"},"Facebook")),r.a.createElement("li",null,r.a.createElement("a",{href:"https://www.instagram.com/madhav_kruthiventi/",rel:"noopener noreferrer",target:"_blank"},"Instagram"))))),r.a.createElement(j,{open:C,details:M,handleClose:function(){x(!1)}})))},T=(a(171),a(202)),L=function(e){var t=e.movieList,a=e.append,o=Object(n.useState)(!1),l=Object(i.a)(o,2),c=l[0],m=l[1],u=Object(n.useState)({title:"",poster:"",genres:[],homepage:"",overview:"",release_date:"",popularity:0,vote_average:0}),p=Object(i.a)(u,2),h=p[0],g=p[1],f=function(){var e=Object(d.a)(v.a.mark((function e(t){return v.a.wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return e.next=2,fetch("https://api.themoviedb.org/3/movie/".concat(t,"?api_key=fceee37c892707ca488b3969171ef2b9&language=en-US")).then((function(e){return e.json()})).then((function(e){console.log(e),g({title:e.original_title,poster:e.poster_path,genres:e.genres,homepage:e.homepage,overview:e.overview,release_date:e.release_date,popularity:e.popularity,vote_average:e.vote_average})}));case 2:console.log(h.original_title),m(!0);case 4:case"end":return e.stop()}}),e)})));return function(t){return e.apply(this,arguments)}}();return r.a.createElement(S.a,null,r.a.createElement("div",{className:"movies-container"},r.a.createElement("div",{className:"movieList-container"},t&&!t.length&&r.a.createElement(s.a,{to:{pathname:"/home"}}),t&&t.length>=1&&t.map((function(e,t){return r.a.createElement("div",{id:t,key:t,className:"poster-container"},r.a.createElement("img",{src:"https://image.tmdb.org/t/p/w500"+e.poster_path,onClick:function(){return f(e.id)},alt:e.original_title,className:"poster"}))}))),r.a.createElement("div",{className:"next-button-container"},t&&t.length&&r.a.createElement(T.a,{onClick:a,className:"next-button",variant:"outlined",color:"secondary"},"Show More")),r.a.createElement(j,{open:c,details:h,handleClose:function(){m(!1)}})))};var M=function(){var e=Object(n.useState)(""),t=Object(i.a)(e,2),a=t[0],o=t[1],l=Object(n.useState)(2),m=Object(i.a)(l,2),p=m[0],v=m[1],d=Object(n.useState)([]),h=Object(i.a)(d,2),g=h[0],f=h[1];function E(e){e||alert("no type"),fetch("https://api.themoviedb.org/3/movie/".concat(e,"?api_key=fceee37c892707ca488b3969171ef2b9&language=en-US&page=1")).then((function(e){return e.json()})).then((function(t){console.log(t),o(e),f(t.results)}))}var b=function(){v((function(e){return e+1})),fetch("https://api.themoviedb.org/3/movie/".concat(a,"?api_key=fceee37c892707ca488b3969171ef2b9&language=en-US&page=").concat(p)).then((function(e){return e.json()})).then((function(e){console.log(e);var t=[].concat(Object(c.a)(g),Object(c.a)(e.results));f(t)}))};return Object(n.useEffect)((function(){E("popular")}),[]),r.a.createElement("div",{className:"app-container"},r.a.createElement(u,{fetchData:E}),r.a.createElement(s.d,null,r.a.createElement(s.b,{path:"/home",component:x,extact:!0}),r.a.createElement(s.b,{path:"/popular",render:function(){return r.a.createElement(L,{append:b,key:"popular",movieList:g,movieType:"popular"})}}),r.a.createElement(s.b,{path:"/top_rated",render:function(){return r.a.createElement(L,{append:b,key:"top_rated",movieList:g,movieType:"top_rated"})}}),r.a.createElement(s.b,{path:"/now_playing",render:function(){return r.a.createElement(L,{append:b,key:"now_playing",movieList:g,movieType:"now_playing"})}})))};Boolean("localhost"===window.location.hostname||"[::1]"===window.location.hostname||window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/));l.a.render(r.a.createElement(r.a.StrictMode,null,r.a.createElement(m.a,null,r.a.createElement(M,null))),document.getElementById("root")),"serviceWorker"in navigator&&navigator.serviceWorker.ready.then((function(e){e.unregister()})).catch((function(e){console.error(e.message)}))}},[[114,1,2]]]);
//# sourceMappingURL=main.2fcf67b1.chunk.js.map